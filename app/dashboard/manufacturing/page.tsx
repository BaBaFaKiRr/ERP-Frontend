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
import { Plus, Search, Factory } from 'lucide-react'

// Mock work order data
const mockWorkOrders = [
  {
    id: '1',
    woNumber: 'WO-001',
    salesOrder: 'SO-001',
    status: 'in_progress',
    startDate: '2024-03-01',
    quantity: 100,
    completed: 60,
    assignedTo: 'John Smith',
  },
  {
    id: '2',
    woNumber: 'WO-002',
    salesOrder: 'SO-002',
    status: 'pending',
    startDate: '2024-03-05',
    quantity: 50,
    completed: 0,
    assignedTo: 'Jane Doe',
  },
  {
    id: '3',
    woNumber: 'WO-003',
    salesOrder: 'SO-003',
    status: 'completed',
    startDate: '2024-02-28',
    quantity: 75,
    completed: 75,
    assignedTo: 'Mike Johnson',
  },
  {
    id: '4',
    woNumber: 'WO-004',
    salesOrder: 'SO-004',
    status: 'in_progress',
    startDate: '2024-03-08',
    quantity: 120,
    completed: 85,
    assignedTo: 'Sarah Williams',
  },
]

const statusConfig = {
  pending: { color: 'bg-yellow-100 text-yellow-800', label: 'Pending' },
  in_progress: { color: 'bg-blue-100 text-blue-800', label: 'In Progress' },
  paused: { color: 'bg-orange-100 text-orange-800', label: 'Paused' },
  completed: { color: 'bg-green-100 text-green-800', label: 'Completed' },
}

export default function ManufacturingPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [filteredOrders, setFilteredOrders] = useState(mockWorkOrders)

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const term = e.target.value
    setSearchTerm(term)

    const filtered = mockWorkOrders.filter(
      (order) =>
        order.woNumber.toLowerCase().includes(term.toLowerCase()) ||
        order.salesOrder.toLowerCase().includes(term.toLowerCase()) ||
        order.assignedTo.toLowerCase().includes(term.toLowerCase())
    )
    setFilteredOrders(filtered)
  }

  const inProgressCount = mockWorkOrders.filter((o) => o.status === 'in_progress').length
  const pendingCount = mockWorkOrders.filter((o) => o.status === 'pending').length
  const completedCount = mockWorkOrders.filter((o) => o.status === 'completed').length

  return (
    <div className="p-8">
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-4xl font-bold text-gray-900">Manufacturing & Work Orders</h1>
          <p className="text-gray-600 mt-2">Manage production and work orders</p>
        </div>
        <Link href="/dashboard/manufacturing/create">
          <Button className="flex items-center gap-2">
            <Plus size={18} />
            Create Work Order
          </Button>
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Work Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockWorkOrders.length}</div>
            <p className="text-xs text-gray-600">All orders</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{inProgressCount}</div>
            <p className="text-xs text-gray-600">Currently producing</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pending Start</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{pendingCount}</div>
            <p className="text-xs text-gray-600">Awaiting production</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{completedCount}</div>
            <p className="text-xs text-gray-600">Finished orders</p>
          </CardContent>
        </Card>
      </div>

      {/* Process Flow */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Factory size={24} />
            Manufacturing Process
          </CardTitle>
          <CardDescription>
            Process: Sales Order → Create Work Order → Issue Materials → Produce → Complete
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 overflow-x-auto pb-4">
            {[
              'Sales Order',
              'Create Work Order',
              'Material Issue',
              'Production Start',
              'Production Process',
              'Quality Check',
              'Complete',
            ].map((step, index) => (
              <div key={index} className="flex items-center gap-2 min-w-fit">
                <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center font-bold">
                  {index + 1}
                </div>
                <p className="text-sm font-medium text-gray-700">{step}</p>
                {index < 6 && <div className="w-4 h-0.5 bg-gray-300"></div>}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Search and Filter */}
      <Card>
        <CardHeader>
          <CardTitle>Work Orders</CardTitle>
          <CardDescription>Search and manage work orders</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-6 flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 text-gray-400" size={18} />
              <Input
                placeholder="Search by WO number, SO, or assigned employee..."
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
                  <TableHead>Work Order</TableHead>
                  <TableHead>Sales Order</TableHead>
                  <TableHead>Assigned To</TableHead>
                  <TableHead>Start Date</TableHead>
                  <TableHead className="text-center">Progress</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.map((order) => {
                  const progress = Math.round((order.completed / order.quantity) * 100)
                  return (
                    <TableRow key={order.id} className="hover:bg-gray-50">
                      <TableCell className="font-mono font-semibold">{order.woNumber}</TableCell>
                      <TableCell className="font-mono">{order.salesOrder}</TableCell>
                      <TableCell>{order.assignedTo}</TableCell>
                      <TableCell>{order.startDate}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-blue-600"
                              style={{ width: `${progress}%` }}
                            ></div>
                          </div>
                          <span className="text-sm font-medium">{progress}%</span>
                        </div>
                      </TableCell>
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
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
