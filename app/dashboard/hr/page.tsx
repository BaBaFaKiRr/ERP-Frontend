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

export default function HRPage() {
  return (
    <div className="p-8">
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-4xl font-bold text-gray-900">HR & Employees</h1>
          <p className="text-gray-600 mt-2">Manage employees, payroll, and HR operations</p>
        </div>
        <Button className="flex items-center gap-2">
          <Plus size={18} />
          Add Employee
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Human Resources Management</CardTitle>
          <CardDescription>
            Employee management, payroll, attendance, and performance tracking
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600">HR module coming soon...</p>
        </CardContent>
      </Card>
    </div>
  )
}
