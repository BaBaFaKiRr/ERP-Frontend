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
import Link from 'next/link'

export default function FinancePage() {
  return (
    <div className="p-8">
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white">Accounts</h1>
          <p className="text-gray-600 mt-2">Manage invoice requests, payments, and accounting workflows</p>
        </div>
        <Button className="flex items-center gap-2" asChild>
          <Link href="/dashboard/finance/invoice-requests">
          <Plus size={18} />
          Invoice Requests
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Accounts Management</CardTitle>
          <CardDescription>
            Process: Dispatch Order → Invoice Request → Invoice generation → Payment tracking
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600">Use Invoice Requests to start invoicing dispatch orders.</p>
        </CardContent>
      </Card>
    </div>
  )
}
