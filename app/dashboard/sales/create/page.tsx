'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ArrowLeft } from 'lucide-react'

interface Customer {
  id: string
  name: string
  email?: string
}

interface Product {
  id: string
  code: string
  name: string
  unit_price?: number
}

interface OrderItem {
  product_id: string
  quantity: number
  unit_price: number
}

export default function CreateSalesOrderPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [customers, setCustomers] = useState<Customer[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [selectedCustomer, setSelectedCustomer] = useState('')
  const [orderNumber, setOrderNumber] = useState('')
  const [deliveryDate, setDeliveryDate] = useState('')
  const [orderItems, setOrderItems] = useState<OrderItem[]>([])
  const [selectedProduct, setSelectedProduct] = useState('')
  const [quantity, setQuantity] = useState('')

  useEffect(() => {
    fetchCustomers()
    fetchProducts()
    generateOrderNumber()
  }, [])

  const generateOrderNumber = () => {
    const timestamp = Date.now().toString().slice(-6)
    setOrderNumber(`SO-${timestamp}`)
  }

  const fetchCustomers = async () => {
    try {
      const response = await fetch('/api/customers')
      const { data } = await response.json()
      setCustomers(data || [])
    } catch (error) {
      console.error('Error fetching customers:', error)
    }
  }

  const fetchProducts = async () => {
    try {
      const response = await fetch('/api/products')
      const { data } = await response.json()
      setProducts(data || [])
    } catch (error) {
      console.error('Error fetching products:', error)
    }
  }

  const handleAddItem = () => {
    if (!selectedProduct || !quantity) {
      alert('Please select a product and enter quantity')
      return
    }

    const product = products.find((p) => p.id === selectedProduct)
    if (!product) return

    const newItem: OrderItem = {
      product_id: selectedProduct,
      quantity: parseInt(quantity),
      unit_price: product.unit_price || 0,
    }

    setOrderItems([...orderItems, newItem])
    setSelectedProduct('')
    setQuantity('')
  }

  const handleRemoveItem = (index: number) => {
    setOrderItems(orderItems.filter((_, i) => i !== index))
  }

  const calculateTotal = () => {
    return orderItems.reduce(
      (sum, item) => sum + item.quantity * item.unit_price,
      0
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedCustomer || !orderNumber || orderItems.length === 0) {
      alert('Please fill in all required fields')
      return
    }

    setLoading(true)

    try {
      const response = await fetch('/api/sales-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_number: orderNumber,
          customer_id: selectedCustomer,
          delivery_date: deliveryDate,
          total_amount: calculateTotal(),
          status: 'draft',
        }),
      })

      if (!response.ok) throw new Error('Failed to create order')

      alert('Sales order created successfully!')
      router.push('/dashboard/sales')
    } catch (error) {
      console.error('Error creating order:', error)
      alert('Failed to create sales order')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-8">
      <div className="flex items-center gap-4 mb-8">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.back()}
          className="gap-2"
        >
          <ArrowLeft size={18} />
          Back
        </Button>
        <h1 className="text-4xl font-bold text-gray-900">Create Sales Order</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Order Details */}
        <Card>
          <CardHeader>
            <CardTitle>Order Details</CardTitle>
            <CardDescription>Basic information for the sales order</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Order Number</label>
                <Input value={orderNumber} disabled className="bg-gray-50" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Delivery Date *</label>
                <Input
                  type="date"
                  value={deliveryDate}
                  onChange={(e) => setDeliveryDate(e.target.value)}
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Customer *</label>
              <select
                value={selectedCustomer}
                onChange={(e) => setSelectedCustomer(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="">Select a customer</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name}
                  </option>
                ))}
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Order Items */}
        <Card>
          <CardHeader>
            <CardTitle>Order Items</CardTitle>
            <CardDescription>Add products to your sales order</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Product</label>
                <select
                  value={selectedProduct}
                  onChange={(e) => setSelectedProduct(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="">Select product</option>
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Quantity</label>
                <Input
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  min="1"
                  placeholder="0"
                />
              </div>
              <div className="flex items-end">
                <Button type="button" onClick={handleAddItem} className="w-full">
                  Add Item
                </Button>
              </div>
            </div>

            {/* Items List */}
            {orderItems.length > 0 && (
              <div className="space-y-2 border-t pt-4">
                {orderItems.map((item, index) => {
                  const product = products.find((p) => p.id === item.product_id)
                  return (
                    <div
                      key={index}
                      className="flex justify-between items-center p-3 bg-gray-50 rounded"
                    >
                      <div>
                        <p className="font-medium">{product?.name}</p>
                        <p className="text-sm text-gray-600">
                          {item.quantity} × ${item.unit_price.toFixed(2)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">
                          ${(item.quantity * item.unit_price).toFixed(2)}
                        </p>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveItem(index)}
                          className="text-red-600 hover:text-red-800"
                        >
                          Remove
                        </Button>
                      </div>
                    </div>
                  )
                })}

                <div className="border-t pt-4 flex justify-end">
                  <div>
                    <p className="text-sm text-gray-600">Total Amount:</p>
                    <p className="text-3xl font-bold text-blue-600">
                      ${calculateTotal().toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Submit Buttons */}
        <div className="flex gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? 'Creating...' : 'Create Sales Order'}
          </Button>
        </div>
      </form>
    </div>
  )
}
