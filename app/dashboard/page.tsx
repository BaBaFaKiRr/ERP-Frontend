'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { TrendingUp, Package, ShoppingCart, DollarSign, Clock } from 'lucide-react'

// Mock data for charts
const salesData = [
  { month: 'Jan', sales: 4000, target: 5000 },
  { month: 'Feb', sales: 3000, target: 5000 },
  { month: 'Mar', sales: 2000, target: 5000 },
  { month: 'Apr', sales: 2780, target: 5000 },
  { month: 'May', sales: 1890, target: 5000 },
  { month: 'Jun', sales: 2390, target: 5000 },
]

const inventoryData = [
  { product: 'Product A', quantity: 400, reorderLevel: 300 },
  { product: 'Product B', quantity: 300, reorderLevel: 250 },
  { product: 'Product C', quantity: 200, reorderLevel: 200 },
  { product: 'Product D', quantity: 278, reorderLevel: 250 },
  { product: 'Product E', quantity: 189, reorderLevel: 100 },
]

interface KPICard {
  title: string
  value: string | number
  change: string
  trend: 'up' | 'down'
  icon: React.ReactNode
}

export default function DashboardPage() {
  const supabase = createClient()
  const [user, setUser] = useState<any>(null)
  const [kpis, setKpis] = useState<KPICard[]>([
    {
      title: 'Total Sales',
      value: '$45,231',
      change: '+12.5%',
      trend: 'up',
      icon: <DollarSign className="w-6 h-6" />,
    },
    {
      title: 'Pending Orders',
      value: '42',
      change: '+3',
      trend: 'up',
      icon: <ShoppingCart className="w-6 h-6" />,
    },
    {
      title: 'Low Stock Items',
      value: '8',
      change: '-2',
      trend: 'down',
      icon: <Package className="w-6 h-6" />,
    },
    {
      title: 'Active Work Orders',
      value: '15',
      change: '+5',
      trend: 'up',
      icon: <Clock className="w-6 h-6" />,
    },
  ])

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      setUser(user)
    }

    getUser()
  }, [supabase])

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900">Welcome to ERP Dashboard</h1>
        <p className="text-gray-600 mt-2">
          {user?.email ? `Hello, ${user.email}` : 'Manufacturing Operations Center'}
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {kpis.map((kpi, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{kpi.title}</CardTitle>
              <div className={`text-${kpi.trend === 'up' ? 'green' : 'red'}-600`}>
                {kpi.icon}
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{kpi.value}</div>
              <p
                className={`text-xs ${
                  kpi.trend === 'up' ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {kpi.change} from last month
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Sales Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Sales Performance</CardTitle>
            <CardDescription>Monthly sales vs target</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={salesData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="sales" stroke="#3b82f6" />
                <Line type="monotone" dataKey="target" stroke="#ef4444" strokeDasharray="5 5" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Inventory Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Inventory Status</CardTitle>
            <CardDescription>Current stock vs reorder level</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={inventoryData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="product" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="quantity" fill="#3b82f6" />
                <Bar dataKey="reorderLevel" fill="#fbbf24" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recent Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-sm">SO-001</span>
                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                  Approved
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-sm">SO-002</span>
                <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                  Pending
                </span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-sm">SO-003</span>
                <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                  Completed
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Pending Approvals</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-sm">Material Entry #5</span>
                <span className="text-xs">2 days ago</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-sm">PO-004</span>
                <span className="text-xs">1 day ago</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-sm">Work Order #12</span>
                <span className="text-xs">Just now</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">System Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-sm">Database</span>
                <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                  Operational
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-sm">API Server</span>
                <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                  Operational
                </span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-sm">Backups</span>
                <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                  Recent
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
