'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Package2,
  Factory,
  DollarSign,
  Users,
  Settings,
  LogOut,
  Menu,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Inventory', href: '/dashboard/inventory', icon: Package },
  { name: 'Sales Orders', href: '/dashboard/sales', icon: ShoppingCart },
  { name: 'Purchase Orders', href: '/dashboard/purchase', icon: Package2 },
  { name: 'Manufacturing', href: '/dashboard/manufacturing', icon: Factory },
  { name: 'Finance', href: '/dashboard/finance', icon: DollarSign },
  { name: 'HR & Employees', href: '/dashboard/hr', icon: Users },
  { name: 'Admin', href: '/dashboard/admin', icon: Settings },
]

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? 'w-64' : 'w-20'
        } bg-slate-900 text-white transition-all duration-300 flex flex-col`}
      >
        {/* Logo */}
        <div className="flex items-center justify-between p-6 border-b border-slate-700">
          {sidebarOpen && <h1 className="text-2xl font-bold">ERP System</h1>}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1 hover:bg-slate-800 rounded"
          >
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4">
          {navigation.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className="flex items-center gap-3 px-4 py-3 hover:bg-slate-800 transition-colors"
            >
              <item.icon size={20} />
              {sidebarOpen && <span>{item.name}</span>}
            </Link>
          ))}
        </nav>

        {/* Logout Button */}
        <div className="border-t border-slate-700 p-4">
          <Button
            onClick={handleLogout}
            variant="outline"
            className={`w-full ${!sidebarOpen && 'p-2'}`}
          >
            <LogOut size={20} />
            {sidebarOpen && <span className="ml-2">Logout</span>}
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}
