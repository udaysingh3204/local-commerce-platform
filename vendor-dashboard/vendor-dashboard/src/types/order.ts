export interface OrderItem {
  productId: {
    name: string
  }
  quantity: number
  price: number
}

export interface Order {
  _id: string
  customerId: string
  storeId: string
  items: OrderItem[]
  totalAmount: number
  status: string
}