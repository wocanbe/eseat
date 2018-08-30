'use strict'
const render = require('../utils/entry')
const jsLoader = require('../loader/js')

function favicon (config) {
  return new Promise ((resolve, reject) => {
    const wabapps = new Entry('webapp', {app: ['webapp1']}, resolve)
    wabapps.watch()
  })
}

module.exports = favicon
