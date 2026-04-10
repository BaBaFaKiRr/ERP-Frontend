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
import { Plus, Search, AlertCircle } from 'lucide-react'

// Mock inventory data
const mockInventory = [
  {
    id: '1',
    code: 'PROD-001',
    name: 'Steel Plate',
    category: 'Raw Materials',
    quantity: 250,
    reorderLevel: 100,
    warehouse: 'WH-01',
  },
  {
    id: '2',
    code: 'PROD-002',
    name: 'Aluminum Bar',
    category: 'Raw Materials',
    quantity: 180,
    reorderLevel: 150,
    warehouse: 'WH-01',
  },
  {
    id: '3',
    code: 'PROD-003',
    name: 'Rubber Component',
    category: 'Components',
    quantity: 75,
    reorderLevel: 200,
    warehouse: 'WH-02',
  },
  {
    id: '4',
    code: 'PROD-004',
    name: 'Finished Product A',
    category: 'Finished Goods',
    quantity: 450,
    reorderLevel: 200,
    warehouse: 'WH-03',
  },
  {
    id: '5',
    code: 'PROD-005',
    name: 'Plastic Molding',
    category: 'Components',
    quantity: 95,
    reorderLevel: 100,
    warehouse: 'WH-02',
  },
]

export default function InventoryPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [filteredInventory, setFilteredInventory] = useState(mockInventory)

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const term = e.target.value
    setSearchTerm(term)

    const filtered = mockInventory.filter(
      (item) =>
        item.name.toLowerCase().includes(term.toLowerCase()) ||
        item.code.toLowerCase().includes(term.toLowerCase()) ||
        item.category.toLowerCase().includes(term.toLowerCase())
    )
    setFilteredInventory(filtered)
  }

  const getLowStockStatus = (quantity: number, reorderLevel: number) => {
    if (quantity <= reorderLevel) {
      return { status: 'Low Stock', color: 'bg-red-100 text-red-800' }
    }
    return { status: 'In Stock', color: 'bg-green-100 text-green-800' }
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-4xl font-bold text-gray-900">Inventory Management</h1>
          <p className="text-gray-600 mt-2">Monitor and manage product inventory</p>
        </div>
        <Button className="flex items-center gap-2">
          <Plus size={18} />
          Add Stock Entry
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Products</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">28</div>
            <p className="text-xs text-gray-600">Active items</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Low Stock Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">3</div>
            <p className="text-xs text-gray-600">Need reordering</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Quantity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1,050</div>
            <p className="text-xs text-gray-600">Units in stock</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Stock Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$125,400</div>
            <p className="text-xs text-gray-600">Estimated value</p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filter */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Inventory Items</CardTitle>
          <CardDescription>Search and manage your inventory</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-6 flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 text-gray-400" size={18} />
              <Input
                placeholder="Search by product name, code, or category..."
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
                  <TableHead>Product Code</TableHead>
                  <TableHead>Product Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead className="text-right">Reorder Level</TableHead>
                  <TableHead>Warehouse</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInventory.map((item) => {
                  const { status, color } = getLowStockStatus(item.quantity, item.reorderLevel)
                  return (
                    <TableRow key={item.id} className="hover:bg-gray-50">
                      <TableCell className="font-mono text-sm">{item.code}</TableCell>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell>{item.category}</TableCell>
                      <TableCell className="text-right font-semibold">{item.quantity}</TableCell>
                      <TableCell className="text-right">{item.reorderLevel}</TableCell>
                      <TableCell>{item.warehouse}</TableCell>
                      <TableCell>
                        <span className={`text-xs px-3 py-1 rounded-full ${color}`}>
                          {status}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm">
                          Edit
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

      {/* Low Stock Alert */}
      <Card className="border-red-200 bg-red-50">
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertCircle size={20} className="text-red-600" />
            <CardTitle className="text-red-900">Stock Alerts</CardTitle>
          </div>
          <CardDescription className="text-red-800">
            Items that need immediate attention
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filteredInventory
              .filter((item) => item.quantity <= item.reorderLevel)
              .map((item) => (
                <div key={item.id} className="flex justify-between items-center p-3 bg-white rounded border border-red-200">
                  <div>
                    <p className="font-medium">{item.name}</p>
                    <p className="text-sm text-gray-600">{item.code}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-red-600">{item.quantity} units</p>
                    <p className="text-sm text-gray-600">Required: {item.reorderLevel}</p>
                  </div>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
