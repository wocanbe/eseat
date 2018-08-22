'use strict'
const fs = require('fs')
const path = require('path')
const Router = require('koa-router')

class MockMiddleware {
  constructor (config, allowOrigin) {
    const router = new Router();
    if (config.prefix) {
      router.prefix(config.prefix)
      this.prefix = config.prefix
    } else {
      this.prefix = ''
    }
    this.router = router
    this.allowOrigin = allowOrigin
    for (const s in config.mocks) {
      const rConfig = config.mocks[s]
      this.add({
        path: rConfig.path,
        allowOrigin: allowOrigin,
        mockFile: rConfig.file
      })
    }
    this.add({
      path: '/*',
      allowOrigin: allowOrigin
    })
  }
  getRoutes () {
    return this.router
  }
  add (config) {
    this.router.all(config.path, async (ctx, next) => {
      let filePath = ctx.path.replace(this.prefix, '')
      if (config.mockFile) filePath = config.mockFile
      await this.addResult(ctx, filePath)
    })
  }
  async addResult (ctx, filePath) {
    const localHost = ctx.request.header.origin
    if (ctx.method === 'OPTIONS') {
      if (this.allowOrigin) {
        const isPass = await this.checkCros(localHost)
        if (isPass) {
          ctx.set({
            'Access-Control-Allow-Origin': localHost,
            // 'Access-Control-Allow-Credentials': 'true',
            'Access-Control-Allow-Headers': 'Content-Type, Content-Length, Authorization, Accept, X-Requested-With , yourHeaderFeild',
            'Access-Control-Allow-Methods': 'PUT, POST, GET, DELETE, OPTIONS'
          })
        }
        ctx.body = ''
        ctx.status = 200 // 让options请求快速返回
      }
    } else {
      let params = {}
      Object.assign(params, ctx.params, ctx.query)
      if (ctx.method !== 'GET') Object.assign(params, ctx.request.body)
      try {
        const res = await this.getDataFromPath(filePath, ctx.method, params)
        if (res) {
          ctx.type = 'application/json;charset=utf-8'
          ctx.set({
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': 0,
            'Access-Control-Allow-Origin': localHost
          })
          ctx.body = res
        } else {
          ctx.status = 404
        }
      } catch(e) {
        ctx.status = 500
        ctx.body = e.message
      }
    }
  }
  checkCros (localHost) {
    return new Promise(resolve => {
      if (this.allowOrigin.indexOf(localHost) > -1) resolve(true)
      else resolve(false)
    })
  }
  getDataFromPath (apiName, method, params) {
    let useApiFile = '/index'
    if (apiName) useApiFile = apiName
    const filePath = path.resolve('mock' + apiName + '.js')
    return new Promise((resolve, reject) => {
      fs.exists(
        filePath,
        function (exist) {
          if (exist) {
            delete require.cache[filePath]
            try {
              const result = require(filePath).getData(method, params)
              if (result instanceof Promise) {
                result.then(resData => {
                  resolve(resData)
                }).catch(e => {
                  reject(e)
                })
              } else {
                resolve(result)
              }
            } catch (e) {
              console.error(e.stack)
              reject(new Error(apiName + ' has errors,please check the code.'))
            }
          } else {
            resolve(false)
          }
        }
      )
    })
  }
}
module.exports = MockMiddleware
