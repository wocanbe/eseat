const Path = require('path');
const crypto = require('crypto');

/**
 * A Leaf represents an output file, containing multiple assets. Bundles can have
 * child bundles, which are bundles that are loaded dynamically from this Leaf.
 * Child bundles are also produced when importing an asset of a different type from
 * the Leaf, e.g. importing a CSS file from JS.
 */
class Leaf {
  constructor(type, name, parent, options = {}) {
    this.type = type;
    this.name = name;
    this.parentBundle = parent;
    this.entryAsset = null;
    this.assets = new Set();
    this.childBundles = new Set();
    this.siblingBundles = new Set();
    this.siblingBundlesMap = new Map();
    this.offsets = new Map();
    this.totalSize = 0;
    this.bundleTime = 0;
    this.isolated = options.isolated;
  }

  static createWithAsset(asset, parentBundle, options) {
    let Leaf = new Leaf(
      asset.type,
      Path.join(asset.options.outDir, asset.generateBundleName()),
      parentBundle,
      options
    );

    Leaf.entryAsset = asset;
    Leaf.addAsset(asset);
    return Leaf;
  }

  addAsset(asset) {
    asset.bundles.add(this);
    this.assets.add(asset);
  }

  removeAsset(asset) {
    asset.bundles.delete(this);
    this.assets.delete(asset);
  }

  addOffset(asset, line) {
    this.offsets.set(asset, line);
  }

  getOffset(asset) {
    return this.offsets.get(asset) || 0;
  }

  getSiblingBundle(type) {
    if (!type || type === this.type) {
      return this;
    }

    if (!this.siblingBundlesMap.has(type)) {
      let Leaf = new Leaf(
        type,
        Path.join(
          Path.dirname(this.name),
          Path.basename(this.name, Path.extname(this.name)) + '.' + type
        ),
        this
      );

      this.childBundles.add(Leaf);
      this.siblingBundles.add(Leaf);
      this.siblingBundlesMap.set(type, Leaf);
    }

    return this.siblingBundlesMap.get(type);
  }

  createChildBundle(entryAsset, options = {}) {
    let Leaf = Leaf.createWithAsset(entryAsset, this, options);
    this.childBundles.add(Leaf);
    return Leaf;
  }

  createSiblingBundle(entryAsset, options = {}) {
    let Leaf = this.createChildBundle(entryAsset, options);
    this.siblingBundles.add(Leaf);
    return Leaf;
  }

  get isEmpty() {
    return this.assets.size === 0;
  }

  getBundleNameMap(contentHash, hashes = new Map()) {
    if (this.name) {
      let hashedName = this.getHashedBundleName(contentHash);
      hashes.set(Path.basename(this.name), hashedName);
      this.name = Path.join(Path.dirname(this.name), hashedName);
    }

    for (let child of this.childBundles.values()) {
      child.getBundleNameMap(contentHash, hashes);
    }

    return hashes;
  }

  getHashedBundleName(contentHash) {
    // If content hashing is enabled, generate a hash from all assets in the Leaf.
    // Otherwise, use a hash of the filename so it remains consistent across builds.
    let ext = Path.extname(this.name);
    let hash = (contentHash
      ? this.getHash()
      : Path.basename(this.name, ext)
    ).slice(-8);
    let entryAsset = this.entryAsset || this.parentBundle.entryAsset;
    let name = Path.basename(entryAsset.name, Path.extname(entryAsset.name));
    let isMainEntry = entryAsset.options.entryFiles[0] === entryAsset.name;
    let isEntry =
      entryAsset.options.entryFiles.includes(entryAsset.name) ||
      Array.from(entryAsset.parentDeps).some(dep => dep.entry);

    // If this is the main entry file, use the output file option as the name if provided.
    if (isMainEntry && entryAsset.options.outFile) {
      let extname = Path.extname(entryAsset.options.outFile);
      if (extname) {
        ext = this.entryAsset ? extname : ext;
        name = Path.basename(entryAsset.options.outFile, extname);
      } else {
        name = entryAsset.options.outFile;
      }
    }

    // If this is an entry asset, don't hash. Return a relative path
    // from the main file so we keep the original file paths.
    if (isEntry) {
      return Path.join(
        Path.relative(
          entryAsset.options.rootDir,
          Path.dirname(entryAsset.name)
        ),
        name + ext
      ).replace(/\.\.(\/|\\)/g, '__$1');
    }

    // If this is an index file, use the parent directory name instead
    // which is probably more descriptive.
    if (name === 'index') {
      name = Path.basename(Path.dirname(entryAsset.name));
    }

    // Add the content hash and extension.
    return name + '.' + hash + ext;
  }

  async package(bundler, oldHashes, newHashes = new Map()) {
    let promises = [];
    let mappings = [];

    if (!this.isEmpty) {
      let hash = this.getHash();
      newHashes.set(this.name, hash);

      if (!oldHashes || oldHashes.get(this.name) !== hash) {
        promises.push(this._package(bundler));
      }
    }

    for (let Leaf of this.childBundles.values()) {
      if (Leaf.type === 'map') {
        mappings.push(Leaf);
      } else {
        promises.push(Leaf.package(bundler, oldHashes, newHashes));
      }
    }

    await Promise.all(promises);
    for (let Leaf of mappings) {
      await Leaf.package(bundler, oldHashes, newHashes);
    }
    return newHashes;
  }

  async _package(bundler) {
    let Packager = bundler.packagers.get(this.type);
    let packager = new Packager(this, bundler);

    let startTime = Date.now();
    await packager.setup();
    await packager.start();

    let included = new Set();
    for (let asset of this.assets) {
      await this._addDeps(asset, packager, included);
    }

    await packager.end();

    this.totalSize = packager.getSize();

    let assetArray = Array.from(this.assets);
    let assetStartTime =
      this.type === 'map'
        ? 0
        : assetArray.sort((a, b) => a.startTime - b.startTime)[0].startTime;
    let assetEndTime =
      this.type === 'map'
        ? 0
        : assetArray.sort((a, b) => b.endTime - a.endTime)[0].endTime;
    let packagingTime = Date.now() - startTime;
    this.bundleTime = assetEndTime - assetStartTime + packagingTime;
  }

  async _addDeps(asset, packager, included) {
    if (!this.assets.has(asset) || included.has(asset)) {
      return;
    }

    included.add(asset);

    for (let depAsset of asset.depAssets.values()) {
      await this._addDeps(depAsset, packager, included);
    }

    await packager.addAsset(asset);

    const assetSize = packager.getSize() - this.totalSize;
    if (assetSize > 0) {
      this.addAssetSize(asset, assetSize);
    }
  }

  addAssetSize(asset, size) {
    asset.bundledSize = size;
    this.totalSize += size;
  }

  getParents() {
    let parents = [];
    let Leaf = this;

    while (Leaf) {
      parents.push(Leaf);
      Leaf = Leaf.parentBundle;
    }

    return parents;
  }

  findCommonAncestor(Leaf) {
    // Get a list of parent bundles going up to the root
    let ourParents = this.getParents();
    let theirParents = Leaf.getParents();

    // Start from the root Leaf, and find the first Leaf that's different
    let a = ourParents.pop();
    let b = theirParents.pop();
    let last;
    while (a === b && ourParents.length > 0 && theirParents.length > 0) {
      last = a;
      a = ourParents.pop();
      b = theirParents.pop();
    }

    if (a === b) {
      // One Leaf descended from the other
      return a;
    }

    return last;
  }

  getHash() {
    let hash = crypto.createHash('md5');
    for (let asset of this.assets) {
      hash.update(asset.hash);
    }

    return hash.digest('hex');
  }
}

module.exports = Leaf;
