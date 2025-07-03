import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import DashboardSidebar from '@/components/dashboard-sidebar'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  // You can add session logic here if necessary.
  return (
    <div className="flex">
      <DashboardSidebar />
      <main className="flex-1">{children}</main>
    </div>
  )
}