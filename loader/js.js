const parser = require('@babel/parser')
function parser (code) {
  const res = parser.parse(code)
  console.log(res)
  return res
}