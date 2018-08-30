const path = require('path')
const fs = require('fs')
// const crypto = require("crypto")
const hash = require('hash-sum')
const chokidar = require('chokidar')

// const md5 = crypto.createHash('md5')
class Entry {
  constructor (appPath, options, callback) {
    this.entrys = {}
    this.appPath = appPath
    this.scanPath = path.resolve(appPath)
    this.options = options
    this.cb = callback
    this.ready = false
  }
  watch () {
    const watcher = chokidar.watch(this.scanPath, {depth: 0})
    console.info('Scaning entry...');
    watcher
      .on('addDir', this._addDir.bind(this))
      .on('unlinkDir', this._removeDir.bind(this))
      .on('error',  error => {
        console.log('Error happened', error);
      })
      .on('ready', () => {
        this.ready = true;
        this.cb(this.entrys)
      })
  }
  _addDir (path_, stats) {
    if (path_ === this.scanPath) return
    const entryName = path_.replace(this.scanPath, '').substr(1)
    if (entryName.indexOf('/') > 0) return
    if (fs.existsSync(path_ + '/index.js')) {
      const entry = {
        path: 'webapp/' + entryName,
      }
      if (this.options.app.indexOf(entryName) > -1) {
        entry.bind = true
        if (fs.existsSync(path_ + '.html')) {
          entry.bindHtml = path_ + '.html'
        } else {
          entry.bindHtml = 'index.html'
        }
      }
      // const appHash = md5.update(path_).digest('base64')
      const appHash = hash(path_)
      this.entrys['_' + appHash] = entry
      if (this.ready) this.cb(this.entrys)
    }
  }
  _removeDir (path_) {
    // const appHash = md5.update(path_).digest('base64')
    const appHash = hash(path_)
    if (this.entrys[appHash]) {
      this.entrys[appHash] = undefined
      this.cb(this.entrys)
    }
  }
}
module.exports = Entry
