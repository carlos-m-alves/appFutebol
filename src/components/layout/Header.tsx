import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useGroup } from '../../contexts/GroupContext'
import { LogOut, Users, Home, Trophy, BarChart3, History } from 'lucide-react'

export function Header() {
  const { profile, signOut } = useAuth()
  const { currentGroup } = useGroup()
  const navigate = useNavigate()

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  return (
    <header className="bg-green-600 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2 font-bold text-xl">
            <img src="/vite.svg" alt="PeladaFC" className="w-8 h-8" />
            PeladaFC
          </Link>

          {currentGroup && (
            <nav className="hidden md:flex items-center gap-6">
              <Link to="/" className="flex items-center gap-1 text-sm hover:text-green-200 transition">
                <Home size={18} /> Início
              </Link>
              <Link to="/matches" className="flex items-center gap-1 text-sm hover:text-green-200 transition">
                <Trophy size={18} /> Partidas
              </Link>
              <Link to="/hall" className="flex items-center gap-1 text-sm hover:text-green-200 transition">
                <History size={18} /> Hall da Pelada
              </Link>
              <Link to="/rankings" className="flex items-center gap-1 text-sm hover:text-green-200 transition">
                <BarChart3 size={18} /> Rankings
              </Link>
              <Link to="/groups" className="flex items-center gap-1 text-sm hover:text-green-200 transition">
                <Users size={18} /> Grupos
              </Link>
            </nav>
          )}

          <div className="flex items-center gap-4">
            {profile && (
              <span className="text-sm hidden sm:block">{profile.name}</span>
            )}
            <button onClick={handleSignOut} className="p-2 hover:bg-green-700 rounded-full transition" title="Sair">
              <LogOut size={20} />
            </button>
          </div>
        </div>

        {currentGroup && (
          <nav className="md:hidden flex items-center gap-4 pb-3 overflow-x-auto">
            <Link to="/" className="flex items-center gap-1 text-xs whitespace-nowrap">Início</Link>
            <Link to="/matches" className="flex items-center gap-1 text-xs whitespace-nowrap">Partidas</Link>
            <Link to="/hall" className="flex items-center gap-1 text-xs whitespace-nowrap">Hall da Pelada</Link>
            <Link to="/rankings" className="flex items-center gap-1 text-xs whitespace-nowrap">Rankings</Link>
            <Link to="/groups" className="flex items-center gap-1 text-xs whitespace-nowrap">Grupos</Link>
          </nav>
        )}
      </div>
    </header>
  )
}
