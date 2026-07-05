import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useGroup } from '../../contexts/GroupContext'
import { LogOut, Users, Home, Trophy, BarChart3, Swords, MapPin } from 'lucide-react'

const NAV_ITEMS = [
  { path: '/dashboard', label: 'Início', icon: <Home size={18} /> },
  { path: '/matches', label: 'Partidas', icon: <Trophy size={18} /> },
  { path: '/rankings', label: 'Rankings', icon: <BarChart3 size={18} /> },
  { path: '/groups', label: 'Grupos', icon: <Users size={18} /> },
  { path: '/mapa', label: 'Quadras', icon: <MapPin size={18} /> },
]

const HOME_NAV_ITEMS = NAV_ITEMS.filter(item =>
  ['/dashboard', '/groups', '/mapa'].includes(item.path)
)

export function Header() {
  const { profile, signOut } = useAuth()
  const { currentGroup } = useGroup()
  const navigate = useNavigate()
  const location = useLocation()

  const activePath = '/' + location.pathname.split('/')[1]

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  return (
    <header className="bg-gradient-to-r from-slate-800 to-slate-900 shadow-xl border-b border-white/5">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to={currentGroup ? '/dashboard' : '/'} className="flex items-center gap-2 font-bold text-xl text-white hover:text-yellow-400 transition-colors">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center shadow-lg shadow-yellow-500/20">
              <Swords size={18} className="text-slate-900" />
            </div>
            PeladaFC
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {(activePath === '/dashboard' ? HOME_NAV_ITEMS : NAV_ITEMS.filter(item => item.path !== '/matches' || currentGroup)).map(item => {
              const isActive = activePath === item.path || (item.path === '/dashboard' && activePath === '')
              return (
                <Link key={item.path} to={item.path}
                  className={`relative flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                    isActive
                      ? 'text-yellow-400 bg-yellow-400/10'
                      : 'text-gray-300 hover:text-white hover:bg-white/5'
                  }`}>
                  {item.icon}
                  <span>{item.label}</span>
                  {isActive && (
                    <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-yellow-400 rounded-full" />
                  )}
                </Link>
              )
            })}
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-3">
            {profile && (
              <Link to="/profile"
                className={`hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                  activePath === '/profile'
                    ? 'text-yellow-400 bg-yellow-400/10'
                    : 'text-gray-300 hover:text-white hover:bg-white/5'
                }`}>
                <div className="w-6 h-6 rounded-full overflow-hidden shrink-0">
                  {profile.avatar_url ? (
                    <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-emerald-400 to-green-600 flex items-center justify-center text-white font-bold text-[10px]">
                      {profile.name?.charAt(0).toUpperCase() || '?'}
                    </div>
                  )}
                </div>
                <span className="truncate max-w-[120px]">{profile.name}</span>
              </Link>
            )}
            <button onClick={handleSignOut}
              className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-all" title="Sair">
              <LogOut size={18} />
            </button>
          </div>
        </div>

        {/* Mobile nav */}
        <nav className="md:hidden flex items-center gap-1 pb-3 overflow-x-auto scrollbar-none">
          {(activePath === '/dashboard' ? HOME_NAV_ITEMS : NAV_ITEMS.filter(item => item.path !== '/matches' || currentGroup)).map(item => {
            const isActive = activePath === item.path || (item.path === '/dashboard' && activePath === '')
            return (
              <Link key={item.path} to={item.path}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium whitespace-nowrap rounded-lg transition-all duration-200 ${
                  isActive
                    ? 'text-yellow-400 bg-yellow-400/10'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}>
                {item.icon}
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>
      </div>
    </header>
  )
}
