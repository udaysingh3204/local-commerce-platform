import { createContext, useContext, useState } from "react"

const CartContext = createContext<any>(null)

export const CartProvider = ({ children }: any) => {

  const [cart, setCart] = useState<any[]>([])

  const addToCart = (product: any) => {
    setCart(prev => {
      const existing = prev.find(item => item._id === product._id)

      // ✅ ALWAYS EXTRACT CLEAN storeId
      const storeId =
        typeof product.storeId === "object"
          ? product.storeId?._id
          : product.storeId

      if (existing) {
        return prev.map(item =>
          item._id === product._id
            ? {
                ...item,
                quantity: item.quantity + 1,
                storeId
              }
            : item
        )
      }

      return [
        ...prev,
        {
          ...product,
          quantity: 1,
          storeId
        }
      ]
    })
  }

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(item => item._id !== id))
  }

  const updateQuantity = (id: string, type: "inc" | "dec") => {
    setCart(prev =>
      prev.map(item => {
        if (item._id === id) {
          const newQty = type === "inc"
            ? item.quantity + 1
            : item.quantity - 1

          return {
            ...item,
            quantity: Math.max(newQty, 1)
          }
        }
        return item
      })
    )
  }

  const clearCart = () => setCart([])

  return (
    <CartContext.Provider value={{
      cart,
      addToCart,
      removeFromCart,
      updateQuantity,
      clearCart
    }}>
      {children}
    </CartContext.Provider>
  )
}

export const useCart = () => useContext(CartContext)