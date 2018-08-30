const http = require('http')
const creatApp = require('./app')

function httpServer (config) {
  return new Promise((resolve, reject) => {
    const server = http.createServer(creatApp(config).callback())
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