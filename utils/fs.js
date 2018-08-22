'use strict'
const fs = require('fs')
const path = require('path')

function read(staticUrl) {
  return new Promise((resolve, reject) => {
    fs.readFile(path.resolve(staticUrl), (err, data) => {
      if (err) {
        reject(err)
      } else {
        resolve(data)
      }
    })
  })
}
exports.read = read
