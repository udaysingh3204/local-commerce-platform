export interface OrderItem {
  productId: {
    name: string
  }
  quantity: number
  price: number
}

export interface Order {
  _id: string
  items: OrderItem[]
  totalAmount: number
  status: string
}