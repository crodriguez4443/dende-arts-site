// swell.config.js

const swell = require('swell-js')

const options = {
  useCamelCase: true,
  cache: false
}

const store = 'dendearts'  
const key = 'pk_kWLyA4guBdwbH1pwBV32Dp7smCsqlIgK'  

try {
  swell.init(store, key, options)
} catch (error) {
  console.error('Swell initialization error:', error)
}

module.exports = swell