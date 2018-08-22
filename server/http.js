const http = require('http')
const app = require('./app')

function httpServer (config) {
  const server = http.createServer(app.callback())

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