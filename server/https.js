const https = require('https')
const config = require('./app')

function httpServer (config) {
  return new Promise((resolve, reject) => {
    const server = https.createServer(config(config).callback())
    server.on('error', (err) => {
      reject(err)
    })
    // listen(port, hostname, callback)
    server.listen(config.port, () => {
      // console.log('server start in port ' + config.port)
      resolve(true)
    })
  }).catch(error => console.log('caught', error))
}

module.exports = httpServer