// _data/products.js
const swell = require('../swell.config.js')

module.exports = async function() {
  const products = await swell.products.list({
    limit: 25,
    expand: ['variants', 'categories']
  })
  
  return products.results
}