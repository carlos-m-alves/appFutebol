import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { uploadAvatar } from '../../services/storage'
import { supabase } from '../../lib/supabase'
import { Swords } from 'lucide-react'
import { DOMINANT_FOOT_LABELS } from '../../types'

export function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [loading, setLoading] = useState(false)
  const { signIn, signInWithGoogle } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const redirectTo = searchParams.get('redirect') || '/'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const { error } = await signIn(email, password)
    if (error) setError(error)
    else navigate(redirectTo)
    setLoading(false)
  }

  async function handleGoogleSignIn() {
    setGoogleLoading(true)
    setError(null)
    try {
      if (redirectTo !== '/') {
        sessionStorage.setItem('redirect_after_login', redirectTo)
      }
      await signInWithGoogle()
    } catch (err: any) {
      setError(err.message || 'Erro ao entrar com Google')
      setGoogleLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#0a0e17] via-[#0f1420] to-[#0a0e17] px-4 relative overflow-hidden">
      {/* stadium glow effects */}
      <div className="fixed inset-0 pointer-events-none opacity-30"
        style={{ background: 'radial-gradient(ellipse at 30% 50%, rgba(34,197,94,0.12) 0%, transparent 60%), radial-gradient(ellipse at 70% 20%, rgba(234,179,8,0.06) 0%, transparent 50%), radial-gradient(ellipse at 50% 80%, rgba(34,197,94,0.08) 0%, transparent 50%)' }} />

      <div className="relative w-full max-w-md">
        {/* logo section */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-yellow-400 to-amber-600 shadow-lg shadow-yellow-500/25 mb-4">
            <Swords size={30} className="text-[#0a0e17]" />
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">PeladaFC</h1>
          <p className="text-gray-500 text-sm mt-1 font-medium">Entre na sua conta</p>
        </div>

        {/* login card */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#1a2332]/80 via-[#0f1722]/80 to-[#0a0f18]/80 backdrop-blur-xl border border-white/[0.06] shadow-[0_0_40px_rgba(0,0,0,0.4)] p-8">
          <div className="absolute -top-20 -right-20 w-40 h-40 bg-gradient-to-br from-yellow-500/8 to-transparent rounded-full blur-3xl" />
          <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-gradient-to-br from-emerald-500/8 to-transparent rounded-full blur-3xl" />
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-yellow-500/20 to-transparent" />

          {error && (
            <div className="relative mb-5 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-medium">
              {error}
            </div>
          )}

          {/* google button */}
          <div className="relative mb-5">
            <button onClick={handleGoogleSignIn} disabled={googleLoading}
              className="w-full bg-white/[0.06] text-white/80 py-3 rounded-xl hover:bg-white/[0.10] transition-all duration-200 text-sm font-bold flex items-center justify-center gap-3 border border-white/[0.08] backdrop-blur-sm disabled:opacity-50">
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              {googleLoading ? 'Entrando...' : 'Entrar com Google'}
            </button>
          </div>

          {/* divider */}
          <div className="relative mb-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/[0.06]" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-[#0f1722]/80 px-3 text-gray-600 font-bold uppercase tracking-wider">ou email</span>
            </div>
          </div>

          {/* form */}
          <form onSubmit={handleSubmit} className="relative space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                required
                className="w-full px-4 py-2.5 bg-white/[0.05] border border-white/[0.08] rounded-xl text-white placeholder-gray-600 focus:ring-2 focus:ring-yellow-500/40 focus:border-yellow-500/40 outline-none transition-all text-sm" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Senha</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                required
                className="w-full px-4 py-2.5 bg-white/[0.05] border border-white/[0.08] rounded-xl text-white placeholder-gray-600 focus:ring-2 focus:ring-yellow-500/40 focus:border-yellow-500/40 outline-none transition-all text-sm" />
            </div>
            <button type="submit" disabled={loading}
              className="w-full bg-gradient-to-r from-yellow-500 to-amber-600 text-[#0a0e17] py-3 rounded-xl font-black text-sm hover:from-yellow-400 hover:to-amber-500 transition-all duration-200 shadow-lg shadow-yellow-500/25 disabled:opacity-50">
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>

          {/* links */}
          <div className="relative mt-6 text-center space-y-2">
            <Link to="/register" className="block text-sm text-yellow-500/80 hover:text-yellow-400 transition-colors font-bold">
              Criar conta
            </Link>
            <Link to="/forgot-password" className="block text-sm text-gray-600 hover:text-gray-400 transition-colors">
              Esqueceu a senha?
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export function RegisterPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [weight, setWeight] = useState('')
  const [dominantFoot, setDominantFoot] = useState('')
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const { signUp } = useAuth()

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 1 * 1024 * 1024) {
      setError('A imagem deve ter no máximo 1MB')
      return
    }
    setError(null)
    setAvatarFile(file)
    const reader = new FileReader()
    reader.onload = () => setAvatarPreview(reader.result as string)
    reader.readAsDataURL(file)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      if (password !== confirmPassword) {
        setError('As senhas não conferem')
        setLoading(false)
        return
      }

      const { data: existingUser } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email)
        .maybeSingle()

      if (existingUser) {
        setError('Este email já está cadastrado')
        setLoading(false)
        return
      }

      let avatarUrl: string | undefined

      if (avatarFile) {
        const tempId = crypto.randomUUID()
        avatarUrl = await uploadAvatar(avatarFile, tempId)
      }

      const { error } = await signUp(email, password, name, avatarUrl, birthDate || undefined, weight ? Number(weight) : undefined, dominantFoot || undefined)
      if (error) setError(error)
      else setSuccess(true)
    } catch (err: any) {
      setError(err.message || 'Erro ao criar conta')
    }
    setLoading(false)
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#0a0e17] via-[#0f1420] to-[#0a0e17] px-4 relative overflow-hidden">
        <div className="fixed inset-0 pointer-events-none opacity-30"
          style={{ background: 'radial-gradient(ellipse at 30% 50%, rgba(34,197,94,0.12) 0%, transparent 60%), radial-gradient(ellipse at 70% 20%, rgba(234,179,8,0.06) 0%, transparent 50%), radial-gradient(ellipse at 50% 80%, rgba(34,197,94,0.08) 0%, transparent 50%)' }} />
        <div className="relative max-w-md w-full">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#1a2332]/80 via-[#0f1722]/80 to-[#0a0f18]/80 backdrop-blur-xl border border-white/[0.06] shadow-[0_0_40px_rgba(0,0,0,0.4)] p-8 text-center">
            <div className="absolute -top-20 -right-20 w-40 h-40 bg-gradient-to-br from-yellow-500/8 to-transparent rounded-full blur-3xl" />
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-yellow-500/20 to-transparent" />
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-yellow-400 to-amber-600 shadow-lg shadow-yellow-500/25 mb-4">
              <Swords size={30} className="text-[#0a0e17]" />
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight mb-4">Conta criada!</h1>
            <p className="text-gray-400 mb-6">Enviamos um email de confirmação para {email}. Verifique sua caixa de entrada.</p>
            <Link to="/login" className="inline-block text-yellow-500/80 hover:text-yellow-400 transition-colors font-bold">Ir para o login</Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#0a0e17] via-[#0f1420] to-[#0a0e17] px-4 relative overflow-hidden">
      <div className="fixed inset-0 pointer-events-none opacity-30"
        style={{ background: 'radial-gradient(ellipse at 30% 50%, rgba(34,197,94,0.12) 0%, transparent 60%), radial-gradient(ellipse at 70% 20%, rgba(234,179,8,0.06) 0%, transparent 50%), radial-gradient(ellipse at 50% 80%, rgba(34,197,94,0.08) 0%, transparent 50%)' }} />

      <div className="relative w-full max-w-md">
        {/* logo section */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-yellow-400 to-amber-600 shadow-lg shadow-yellow-500/25 mb-4">
            <Swords size={30} className="text-[#0a0e17]" />
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">PeladaFC</h1>
          <p className="text-gray-500 text-sm mt-1 font-medium">Crie sua conta</p>
        </div>

        {/* register card */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#1a2332]/80 via-[#0f1722]/80 to-[#0a0f18]/80 backdrop-blur-xl border border-white/[0.06] shadow-[0_0_40px_rgba(0,0,0,0.4)] p-8">
          <div className="absolute -top-20 -right-20 w-40 h-40 bg-gradient-to-br from-yellow-500/8 to-transparent rounded-full blur-3xl" />
          <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-gradient-to-br from-emerald-500/8 to-transparent rounded-full blur-3xl" />
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-yellow-500/20 to-transparent" />

          {error && (
            <div className="relative mb-5 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="relative space-y-4">
            {/* avatar */}
            <div className="flex flex-col items-center">
              <button type="button" onClick={() => fileRef.current?.click()}
                className="relative w-24 h-24 rounded-full overflow-hidden border-2 border-dashed border-white/[0.12] hover:border-yellow-500/40 transition flex items-center justify-center bg-white/[0.03]">
                {avatarPreview ? (
                  <img src={avatarPreview} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-3xl text-gray-600">+</span>
                )}
              </button>
              <span className="text-xs text-gray-600 mt-1">Foto de perfil (opcional, até 1MB)</span>
              <input ref={fileRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Nome</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)}
                required
                className="w-full px-4 py-2.5 bg-white/[0.05] border border-white/[0.08] rounded-xl text-white placeholder-gray-600 focus:ring-2 focus:ring-yellow-500/40 focus:border-yellow-500/40 outline-none transition-all text-sm" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                required
                className="w-full px-4 py-2.5 bg-white/[0.05] border border-white/[0.08] rounded-xl text-white placeholder-gray-600 focus:ring-2 focus:ring-yellow-500/40 focus:border-yellow-500/40 outline-none transition-all text-sm" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Senha</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                required minLength={6}
                className="w-full px-4 py-2.5 bg-white/[0.05] border border-white/[0.08] rounded-xl text-white placeholder-gray-600 focus:ring-2 focus:ring-yellow-500/40 focus:border-yellow-500/40 outline-none transition-all text-sm" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Confirmar Senha</label>
              <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                required minLength={6}
                className="w-full px-4 py-2.5 bg-white/[0.05] border border-white/[0.08] rounded-xl text-white placeholder-gray-600 focus:ring-2 focus:ring-yellow-500/40 focus:border-yellow-500/40 outline-none transition-all text-sm" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Data de Nascimento</label>
              <input type="date" value={birthDate} onChange={e => setBirthDate(e.target.value)}
                className="w-full px-4 py-2.5 bg-white/[0.05] border border-white/[0.08] rounded-xl text-white placeholder-gray-600 focus:ring-2 focus:ring-yellow-500/40 focus:border-yellow-500/40 outline-none transition-all text-sm [color-scheme:dark]" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Peso (kg)</label>
              <input type="number" value={weight} onChange={e => setWeight(e.target.value)}
                step="0.1" min="0" max="300" placeholder="Ex: 75.5"
                className="w-full px-4 py-2.5 bg-white/[0.05] border border-white/[0.08] rounded-xl text-white placeholder-gray-600 focus:ring-2 focus:ring-yellow-500/40 focus:border-yellow-500/40 outline-none transition-all text-sm" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Pé Dominante</label>
              <select value={dominantFoot} onChange={e => setDominantFoot(e.target.value)}
                className="w-full px-4 py-2.5 bg-white/[0.05] border border-white/[0.08] rounded-xl text-white placeholder-gray-600 focus:ring-2 focus:ring-yellow-500/40 focus:border-yellow-500/40 outline-none transition-all text-sm">
                <option value="" className="bg-[#0f1722]">Selecione</option>
                {Object.entries(DOMINANT_FOOT_LABELS).map(([value, label]) => (
                  <option key={value} value={value} className="bg-[#0f1722]">{label}</option>
                ))}
              </select>
            </div>
            <button type="submit" disabled={loading}
              className="w-full bg-gradient-to-r from-yellow-500 to-amber-600 text-[#0a0e17] py-3 rounded-xl font-black text-sm hover:from-yellow-400 hover:to-amber-500 transition-all duration-200 shadow-lg shadow-yellow-500/25 disabled:opacity-50">
              {loading ? 'Criando...' : 'Criar conta'}
            </button>
          </form>

          {/* link */}
          <div className="relative mt-6 text-center">
            <Link to="/login" className="text-sm text-yellow-500/80 hover:text-yellow-400 transition-colors font-bold">
              Já tem conta? Entre
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export function AuthCallbackPage() {
  const navigate = useNavigate()

  useEffect(() => {
    const target = sessionStorage.getItem('redirect_after_login') || '/'
    sessionStorage.removeItem('redirect_after_login')

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) navigate(target, { replace: true })
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') navigate(target, { replace: true })
    })

    return () => subscription.unsubscribe()
  }, [navigate])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#0a0e17] via-[#0f1420] to-[#0a0e17] px-4 relative overflow-hidden">
      <div className="fixed inset-0 pointer-events-none opacity-30"
        style={{ background: 'radial-gradient(ellipse at 30% 50%, rgba(34,197,94,0.12) 0%, transparent 60%), radial-gradient(ellipse at 70% 20%, rgba(234,179,8,0.06) 0%, transparent 50%), radial-gradient(ellipse at 50% 80%, rgba(34,197,94,0.08) 0%, transparent 50%)' }} />
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-400">Completando login...</p>
      </div>
    </div>
  )
}

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const { resetPassword } = useAuth()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    await resetPassword(email)
    setSent(true)
    setLoading(false)
  }

  if (sent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#0a0e17] via-[#0f1420] to-[#0a0e17] px-4 relative overflow-hidden">
        <div className="fixed inset-0 pointer-events-none opacity-30"
          style={{ background: 'radial-gradient(ellipse at 30% 50%, rgba(34,197,94,0.12) 0%, transparent 60%), radial-gradient(ellipse at 70% 20%, rgba(234,179,8,0.06) 0%, transparent 50%), radial-gradient(ellipse at 50% 80%, rgba(34,197,94,0.08) 0%, transparent 50%)' }} />
        <div className="relative max-w-md w-full">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#1a2332]/80 via-[#0f1722]/80 to-[#0a0f18]/80 backdrop-blur-xl border border-white/[0.06] shadow-[0_0_40px_rgba(0,0,0,0.4)] p-8 text-center">
            <div className="absolute -top-20 -right-20 w-40 h-40 bg-gradient-to-br from-yellow-500/8 to-transparent rounded-full blur-3xl" />
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-yellow-500/20 to-transparent" />
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-yellow-400 to-amber-600 shadow-lg shadow-yellow-500/25 mb-4">
              <Swords size={30} className="text-[#0a0e17]" />
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight mb-4">Email enviado!</h1>
            <p className="text-gray-400 mb-6">Verifique sua caixa de entrada para redefinir sua senha.</p>
            <Link to="/login" className="inline-block text-yellow-500/80 hover:text-yellow-400 transition-colors font-bold">Voltar ao login</Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#0a0e17] via-[#0f1420] to-[#0a0e17] px-4 relative overflow-hidden">
      <div className="fixed inset-0 pointer-events-none opacity-30"
        style={{ background: 'radial-gradient(ellipse at 30% 50%, rgba(34,197,94,0.12) 0%, transparent 60%), radial-gradient(ellipse at 70% 20%, rgba(234,179,8,0.06) 0%, transparent 50%), radial-gradient(ellipse at 50% 80%, rgba(34,197,94,0.08) 0%, transparent 50%)' }} />

      <div className="relative w-full max-w-md">
        {/* logo section */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-yellow-400 to-amber-600 shadow-lg shadow-yellow-500/25 mb-4">
            <Swords size={30} className="text-[#0a0e17]" />
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">PeladaFC</h1>
          <p className="text-gray-500 text-sm mt-1 font-medium">Recuperar senha</p>
        </div>

        {/* forgot password card */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#1a2332]/80 via-[#0f1722]/80 to-[#0a0f18]/80 backdrop-blur-xl border border-white/[0.06] shadow-[0_0_40px_rgba(0,0,0,0.4)] p-8">
          <div className="absolute -top-20 -right-20 w-40 h-40 bg-gradient-to-br from-yellow-500/8 to-transparent rounded-full blur-3xl" />
          <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-gradient-to-br from-emerald-500/8 to-transparent rounded-full blur-3xl" />
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-yellow-500/20 to-transparent" />

          <form onSubmit={handleSubmit} className="relative space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                required
                className="w-full px-4 py-2.5 bg-white/[0.05] border border-white/[0.08] rounded-xl text-white placeholder-gray-600 focus:ring-2 focus:ring-yellow-500/40 focus:border-yellow-500/40 outline-none transition-all text-sm" />
            </div>
            <button type="submit" disabled={loading}
              className="w-full bg-gradient-to-r from-yellow-500 to-amber-600 text-[#0a0e17] py-3 rounded-xl font-black text-sm hover:from-yellow-400 hover:to-amber-500 transition-all duration-200 shadow-lg shadow-yellow-500/25 disabled:opacity-50">
              {loading ? 'Enviando...' : 'Enviar link de recuperação'}
            </button>
          </form>

          <div className="relative mt-6 text-center">
            <Link to="/login" className="text-sm text-yellow-500/80 hover:text-yellow-400 transition-colors font-bold">Voltar ao login</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
