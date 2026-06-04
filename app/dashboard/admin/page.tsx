'use client'

import Link from 'next/link'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Shield } from 'lucide-react'

export default function AdminPage() {
  return (
    <div className="p-8">
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white">Admin Panel</h1>
          <p className="text-gray-600 mt-2">System administration and configuration</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Permissions
            </CardTitle>
            <CardDescription>
              View and edit module-wise ERP access for employees with login
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" asChild>
              <Link href="/dashboard/admin/permissions">Manage Permissions</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>User Management</CardTitle>
            <CardDescription>Manage system users and roles</CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" variant="outline" disabled>
              Coming soon
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Company Settings</CardTitle>
            <CardDescription>Configure company details and preferences</CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full">Configure</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Data Management</CardTitle>
            <CardDescription>Backup, restore, and manage data</CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full">Manage Data</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Reports & Analytics</CardTitle>
            <CardDescription>View system reports and analytics</CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full">View Reports</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
