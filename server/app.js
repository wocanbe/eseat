
const Koa = require('koa')
const logger = require('koa-logger')
const bodyParser = require('koa-bodyparser')
const staticMiddleware = require('koa-static')

const faviconMiddleware = require('../middlewares/favicon')
const MockMiddleware = require('../middlewares/mock')

const app = new Koa()
app.use(logger())
app.use(faviconMiddleware())
app.use(staticMiddleware('static'))
app.use(bodyParser())

Object.keys(config.mockTable).forEach(function (context) {
  const options = config.mockTable[context]
  let allowOrigin = []
  if (options.allowOrigin) allowOrigin = options.allowOrigin
  const mockRouters = new MockMiddleware(options.mockConfig, allowOrigin)
  const mRouter = mockRouters.router
  app.use(mRouter.routes())
  app.use(mRouter.allowedMethods())
})

app.use(async ctx => {
  ctx.body = 'Hello World'
})

module.exports = app