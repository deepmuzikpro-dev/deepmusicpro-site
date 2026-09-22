import { createContext, useContext, useEffect, useState } from 'react'

const CartContext = createContext(null)
const STORAGE_KEY = 'dmp_cart_v1'

export function CartProvider({ children }) {
  const [items, setItems] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []
    } catch {
      return []
    }
  })

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  }, [items])

  // item: { id, type: 'product'|'track_license', title, price, license, image }
  function addItem(item) {
    setItems((prev) => {
      const key = `${item.id}:${item.license || 'default'}`
      const exists = prev.find((p) => `${p.id}:${p.license || 'default'}` === key)
      if (exists) return prev
      return [...prev, item]
    })
  }

  function removeItem(id, license) {
    setItems((prev) =>
      prev.filter((p) => !(p.id === id && (p.license || 'default') === (license || 'default')))
    )
  }

  function clearCart() {
    setItems([])
  }

  const total = items.reduce((sum, i) => sum + Number(i.price || 0), 0)

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, clearCart, total }}>
      {children}
    </CartContext.Provider>
  )
}

export const useCart = () => useContext(CartContext)
