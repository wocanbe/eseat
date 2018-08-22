const https = require('https')
const app = require('./app')

function httpServer (config) {
  const server = https.createServer(app.callback())

  return new Promise((resolve, reject) => {
    server.on('error', (err) => {
      reject(err)
    })
    // listen(port, hostname, callback)
    server.listen(config.port, () => {
      console.log('server start in port ' + config.port)
      resolve()
    })
  })
}

module.exports = httpServer