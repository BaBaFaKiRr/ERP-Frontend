'use client'

import { useState } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Plus, Search, TrendingUp } from 'lucide-react'

// Mock sales order data
const mockSalesOrders = [
  {
    id: '1',
    orderNumber: 'SO-001',
    customer: 'Acme Corporation',
    date: '2024-03-01',
    dueDate: '2024-03-15',
    amount: '$12,500',
    status: 'approved',
    items: 3,
  },
  {
    id: '2',
    orderNumber: 'SO-002',
    customer: 'Tech Industries',
    date: '2024-03-05',
    dueDate: '2024-03-20',
    amount: '$8,750',
    status: 'pending',
    items: 2,
  },
  {
    id: '3',
    orderNumber: 'SO-003',
    customer: 'Global Manufacturing',
    date: '2024-03-08',
    dueDate: '2024-03-25',
    amount: '$15,200',
    status: 'draft',
    items: 4,
  },
  {
    id: '4',
    orderNumber: 'SO-004',
    customer: 'Prime Solutions',
    date: '2024-02-25',
    dueDate: '2024-03-10',
    amount: '$6,800',
    status: 'completed',
    items: 2,
  },
  {
    id: '5',
    orderNumber: 'SO-005',
    customer: 'Industrial Group',
    date: '2024-03-10',
    dueDate: '2024-03-28',
    amount: '$22,400',
    status: 'approved',
    items: 5,
  },
]

const statusConfig = {
  draft: { color: 'bg-gray-100 text-gray-800', label: 'Draft' },
  pending: { color: 'bg-yellow-100 text-yellow-800', label: 'Pending Approval' },
  approved: { color: 'bg-blue-100 text-blue-800', label: 'Approved' },
  completed: { color: 'bg-green-100 text-green-800', label: 'Completed' },
}

export default function SalesOrdersPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [filteredOrders, setFilteredOrders] = useState(mockSalesOrders)

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const term = e.target.value
    setSearchTerm(term)

    const filtered = mockSalesOrders.filter(
      (order) =>
        order.orderNumber.toLowerCase().includes(term.toLowerCase()) ||
        order.customer.toLowerCase().includes(term.toLowerCase())
    )
    setFilteredOrders(filtered)
  }

  const totalValue = mockSalesOrders.reduce((sum, order) => {
    const value = parseInt(order.amount.replace(/[^0-9]/g, ''))
    return sum + value
  }, 0)

  const approvedOrders = mockSalesOrders.filter((o) => o.status === 'approved').length
  const pendingOrders = mockSalesOrders.filter((o) => o.status === 'pending').length

  return (
    <div className="p-8">
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-4xl font-bold text-gray-900">Sales Orders</h1>
          <p className="text-gray-600 mt-2">Manage and track sales orders from customers</p>
        </div>
        <Button className="flex items-center gap-2">
          <Plus size={18} />
          Create Sales Order
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockSalesOrders.length}</div>
            <p className="text-xs text-gray-600">All time</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Approved Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{approvedOrders}</div>
            <p className="text-xs text-gray-600">Ready for fulfillment</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pending Approval</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{pendingOrders}</div>
            <p className="text-xs text-gray-600">Awaiting approval</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${(totalValue / 100).toLocaleString()}
            </div>
            <p className="text-xs text-gray-600">Order value</p>
          </CardContent>
        </Card>
      </div>

      {/* Proforma Invoice Flow */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Create Sales Order Flow</CardTitle>
          <CardDescription>
            Process: Customer Order → Proforma Invoice → Sales Order → Approval → Dispatch
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 overflow-x-auto pb-4">
            {[
              'Customer Order',
              'Proforma Invoice',
              'Create Order',
              'Admin Approval',
              'Stock Entry',
              'Dispatch',
            ].map((step, index) => (
              <div key={index} className="flex items-center gap-2 min-w-fit">
                <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center font-bold">
                  {index + 1}
                </div>
                <p className="text-sm font-medium text-gray-700">{step}</p>
                {index < 5 && <div className="w-4 h-0.5 bg-gray-300"></div>}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Search and Filter */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Sales Orders</CardTitle>
          <CardDescription>Search and manage sales orders</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-6 flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 text-gray-400" size={18} />
              <Input
                placeholder="Search by order number or customer..."
                value={searchTerm}
                onChange={handleSearch}
                className="pl-10"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead>Order Number</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Order Date</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.map((order) => (
                  <TableRow key={order.id} className="hover:bg-gray-50">
                    <TableCell className="font-mono font-semibold">{order.orderNumber}</TableCell>
                    <TableCell>{order.customer}</TableCell>
                    <TableCell>{order.date}</TableCell>
                    <TableCell>{order.dueDate}</TableCell>
                    <TableCell className="text-right font-semibold">{order.amount}</TableCell>
                    <TableCell>{order.items}</TableCell>
                    <TableCell>
                      <span
                        className={`text-xs px-3 py-1 rounded-full ${
                          statusConfig[order.status as keyof typeof statusConfig].color
                        }`}
                      >
                        {statusConfig[order.status as keyof typeof statusConfig].label}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm">
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
