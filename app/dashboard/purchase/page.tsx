'use client'

import { useState } from 'react'
import Link from 'next/link'
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
import { Plus, Search } from 'lucide-react'

// Mock purchase order data
const mockPurchaseOrders = [
  {
    id: '1',
    poNumber: 'PO-001',
    supplier: 'Steel Supplies Inc',
    date: '2024-03-01',
    expectedDate: '2024-03-15',
    amount: '$8,500',
    status: 'approved',
    items: 3,
  },
  {
    id: '2',
    poNumber: 'PO-002',
    supplier: 'Plastic Components Ltd',
    date: '2024-03-05',
    expectedDate: '2024-03-20',
    amount: '$6,200',
    status: 'pending',
    items: 2,
  },
  {
    id: '3',
    poNumber: 'PO-003',
    supplier: 'Industrial Materials Co',
    date: '2024-03-08',
    expectedDate: '2024-03-25',
    amount: '$12,300',
    status: 'draft',
    items: 4,
  },
  {
    id: '4',
    poNumber: 'PO-004',
    supplier: 'Electronics Supplier',
    date: '2024-02-25',
    expectedDate: '2024-03-10',
    amount: '$4,800',
    status: 'completed',
    items: 2,
  },
]

const statusConfig = {
  draft: { color: 'bg-gray-100 text-gray-800', label: 'Draft' },
  pending: { color: 'bg-yellow-100 text-yellow-800', label: 'Pending Approval' },
  approved: { color: 'bg-blue-100 text-blue-800', label: 'Approved' },
  completed: { color: 'bg-green-100 text-green-800', label: 'Completed' },
}

export default function PurchaseOrdersPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [filteredOrders, setFilteredOrders] = useState(mockPurchaseOrders)

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const term = e.target.value
    setSearchTerm(term)

    const filtered = mockPurchaseOrders.filter(
      (order) =>
        order.poNumber.toLowerCase().includes(term.toLowerCase()) ||
        order.supplier.toLowerCase().includes(term.toLowerCase())
    )
    setFilteredOrders(filtered)
  }

  const totalValue = mockPurchaseOrders.reduce((sum, order) => {
    const value = parseInt(order.amount.replace(/[^0-9]/g, ''))
    return sum + value
  }, 0)

  const approvedOrders = mockPurchaseOrders.filter((o) => o.status === 'approved').length
  const pendingOrders = mockPurchaseOrders.filter((o) => o.status === 'pending').length

  return (
    <div className="p-8">
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-4xl font-bold text-gray-900">Purchase Orders</h1>
          <p className="text-gray-600 mt-2">Manage purchase orders to suppliers</p>
        </div>
        <Link href="/dashboard/purchase/create">
          <Button className="flex items-center gap-2">
            <Plus size={18} />
            Create Purchase Order
          </Button>
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total POs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockPurchaseOrders.length}</div>
            <p className="text-xs text-gray-600">All time</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Approved POs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{approvedOrders}</div>
            <p className="text-xs text-gray-600">Ready for delivery</p>
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
            <p className="text-xs text-gray-600">Purchase value</p>
          </CardContent>
        </Card>
      </div>

      {/* Process Flow */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Purchase Order Process</CardTitle>
          <CardDescription>
            Process: Material Request → Create PO → Admin Approval → Send to Supplier → Receive Goods
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 overflow-x-auto pb-4">
            {[
              'Request Entry',
              'Create PO',
              'Admin Approval',
              'Send to Supplier',
              'Receive Goods',
              'Complete',
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
      <Card>
        <CardHeader>
          <CardTitle>Purchase Orders</CardTitle>
          <CardDescription>Search and manage purchase orders</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-6 flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 text-gray-400" size={18} />
              <Input
                placeholder="Search by PO number or supplier..."
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
                  <TableHead>PO Number</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Order Date</TableHead>
                  <TableHead>Expected Date</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.map((order) => (
                  <TableRow key={order.id} className="hover:bg-gray-50">
                    <TableCell className="font-mono font-semibold">{order.poNumber}</TableCell>
                    <TableCell>{order.supplier}</TableCell>
                    <TableCell>{order.date}</TableCell>
                    <TableCell>{order.expectedDate}</TableCell>
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
