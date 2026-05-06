'use client'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'

export default function FinancePage() {
  return (
    <div className="p-8">
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white">Finance & Accounting</h1>
          <p className="text-gray-600 mt-2">Manage invoices, payments, and financial transactions</p>
        </div>
        <Button className="flex items-center gap-2">
          <Plus size={18} />
          Create Invoice
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Finance Management</CardTitle>
          <CardDescription>
            Process: Sale/Purchase Order → Generate Invoice → Record Payment → Financial Reports
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600">Finance module coming soon...</p>
        </CardContent>
      </Card>
    </div>
  )
}
