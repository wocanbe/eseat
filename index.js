function run (options = {}) {
  return options.https ? require('./server/https')(options) : require('./server/http')(options)
}

module.exports = run
