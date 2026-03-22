'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { LayoutDashboard, Briefcase, Building2, Calendar, BarChart3, Settings, RefreshCw, User, LogOut, Bell } from 'lucide-react'
import { COULEURS_THEME } from '@/lib/types'
import { getAlertes } from '@/lib/utils'
import { Mission } from '@/lib/types'

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Tableau de bord' },
  { href: '/dashboard/missions', icon: Briefcase, label: 'Missions' },
  { href: '/dashboard/etablissements', icon: Building2, label: 'Établissements' },
  { href: '/dashboard/calendrier', icon: Calendar, label: 'Calendrier' },
  { href: '/dashboard/analyses', icon: BarChart3, label: 'Analyses' },
]

const navBottom = [
  { href: '/dashboard/import', icon: RefreshCw, label: 'Import Google' },
  { href: '/dashboard/parametres', icon: Settings, label: 'Paramètres' },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const router = useRouter()
  const pathname = usePathname()
  const [firstName, setFirstName] = useState('')
  const [theme, setTheme] = useState('teal')
  const [darkMode, setDarkMode] = useState(true)
  const [alertes, setAlertes] = useState<any[]>([])
  const [showNotifs, setShowNotifs] = useState(false)
  const [time, setTime] = useState(new Date())

  useEffect(() => {
    loadUserData()
    const timer = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  async function loadUserData() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const [{ data: profile }, { data: prefs }, { data: missions }] = await Promise.all([
      supabase.from('user_profiles').select('first_name').eq('id', user.id).single(),
      supabase.from('user_preferences').select('*').eq('id', user.id).single(),
      supabase.from('missions').select('*').eq('user_id', user.id),
    ])

    if (profile?.first_name) setFirstName(profile.first_name)
    if (prefs) {
      setTheme(prefs.couleur_theme)
      setDarkMode(prefs.mode_sombre)
      applyTheme(prefs.couleur_theme, prefs.mode_sombre)
    }
    if (missions) setAlertes(getAlertes(missions))
  }

  function applyTheme(couleur: string, dark: boolean) {
    const root = document.documentElement
    const accent = COULEURS_THEME[couleur] || COULEURS_THEME.teal
    root.style.setProperty('--accent', accent)
    root.style.setProperty('--accent-hover', accent + 'cc')
    if (!dark) root.classList.add('light')
    else root.classList.remove('light')
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  const urgentes = alertes.filter(a => a.type === 'urgent').length
  const warnings = alertes.filter(a => a.type === 'warning').length
  const badgeCount = urgentes + warnings

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--bg-primary)' }}>
      {/* Sidebar */}
      <aside className="sidebar w-64 flex flex-col flex-shrink-0 h-full" style={{ borderRight: '1px solid var(--border)' }}>
        {/* Logo */}
        <Link href="/dashboard" className="flex items-center gap-3 px-5 py-5 hover:opacity-80 transition-opacity">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'var(--accent)' }}>
            <svg viewBox="0 0 24 24" className="w-5 h-5 text-white" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 2c4.42 0 8 3.58 8 8s-3.58 8-8 8-8-3.58-8-8 3.58-8 8-8zm-1 4v3H8v2h3v3h2v-3h3v-2h-3V8h-2z"/>
            </svg>
          </div>
          <div>
            <div className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>InterimPro</div>
            <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>Intérimaire simplifiée</div>
          </div>
        </Link>

        {/* Nav principale */}
        <nav className="flex-1 px-3 py-2 space-y-0.5">
          {navItems.map(({ href, icon: Icon, label }) => {
            const active = pathname === href
            return (
              <Link key={href} href={href} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${active ? 'nav-active' : 'hover:opacity-70'}`}
                style={{ color: active ? 'var(--accent)' : 'var(--text-secondary)' }}>
                <Icon size={18} />
                {label}
              </Link>
            )
          })}
        </nav>

        {/* Nav bas */}
        <div className="px-3 py-2 space-y-0.5" style={{ borderTop: '1px solid var(--border)' }}>
          {navBottom.map(({ href, icon: Icon, label }) => {
            const active = pathname === href
            return (
              <Link key={href} href={href} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${active ? 'nav-active' : 'hover:opacity-70'}`}
                style={{ color: active ? 'var(--accent)' : 'var(--text-secondary)' }}>
                <Icon size={18} />
                {label}
              </Link>
            )
          })}
        </div>

        {/* Profil utilisateur */}
        <div className="px-4 py-4 space-y-3" style={{ borderTop: '1px solid var(--border)' }}>
          {firstName && (
            <p className="text-center text-base font-semibold" style={{ color: 'var(--accent)' }}>
              Bonjour, {firstName} 👋
            </p>
          )}
          <Link href="/dashboard/mon-compte" className="flex items-center gap-3 px-3 py-2 rounded-xl hover:opacity-70 transition-opacity">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0" style={{ background: 'var(--accent)' }}>
              {firstName ? firstName[0].toUpperCase() : '?'}
            </div>
            <div>
              <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Mon Compte</p>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Voir le profil</p>
            </div>
          </Link>
          <button onClick={handleLogout} className="flex items-center gap-2 px-3 py-1.5 text-xs w-full rounded-lg hover:opacity-70 transition-opacity" style={{ color: '#ef4444' }}>
            <LogOut size={14} />
            Déconnexion
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <header className="flex items-center justify-between px-6 py-3 flex-shrink-0" style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
          <div />
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-lg font-bold tabular-nums" style={{ color: 'var(--text-primary)' }}>
                {time.toLocaleTimeString('fr-FR')}
              </div>
              <div className="text-xs capitalize" style={{ color: 'var(--text-secondary)' }}>
                {time.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
              </div>
            </div>
            <div className="relative">
              <button onClick={() => setShowNotifs(!showNotifs)} className="relative p-2 rounded-xl hover:opacity-70 transition-opacity" style={{ border: '1px solid var(--border)' }}>
                <Bell size={18} style={{ color: 'var(--text-secondary)' }} />
                {badgeCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full text-xs font-bold text-white flex items-center justify-center" style={{ background: urgentes > 0 ? '#ef4444' : '#f59e0b' }}>
                    {badgeCount}
                  </span>
                )}
              </button>
              {showNotifs && (
                <div className="absolute right-0 top-12 w-80 rounded-xl shadow-xl z-50 overflow-hidden" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
                  <div className="p-3 font-medium text-sm" style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-primary)' }}>
                    Alertes ({alertes.length})
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {alertes.length === 0 ? (
                      <p className="p-4 text-sm text-center" style={{ color: 'var(--text-secondary)' }}>Aucune alerte</p>
                    ) : alertes.map(a => (
                      <div key={a.id} className="p-3 text-xs" style={{ borderBottom: '1px solid var(--border)', color: a.type === 'urgent' ? '#ef4444' : a.type === 'warning' ? '#f59e0b' : 'var(--text-secondary)' }}>
                        {a.message}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
