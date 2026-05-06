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

interface SalesOrder {
  id: string
  order_number: string
}

interface Employee {
  id: string
  user_id?: string
  employee_number: string
}

export default function CreateWorkOrderPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [salesOrders, setSalesOrders] = useState<SalesOrder[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [woNumber, setWoNumber] = useState('')
  const [selectedSalesOrder, setSelectedSalesOrder] = useState('')
  const [assignedTo, setAssignedTo] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [totalQuantity, setTotalQuantity] = useState('')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    fetchSalesOrders()
    fetchEmployees()
    generateWoNumber()
  }, [])

  const generateWoNumber = () => {
    const timestamp = Date.now().toString().slice(-6)
    setWoNumber(`WO-${timestamp}`)
  }

  const fetchSalesOrders = async () => {
    try {
      const response = await fetch('/api/sales-orders?status=approved')
      const { data } = await response.json()
      setSalesOrders(data || [])
    } catch (error) {
      console.error('Error fetching sales orders:', error)
    }
  }

  const fetchEmployees = async () => {
    try {
      const response = await fetch('/api/employees')
      const { data } = await response.json()
      setEmployees(data || [])
    } catch (error) {
      console.error('Error fetching employees:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!woNumber || !selectedSalesOrder || !assignedTo || !totalQuantity) {
      alert('Please fill in all required fields')
      return
    }

    setLoading(true)

    try {
      const response = await fetch('/api/work-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wo_number: woNumber,
          sales_order_id: selectedSalesOrder,
          assigned_to: assignedTo,
          start_date: startDate,
          end_date: endDate,
          total_quantity: parseInt(totalQuantity),
          notes: notes,
          status: 'pending',
        }),
      })

      if (!response.ok) throw new Error('Failed to create work order')

      alert('Work order created successfully!')
      router.push('/dashboard/manufacturing')
    } catch (error) {
      console.error('Error creating work order:', error)
      alert('Failed to create work order')
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
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white">Create Work Order</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Work Order Details */}
        <Card>
          <CardHeader>
            <CardTitle>Work Order Details</CardTitle>
            <CardDescription>Create a new manufacturing work order</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Work Order Number</label>
                <Input value={woNumber} disabled className="bg-gray-50" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Sales Order *</label>
                <select
                  value={selectedSalesOrder}
                  onChange={(e) => setSelectedSalesOrder(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="">Select a sales order</option>
                  {salesOrders.map((so) => (
                    <option key={so.id} value={so.id}>
                      {so.order_number}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Assigned To *</label>
                <select
                  value={assignedTo}
                  onChange={(e) => setAssignedTo(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="">Select an employee</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.employee_number}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Total Quantity *</label>
                <Input
                  type="number"
                  value={totalQuantity}
                  onChange={(e) => setTotalQuantity(e.target.value)}
                  min="1"
                  placeholder="0"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Start Date</label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">End Date</label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                rows={4}
                placeholder="Add any additional notes..."
              />
            </div>
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
            {loading ? 'Creating...' : 'Create Work Order'}
          </Button>
        </div>
      </form>
    </div>
  )
}
