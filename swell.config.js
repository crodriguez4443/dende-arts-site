// swell.config.js
const swell = require('swell-js')

const options = {
  useCamelCase: true,
  cache: true,  // Enable caching
  timeout: 5000 // Set reasonable timeout
}

// Initialize and export swell
const store = 'dendearts'
const key = 'pk_kWLyA4guBdwbH1pwBV32Dp7smCsqlIgK'

try {
  swell.init(store, key, options)
} catch (error) {
  console.error('Swell initialization error:', error)
}

// Add cart cache layer
const cachedCart = {
  data: null,
  lastFetched: 0,
  ttl: 60000, // 1 minute TTL

  async get() {
    const now = Date.now()
    if (!this.data || now - this.lastFetched > this.ttl) {
      this.data = await swell.cart.get()
      this.lastFetched = now
    }
    return this.data
  },

  async updateItem(id, data) {
    // Try to update local cache optimistically if possible
    if (this.data && this.data.items) {
      const itemIndex = this.data.items.findIndex(item => item.id === id)
      if (itemIndex >= 0) {
        // Apply the update to our local cache
        const updatedItem = { ...this.data.items[itemIndex], ...data }
        this.data.items[itemIndex] = updatedItem
        
        // Recalculate totals if quantity changed
        if (data.quantity) {
          let itemQuantity = 0
          this.data.items.forEach(item => {
            itemQuantity += item.quantity
          })
          this.data.itemQuantity = itemQuantity
        }
      }
    }
    
    // Perform the actual API call
    const result = await swell.cart.updateItem(id, data)
    this.data = result
    this.lastFetched = Date.now()
    return result
  },
  
  async removeItem(id) {
    // Try to update local cache optimistically
    if (this.data && this.data.items) {
      const itemIndex = this.data.items.findIndex(item => item.id === id)
      if (itemIndex >= 0) {
        // Remove the item from our local array
        const removedItem = this.data.items[itemIndex]
        this.data.items.splice(itemIndex, 1)
        
        // Update the item count
        this.data.itemQuantity -= removedItem.quantity
      }
    }
    
    // Perform the actual API call
    const result = await swell.cart.removeItem(id)
    this.data = result
    this.lastFetched = Date.now()
    return result
  },
  
  async addItem(data) {
    const result = await swell.cart.addItem(data)
    this.data = result
    this.lastFetched = Date.now()
    return result
  },
  
  // Clear cache when needed
  clearCache() {
    this.data = null
    this.lastFetched = 0
  }
}

module.exports = {
  ...swell,
  cachedCart
}