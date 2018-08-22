'use strict'
const fs = require('../utils/fs')

function favicon (favPath) {
  let usePath = favPath ? favPath : 'favicon.ico'
  return async (ctx, next) => {
    if ('/favicon.ico' === ctx.path) {
      // console.log(__dirname)
      const icon = await fs.read(usePath)
      ctx.type = 'image/x-icon'
      ctx.body = icon
    } else {
      await next()
    }
  }
}

module.exports = favicon
