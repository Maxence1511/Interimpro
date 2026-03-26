'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const nav = [
  { href: '/dashboard', label: 'Tableau de bord', icon: '📊', exact: true },
  { href: '/dashboard/missions', label: 'Missions', icon: '📋' },
  { href: '/dashboard/etablissements', label: 'Établissements', icon: '🏥' },
  { href: '/dashboard/calendrier', label: 'Calendrier', icon: '📅' },
  { href: '/dashboard/analyses', label: 'Analyses', icon: '📈' },
  { href: '/dashboard/parametres', label: 'Paramètres', icon: '⚙️' },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null)
  const [collapsed, setCollapsed] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) { router.push('/auth/login'); return }
      setUser(data.user)
    })
  }, [])

  const logout = async () => { await supabase.auth.signOut(); router.push('/') }

  const isActive = (item: typeof nav[0]) =>
    item.exact ? pathname === item.href : pathname.startsWith(item.href)

  const sidebarW = collapsed ? 64 : 240

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-primary)' }}>
      {/* SIDEBAR */}
      <aside style={{ width: sidebarW, minWidth: sidebarW, background: 'var(--bg-sidebar)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', position: 'sticky', top: 0, height: '100vh', transition: 'width 0.2s', overflow: 'hidden' }}>
        {/* Logo */}
        <div style={{ padding: '20px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '36px', height: '36px', minWidth: 36, borderRadius: '10px', background: 'var(--accent-light)', border: '1px solid rgba(232,123,249,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6V4a2 2 0 0 0-2-2h-1a.2.2 0 1 0 .3.3"/>
              <path d="M8 15v1a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6v-4"/>
              <circle cx="20" cy="10" r="2"/>
            </svg>
          </div>
          {!collapsed && <span style={{ fontWeight: 700, fontSize: '15px', color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>InterimPro</span>}
        </div>

        {/* Nav links */}
        <nav style={{ flex: 1, padding: '12px 8px', display: 'flex', flexDirection: 'column', gap: '2px', overflowY: 'auto' }}>
          {nav.map(item => {
            const active = isActive(item)
            return (
              <Link key={item.href} href={item.href} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 12px', borderRadius: '8px', textDecoration: 'none', background: active ? 'var(--accent)' : 'transparent', color: active ? 'white' : 'var(--text-secondary)', fontWeight: active ? 600 : 400, fontSize: '14px', whiteSpace: 'nowrap', overflow: 'hidden', transition: 'all 0.15s' }}>
                <span style={{ fontSize: '16px', minWidth: 20, textAlign: 'center' }}>{item.icon}</span>
                {!collapsed && item.label}
              </Link>
            )
          })}
        </nav>

        {/* User + logout */}
        <div style={{ padding: '12px 8px', borderTop: '1px solid var(--border)' }}>
          {!collapsed && user && (
            <div style={{ padding: '10px 12px', borderRadius: '8px', background: 'white', border: '1px solid var(--border)', marginBottom: '6px' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.user_metadata?.full_name || user.email?.split('@')[0]}</div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.email}</div>
            </div>
          )}
          <button onClick={logout} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 12px', borderRadius: '8px', border: 'none', background: 'transparent', color: '#ef4444', cursor: 'pointer', fontSize: '14px' }}>
            <span style={{ fontSize: '16px', minWidth: 20, textAlign: 'center' }}>🚪</span>
            {!collapsed && 'Déconnexion'}
          </button>
        </div>
      </aside>

      {/* MAIN */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Topbar */}
        <div style={{ height: '56px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', padding: '0 24px', gap: '16px', background: 'white', position: 'sticky', top: 0, zIndex: 10 }}>
          <button onClick={() => setCollapsed(!collapsed)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: '18px', padding: '4px', borderRadius: '6px', lineHeight: 1 }}>☰</button>
          <div style={{ flex: 1 }} />
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </div>
          {user?.user_metadata?.avatar_url && (
            <img src={user.user_metadata.avatar_url} style={{ width: 32, height: 32, borderRadius: '50%', border: '2px solid var(--accent)' }} alt="" />
          )}
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
          {children}
        </div>
      </main>
    </div>
  )
}
