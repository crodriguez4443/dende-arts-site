const swell = require('../../swell.config.js')

module.exports = async function() {
  try {
    console.log('Attempting to fetch products...')
    console.log('Store configuration:', {
      store: swell.store,
      key: swell.key,
      options: swell.options
    })
    
    const products = await swell.products.list({
      limit: 100,
      expand: ['variants', 'categories']
    })
    
    if (!products?.results) {
      console.log('No products found')
      return []
    }
    
    console.log('Successfully fetched products:', products.results.map(p => p.name))
    return products.results
  } catch (error) {
    console.error('Fetch error:', error.message)
    if (error.cause) {
      console.error('Cause:', error.cause)
    }
    return []
  }
}