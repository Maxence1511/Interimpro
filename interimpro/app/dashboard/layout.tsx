'use client'
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useTheme } from '@/lib/theme-context'

type Mission = { id:string; titre:string; etablissement_id:string; date_debut:string; statut:string; contrat_signe:boolean; fiche_paie_recue:boolean; salaire_recu:boolean }
type Etab = { id:string; nom:string }

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Tableau de bord', exact: true, icon: 'grid' },
  { href: '/dashboard/missions', label: 'Missions', icon: 'check-square' },
  { href: '/dashboard/etablissements', label: 'Établissements', icon: 'home' },
  { href: '/dashboard/calendrier', label: 'Calendrier', icon: 'calendar' },
  { href: '/dashboard/analyses', label: 'Analyses', icon: 'bar-chart' },
  { href: '/dashboard/import-gcal', label: 'Import Google', icon: 'calendar-sync' },
]

function Icon({ name, size=16 }: { name:string; size?:number }) {
  const s = { width:size, height:size }
  const icons: Record<string, React.ReactNode> = {
    'grid': <svg {...s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>,
    'check-square': <svg {...s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>,
    'home': <svg {...s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
    'calendar': <svg {...s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
    'bar-chart': <svg {...s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/></svg>,
    'calendar-sync': <svg {...s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><path d="m9 16 2 2 4-4"/></svg>,
    'user': <svg {...s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
    'settings': <svg {...s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
    'logout': <svg {...s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
    'bell': <svg {...s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>,
    'file': <svg {...s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>,
    'card': <svg {...s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>,
    'euro': <svg {...s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 10h12M4 14h12M19.5 5a9 9 0 1 0 0 14"/></svg>,
  }
  return <>{icons[name] || null}</>
}

function MonCompteModal({ user, onClose }: { user:any; onClose:()=>void }) {
  const supabase = createClient()
  const { accent } = useTheme()
  const [form, setForm] = useState({ first_name:'', last_name:'', telephone:'', specialite:'Infirmier(e)', numero_rpps:'' })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const SPECS = ['Infirmier(e)','Aide-soignant(e)','Infirmier(e) spécialisé(e)','Cadre de santé','Puériculteur(trice)','IBODE','IADE','Autre']
  const inp: React.CSSProperties = { width:'100%', padding:'8px 11px', borderRadius:7, border:'1px solid var(--border)', background:'var(--bg-input)', color:'var(--text)', fontSize:13, outline:'none', boxSizing:'border-box' }

  useEffect(() => {
    supabase.from('user_profiles').select('*').eq('user_id', user.id).single().then(({ data }) => {
      if (data) setForm({ first_name: data.first_name||'', last_name: data.last_name||'', telephone: data.telephone||'', specialite: data.specialite||'Infirmier(e)', numero_rpps: data.numero_rpps||'' })
    })
  }, [])

  const save = async () => {
    setSaving(true)
    const payload = { ...form, user_id: user.id, nom_complet: `${form.first_name} ${form.last_name}` }
    const { data: ex } = await supabase.from('user_profiles').select('id').eq('user_id', user.id).single()
    if (ex) await supabase.from('user_profiles').update(payload).eq('user_id', user.id)
    else await supabase.from('user_profiles').insert({ ...payload, id: user.id })
    setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.65)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }} onClick={e => e.target===e.currentTarget && onClose()}>
      <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:14, padding:28, width:'100%', maxWidth:440, boxShadow:'0 24px 60px rgba(0,0,0,.6)' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
          <h2 style={{ fontSize:17, fontWeight:700, color:'var(--text)' }}>Mon compte</h2>
          <button onClick={onClose} style={{ background:'none', border:'none', color:'var(--text-dim)', cursor:'pointer', fontSize:20 }}>✕</button>
        </div>
        <div style={{ textAlign:'center', marginBottom:18 }}>
          {user?.user_metadata?.avatar_url
            ? <img src={user.user_metadata.avatar_url} style={{ width:72, height:72, borderRadius:'50%', border:'2px solid var(--border)' }} alt="" />
            : <div style={{ width:72, height:72, borderRadius:'50%', background:'var(--bg-input)', border:'2px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto' }}>
                <Icon name="user" size={32} />
              </div>
          }
          <div style={{ fontSize:11, color:'var(--accent)', marginTop:6, cursor:'pointer' }}>⬆ Changer la photo</div>
        </div>
        <div style={{ background:'var(--bg-input)', borderRadius:7, padding:'8px 11px', marginBottom:12, display:'flex', justifyContent:'space-between' }}>
          <span style={{ fontSize:13, color:'var(--text-muted)' }}>Email</span>
          <span style={{ fontSize:13, color:'var(--text-dim)' }}>{user?.email || '—'}</span>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:10 }}>
          <div><label style={{ display:'block', fontSize:11, color:'var(--text-muted)', marginBottom:4 }}>Prénom *</label><input value={form.first_name} onChange={e=>setForm({...form,first_name:e.target.value})} style={inp}/></div>
          <div><label style={{ display:'block', fontSize:11, color:'var(--text-muted)', marginBottom:4 }}>Nom *</label><input value={form.last_name} onChange={e=>setForm({...form,last_name:e.target.value})} style={inp}/></div>
        </div>
        <div style={{ marginBottom:10 }}><label style={{ display:'block', fontSize:11, color:'var(--text-muted)', marginBottom:4 }}>Téléphone</label><input value={form.telephone} onChange={e=>setForm({...form,telephone:e.target.value})} placeholder="06 12 34 56 78" style={inp}/></div>
        <div style={{ marginBottom:10 }}><label style={{ display:'block', fontSize:11, color:'var(--text-muted)', marginBottom:4 }}>Spécialité</label><select value={form.specialite} onChange={e=>setForm({...form,specialite:e.target.value})} style={inp}>{SPECS.map(s=><option key={s}>{s}</option>)}</select></div>
        <div style={{ marginBottom:18 }}><label style={{ display:'block', fontSize:11, color:'var(--text-muted)', marginBottom:4 }}>Numéro RPPS</label><input value={form.numero_rpps} onChange={e=>setForm({...form,numero_rpps:e.target.value})} style={inp}/></div>
        {saved && <div style={{ padding:'8px 12px', borderRadius:7, background:'rgba(16,185,129,.1)', border:'1px solid rgba(16,185,129,.3)', fontSize:13, color:'#10b981', marginBottom:12 }}>✅ Enregistré !</div>}
        <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
          <button onClick={onClose} style={{ padding:'9px 18px', borderRadius:8, border:'1px solid var(--border)', background:'transparent', color:'var(--text-muted)', cursor:'pointer', fontSize:13 }}>Annuler</button>
          <button onClick={save} disabled={saving} style={{ padding:'9px 20px', borderRadius:8, border:'none', background:`linear-gradient(135deg,${accent},#a855f7)`, color:'white', cursor:'pointer', fontSize:13, fontWeight:700 }}>{saving ? '...' : 'Enregistrer'}</button>
        </div>
      </div>
    </div>
  )
}

function NotifDropdown({ missions, etabs, onClose }: { missions:Mission[]; etabs:Etab[]; onClose:()=>void }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose() }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const incomplete = missions.filter(m => m.statut==='passee' && (!m.contrat_signe || !m.fiche_paie_recue || !m.salaire_recu))
  const getEtab = (id:string) => etabs.find(e=>e.id===id)

  return (
    <div ref={ref} style={{ position:'absolute', top:'calc(100% + 8px)', right:0, width:340, background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:12, boxShadow:'0 16px 48px rgba(0,0,0,.4)', zIndex:200, overflow:'hidden' }}>
      <div style={{ padding:'12px 16px', borderBottom:'1px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <span style={{ fontSize:14, fontWeight:700, color:'var(--text)' }}>Notifications</span>
        <span style={{ fontSize:11, color:'var(--text-dim)' }}>{incomplete.length} en attente</span>
      </div>
      <div style={{ maxHeight:320, overflowY:'auto' }}>
        {incomplete.length === 0 ? (
          <div style={{ padding:24, textAlign:'center', color:'var(--text-dim)', fontSize:13 }}>
            <div style={{ fontSize:24, marginBottom:8 }}>✅</div>
            Tous les documents sont à jour !
          </div>
        ) : incomplete.map(m => {
          const etab = getEtab(m.etablissement_id)
          const missing = [
            !m.contrat_signe && 'Contrat',
            !m.fiche_paie_recue && 'Fiche de paie',
            !m.salaire_recu && 'Salaire',
          ].filter(Boolean)
          return (
            <div key={m.id} style={{ padding:'10px 16px', borderBottom:'1px solid var(--border)', display:'flex', gap:10, alignItems:'flex-start' }}>
              <div style={{ width:8, height:8, borderRadius:'50%', background:'#f59e0b', marginTop:4, flexShrink:0 }} />
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:13, fontWeight:600, color:'var(--text)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{m.titre} — {etab?.nom}</div>
                <div style={{ fontSize:11, color:'var(--text-dim)', marginTop:2 }}>{new Date(m.date_debut).toLocaleDateString('fr-FR')}</div>
                <div style={{ display:'flex', gap:5, marginTop:4, flexWrap:'wrap' }}>
                  {(missing as string[]).map(d => (
                    <span key={d} style={{ padding:'1px 7px', borderRadius:100, fontSize:10, background:'rgba(245,158,11,.12)', color:'#f59e0b', border:'1px solid rgba(245,158,11,.25)', fontWeight:600 }}>{d} manquant</span>
                  ))}
                </div>
              </div>
            </div>
          )
        })}
      </div>
      {incomplete.length > 0 && (
        <div style={{ padding:'10px 16px', borderTop:'1px solid var(--border)' }}>
          <Link href="/dashboard/missions?tab=passee" onClick={onClose} style={{ fontSize:12, color:'var(--accent)', textDecoration:'none', fontWeight:600 }}>Voir toutes les missions → </Link>
        </div>
      )}
    </div>
  )
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null)
  const [ready, setReady] = useState(false)
  const [showCompte, setShowCompte] = useState(false)
  const [showNotif, setShowNotif] = useState(false)
  const [missions, setMissions] = useState<Mission[]>([])
  const [etabs, setEtabs] = useState<Etab[]>([])
  const [time, setTime] = useState('')
  const [dateStr, setDateStr] = useState('')
  const pathname = usePathname()
  const supabase = createClient()
  const { accent, darkMode } = useTheme()

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session?.user) {
        setUser(session.user)
        setReady(true)
        // Charger les missions pour notifications
        supabase.from('missions').select('id,titre,etablissement_id,date_debut,statut,contrat_signe,fiche_paie_recue,salaire_recu').then(({ data }) => setMissions((data||[]) as Mission[]))
        supabase.from('etablissements').select('id,nom').then(({ data }) => setEtabs((data||[]) as Etab[]))
      } else { setReady(true); window.location.href = '/' }
    })
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    const tick = () => {
      const n = new Date()
      setTime(n.toLocaleTimeString('fr-FR', { hour:'2-digit', minute:'2-digit', second:'2-digit' }))
      setDateStr(n.toLocaleDateString('fr-FR', { weekday:'long', day:'numeric', month:'long', year:'numeric' }))
    }
    tick(); const id = setInterval(tick, 1000); return () => clearInterval(id)
  }, [])

  const logout = async () => { await supabase.auth.signOut(); window.location.href = '/' }
  const isActive = (item: typeof NAV_ITEMS[0]) => item.exact ? pathname === item.href : pathname.startsWith(item.href)
  const firstName = user?.user_metadata?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || ''
  const notifCount = missions.filter(m => m.statut==='passee' && (!m.contrat_signe || !m.fiche_paie_recue || !m.salaire_recu)).length
  const isParamsActive = pathname === '/dashboard/parametres'

  if (!ready || !user) return (
    <div style={{ minHeight:'100vh', background:'var(--bg)', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ width:36, height:36, borderRadius:'50%', border:'3px solid var(--accent-dim)', borderTop:'3px solid var(--accent)', animation:'spin .8s linear infinite' }} />
    </div>
  )

  return (
    <div style={{ display:'flex', minHeight:'100vh', background:'var(--bg)' }}>
      {/* SIDEBAR */}
      <aside style={{ width:188, minWidth:188, background:'var(--sidebar-bg)', borderRight:'1px solid var(--topbar-border)', display:'flex', flexDirection:'column', position:'sticky', top:0, height:'100vh', zIndex:20 }}>
        <div style={{ padding:'14px 14px', borderBottom:'1px solid var(--topbar-border)', display:'flex', alignItems:'center', gap:8 }}>
          <div style={{ width:30, height:30, minWidth:30, borderRadius:8, background:'var(--accent-dim)', border:'1px solid var(--accent-border)', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke={accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 6 6a6 6 0 0 0 6-6V4a2 2 0 0 0-2-2h-1a.2.2 0 1 0 .3.3"/>
              <path d="M8 15v1a6 6 0 0 0 6 6a6 6 0 0 0 6-6v-4"/><circle cx="20" cy="10" r="2"/>
            </svg>
          </div>
          <div><div style={{ fontWeight:800, fontSize:13, color:'var(--text)' }}>InterimPro</div><div style={{ fontSize:10, color:'var(--text-dim)' }}>Infirmier(e) intérimaire</div></div>
        </div>

        <nav style={{ flex:1, padding:'6px 8px', display:'flex', flexDirection:'column', gap:2, overflowY:'auto' }}>
          {NAV_ITEMS.map(item => {
            const active = isActive(item)
            return (
              <Link key={item.href} href={item.href} style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 10px', borderRadius:8, textDecoration:'none', background: active ? accent : 'transparent', color: active ? 'white' : 'var(--text-muted)', fontWeight: active ? 600 : 400, fontSize:13 }}>
                <Icon name={item.icon} />{item.label}
              </Link>
            )
          })}
        </nav>

        <div style={{ padding:'12px 8px', borderTop:'1px solid var(--topbar-border)' }}>
          <div style={{ padding:'0 4px', marginBottom:8 }}>
            <span style={{ fontSize:13, fontWeight:700, background:`linear-gradient(90deg,${accent},#a78bfa)`, WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>
              Bonjour, {firstName} 👋
            </span>
          </div>
          <button onClick={() => setShowCompte(true)} style={{ width:'100%', display:'flex', alignItems:'center', gap:8, padding:'7px 10px', borderRadius:8, border:'none', background:'transparent', color:'var(--text-muted)', cursor:'pointer', fontSize:13, marginBottom:2 }}>
            <Icon name="user" size={14} />Mon compte
          </button>
          <Link href="/dashboard/parametres" style={{ display:'flex', alignItems:'center', gap:8, padding:'7px 10px', borderRadius:8, textDecoration:'none', background: isParamsActive ? accent : 'transparent', color: isParamsActive ? 'white' : 'var(--text-muted)', fontSize:13 }}>
            <Icon name="settings" size={14} />Paramètres
          </Link>
        </div>
      </aside>

      {/* MAIN */}
      <main style={{ flex:1, display:'flex', flexDirection:'column', minWidth:0 }}>
        <div style={{ height:50, display:'flex', alignItems:'center', justifyContent:'flex-end', padding:'0 24px', gap:12, borderBottom:`1px solid var(--topbar-border)`, background:'var(--bg)', position:'sticky', top:0, zIndex:15 }}>
          <div style={{ textAlign:'right' }}>
            <div style={{ fontSize:15, fontWeight:700, color:'var(--text)', fontVariantNumeric:'tabular-nums' }}>{time}</div>
            <div style={{ fontSize:11, color:'var(--text-dim)', textTransform:'capitalize' }}>{dateStr}</div>
          </div>
          {/* Cloche avec badge */}
          <div style={{ position:'relative' }}>
            <button onClick={() => setShowNotif(!showNotif)} style={{ width:32, height:32, borderRadius:'50%', background:'var(--bg-card)', border:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', color:'var(--text-muted)', position:'relative' }}>
              <Icon name="bell" size={15} />
              {notifCount > 0 && (
                <span style={{ position:'absolute', top:-4, right:-4, width:16, height:16, borderRadius:'50%', background:'#ef4444', color:'white', fontSize:9, fontWeight:800, display:'flex', alignItems:'center', justifyContent:'center', border:'2px solid var(--bg)', lineHeight:1 }}>
                  {notifCount > 9 ? '9+' : notifCount}
                </span>
              )}
            </button>
            {showNotif && <NotifDropdown missions={missions} etabs={etabs} onClose={() => setShowNotif(false)} />}
          </div>
        </div>
        <div style={{ flex:1, overflowY:'auto', padding:'28px 28px', background:'var(--bg)' }}>{children}</div>
      </main>

      {showCompte && <MonCompteModal user={user} onClose={() => setShowCompte(false)} />}
    </div>
  )
}
