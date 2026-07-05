import { Outlet } from 'react-router-dom'
import { Header } from './Header'
import { useGroup } from '../../contexts/GroupContext'

export function Layout() {
  const { currentGroup } = useGroup()

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a0e17] via-[#0f1420] to-[#0a0e17]">
      <div className="fixed inset-0 pointer-events-none opacity-20"
        style={{ background: 'radial-gradient(ellipse at 30% 50%, rgba(34,197,94,0.15) 0%, transparent 60%), radial-gradient(ellipse at 70% 20%, rgba(234,179,8,0.08) 0%, transparent 50%)' }} />
      {currentGroup && <Header />}
      <main className="max-w-5xl mx-auto px-4 py-8 relative z-10">
        <Outlet />
      </main>
    </div>
  )
}
