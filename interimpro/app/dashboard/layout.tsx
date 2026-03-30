'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useTheme } from '@/lib/theme-context'
import { t } from '@/lib/i18n'

type Mission = { id:string; titre:string; etablissement_id:string; date_debut:string; statut:string; contrat_signe:boolean; fiche_paie_recue:boolean; salaire_recu:boolean }
type Etab = { id:string; nom:string }

// ========== COMPOSANTS ICON ==========
function Ico({ d, size=16 }: { d:string; size?:number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={d}/></svg>
}

// ========== MODAL MON COMPTE ==========
function MonCompteModal({ user, onClose }: { user:any; onClose:()=>void }) {
  const supabase = createClient()
  const { accent, lang, userId } = useTheme()
  const [form, setForm] = useState({ first_name:'', last_name:'', telephone:'', specialite:'Infirmier(e)', numero_rpps:'' })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const SPECS = ['Infirmier(e)','Aide-soignant(e)','Infirmier(e) spécialisé(e)','Cadre de santé','Puériculteur(trice)','IBODE','IADE','Autre']
  const inp: React.CSSProperties = { width:'100%', padding:'9px 12px', borderRadius:8, border:'1px solid var(--border)', background:'var(--bg-input)', color:'var(--text)', fontSize:13, outline:'none', boxSizing:'border-box' }

  useEffect(() => {
    if (!userId) return
    supabase.from('user_profiles').select('*').eq('user_id', userId).single().then(({ data }) => {
      if (data) setForm({ first_name:data.first_name||'', last_name:data.last_name||'', telephone:data.telephone||'', specialite:data.specialite||'Infirmier(e)', numero_rpps:data.numero_rpps||'' })
    })
  }, [userId])

  const save = async () => {
    if (!userId) return
    setSaving(true)
    const payload = { ...form, user_id: userId, nom_complet: `${form.first_name} ${form.last_name}` }
    const { data: ex } = await supabase.from('user_profiles').select('id').eq('user_id', userId).single()
    if (ex) await supabase.from('user_profiles').update(payload).eq('user_id', userId)
    else await supabase.from('user_profiles').insert(payload)
    setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div style={{ position:'fixed', inset:0, background:'var(--overlay)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:16, animation:'fadeIn .15s ease' }} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{ background:'var(--bg-modal)', border:'1px solid var(--border)', borderRadius:16, padding:28, width:'100%', maxWidth:440, boxShadow:`0 24px 60px var(--shadow)`, animation:'slideIn .2s ease' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
          <h2 style={{ fontSize:17, fontWeight:700, color:'var(--text)' }}>Mon compte</h2>
          <button onClick={onClose} style={{ background:'none', border:'none', color:'var(--text-dim)', cursor:'pointer', fontSize:20, lineHeight:1 }}>✕</button>
        </div>
        <div style={{ textAlign:'center', marginBottom:18 }}>
          {user?.user_metadata?.avatar_url
            ? <img src={user.user_metadata.avatar_url} style={{ width:72, height:72, borderRadius:'50%', border:'3px solid var(--accent-border)' }} alt=""/>
            : <div style={{ width:72, height:72, borderRadius:'50%', background:'var(--bg-input)', border:'3px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto' }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--text-dim)" strokeWidth="1.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              </div>
          }
          <div style={{ fontSize:12, color:'var(--accent)', marginTop:8, cursor:'pointer', fontWeight:600 }}>⬆ Changer la photo</div>
        </div>
        <div style={{ background:'var(--bg-input)', borderRadius:8, padding:'9px 12px', marginBottom:14, display:'flex', justifyContent:'space-between' }}>
          <span style={{ fontSize:13, color:'var(--text-muted)' }}>Email</span>
          <span style={{ fontSize:13, color:'var(--text-dim)', maxWidth:220, overflow:'hidden', textOverflow:'ellipsis' }}>{user?.email || '—'}</span>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:10 }}>
          <div><label style={{ display:'block', fontSize:11, color:'var(--text-muted)', marginBottom:4 }}>Prénom *</label><input value={form.first_name} onChange={e=>setForm({...form,first_name:e.target.value})} style={inp}/></div>
          <div><label style={{ display:'block', fontSize:11, color:'var(--text-muted)', marginBottom:4 }}>Nom *</label><input value={form.last_name} onChange={e=>setForm({...form,last_name:e.target.value})} style={inp}/></div>
        </div>
        <div style={{ marginBottom:10 }}><label style={{ display:'block', fontSize:11, color:'var(--text-muted)', marginBottom:4 }}>Téléphone</label><input value={form.telephone} onChange={e=>setForm({...form,telephone:e.target.value})} placeholder="06 12 34 56 78" style={inp}/></div>
        <div style={{ marginBottom:10 }}><label style={{ display:'block', fontSize:11, color:'var(--text-muted)', marginBottom:4 }}>Spécialité</label><select value={form.specialite} onChange={e=>setForm({...form,specialite:e.target.value})} style={inp}>{SPECS.map(s=><option key={s}>{s}</option>)}</select></div>
        <div style={{ marginBottom:18 }}><label style={{ display:'block', fontSize:11, color:'var(--text-muted)', marginBottom:4 }}>Numéro RPPS</label><input value={form.numero_rpps} onChange={e=>setForm({...form,numero_rpps:e.target.value})} style={inp}/></div>
        {saved && <div style={{ padding:'8px 12px', borderRadius:7, background:'rgba(16,185,129,.1)', border:'1px solid rgba(16,185,129,.3)', fontSize:13, color:'#10b981', marginBottom:12 }}>✅ {t(lang,'gen.saved')}</div>}
        <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
          <button onClick={onClose} style={{ padding:'9px 18px', borderRadius:8, border:'1px solid var(--border)', background:'transparent', color:'var(--text-muted)', cursor:'pointer', fontSize:13 }}>{t(lang,'miss.cancel')}</button>
          <button onClick={save} disabled={saving} style={{ padding:'9px 20px', borderRadius:8, border:'none', background:`linear-gradient(135deg,${accent},#a855f7)`, color:'white', cursor:'pointer', fontSize:13, fontWeight:700 }}>{saving ? t(lang,'gen.saving') : t(lang,'miss.save')}</button>
        </div>
      </div>
    </div>
  )
}

// ========== MODAL PARAMÈTRES (popup) ==========
function SettingsModal({ onClose }: { onClose:()=>void }) {
  const { accent, darkMode, lang, objectif, setAccent, setDarkMode, setLang, setObjectif, savePrefs } = useTheme()
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const COLORS = ['#3b82f6','#6366f1','#8b5cf6','#a855f7','#e879f9','#ec4899','#f43f5e','#ef4444','#dc2626','#f97316','#f59e0b','#eab308','#ca8a04','#84cc16','#22c55e','#10b981','#14b8a6','#06b6d4','#22d3ee','#38bdf8','#94a3b8','#6b7280','#4b5563','#374151']
  const LANGS = [{ value:'fr', label:'Français', flag:'🇫🇷' },{ value:'en', label:'English', flag:'🇬🇧' },{ value:'es', label:'Español', flag:'🇪🇸' }]
  const inp: React.CSSProperties = { padding:'8px 12px', borderRadius:8, border:'1px solid var(--border)', background:'var(--bg-input)', color:'var(--text)', fontSize:14, outline:'none' }
  const section: React.CSSProperties = { background:'var(--bg-input)', borderRadius:10, padding:'16px 18px', marginBottom:12 }

  const save = async () => {
    setSaving(true)
    await savePrefs()
    setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div style={{ position:'fixed', inset:0, background:'var(--overlay)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:16, animation:'fadeIn .15s ease' }} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{ background:'var(--bg-modal)', border:'1px solid var(--border)', borderRadius:16, padding:28, width:'100%', maxWidth:560, maxHeight:'88vh', overflow:'auto', boxShadow:`0 24px 60px var(--shadow)`, animation:'slideIn .2s ease' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:22 }}>
          <h2 style={{ fontSize:18, fontWeight:800, color:'var(--text)' }}>{t(lang,'sett.title')}</h2>
          <button onClick={onClose} style={{ background:'none', border:'none', color:'var(--text-dim)', cursor:'pointer', fontSize:22, lineHeight:1 }}>✕</button>
        </div>

        {saved && <div style={{ padding:'8px 12px', borderRadius:8, background:'rgba(16,185,129,.1)', border:'1px solid rgba(16,185,129,.3)', fontSize:13, color:'#10b981', marginBottom:14, fontWeight:600 }}>✅ {t(lang,'sett.saved')}</div>}

        {/* Apparence */}
        <div style={section}>
          <div style={{ fontSize:14, fontWeight:700, color:'var(--text)', marginBottom:14, display:'flex', alignItems:'center', gap:6 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
            {t(lang,'sett.appearance')}
          </div>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:18 }}>
            <div>
              <div style={{ fontSize:13, fontWeight:600, color:'var(--text)' }}>{t(lang,'sett.dark_mode')}</div>
              <div style={{ fontSize:11, color:'var(--text-dim)', marginTop:2 }}>{t(lang,'sett.dark_mode_desc')}</div>
            </div>
            <div onClick={()=>setDarkMode(!darkMode)} style={{ width:48, height:26, borderRadius:100, background:darkMode?accent:'var(--border)', position:'relative', cursor:'pointer', transition:'background .25s', flexShrink:0 }}>
              <div style={{ width:22, height:22, borderRadius:'50%', background:'white', position:'absolute', top:2, left:darkMode?24:2, transition:'left .25s', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12 }}>{darkMode?'🌙':'☀️'}</div>
            </div>
          </div>
          <div>
            <div style={{ fontSize:12, fontWeight:600, color:'var(--text-muted)', marginBottom:10 }}>{t(lang,'sett.accent')} ({COLORS.length})</div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(8,1fr)', gap:8 }}>
              {COLORS.map(c=>(
                <div key={c} onClick={()=>setAccent(c)} style={{ width:'100%', aspectRatio:'1', borderRadius:9, background:c, cursor:'pointer', border:accent===c?'3px solid white':'3px solid transparent', boxShadow:accent===c?`0 0 0 2px ${c},0 4px 10px ${c}50`:`0 1px 4px ${c}30`, transition:'all .15s', transform:accent===c?'scale(1.1)':'scale(1)' }}/>
              ))}
            </div>
          </div>
        </div>

        {/* Objectifs */}
        <div style={section}>
          <div style={{ fontSize:14, fontWeight:700, color:'var(--text)', marginBottom:12, display:'flex', alignItems:'center', gap:6 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>
            {t(lang,'sett.objectives')}
          </div>
          <label style={{ display:'block', fontSize:12, color:'var(--text-muted)', marginBottom:6 }}>{t(lang,'sett.monthly_target')}</label>
          <input type="number" step="0.5" value={objectif} onChange={e=>setObjectif(Number(e.target.value))} style={{ ...inp, width:160 }}/>
        </div>

        {/* Langue */}
        <div style={section}>
          <div style={{ fontSize:14, fontWeight:700, color:'var(--text)', marginBottom:12, display:'flex', alignItems:'center', gap:6 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
            {t(lang,'sett.language')}
          </div>
          <div style={{ fontSize:12, color:'var(--text-dim)', marginBottom:10 }}>{t(lang,'sett.lang_desc')}</div>
          <div style={{ display:'flex', gap:8 }}>
            {LANGS.map(l=>(
              <button key={l.value} onClick={()=>setLang(l.value as any)} style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 14px', borderRadius:8, border:`1.5px solid ${lang===l.value?accent:'var(--border)'}`, background:lang===l.value?'var(--accent-dim)':'var(--bg-card)', color:lang===l.value?accent:'var(--text-muted)', cursor:'pointer', fontSize:13, fontWeight:lang===l.value?700:400 }}>
                <span style={{ fontSize:16 }}>{l.flag}</span>{l.label}
              </button>
            ))}
          </div>
        </div>

        <button onClick={save} disabled={saving} style={{ width:'100%', padding:'13px', borderRadius:10, border:'none', background:`linear-gradient(135deg,${accent},#a855f7)`, color:'white', fontSize:15, fontWeight:700, cursor:'pointer', opacity:saving?.7:1, display:'flex', alignItems:'center', justifyContent:'center', gap:8, boxShadow:`0 4px 16px ${accent}40` }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
          {saving ? t(lang,'gen.saving') : t(lang,'sett.save')}
        </button>
      </div>
    </div>
  )
}

// ========== NOTIFICATION DROPDOWN ==========
function NotifDropdown({ missions, etabs, onClose }: { missions:Mission[]; etabs:Etab[]; onClose:()=>void }) {
  const ref = useRef<HTMLDivElement>(null)
  const { accent, lang } = useTheme()
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose() }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])
  const incomplete = missions.filter(m => m.statut==='passee' && (!m.contrat_signe||!m.fiche_paie_recue||!m.salaire_recu))
  const getEtab = (id:string) => etabs.find(e=>e.id===id)
  return (
    <div ref={ref} style={{ position:'absolute', top:'calc(100% + 8px)', right:0, width:340, background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:12, boxShadow:`0 16px 48px var(--shadow)`, zIndex:200, overflow:'hidden', animation:'fadeIn .15s ease' }}>
      <div style={{ padding:'12px 16px', borderBottom:'1px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <span style={{ fontSize:13, fontWeight:700, color:'var(--text)' }}>{t(lang,'gen.notif_title')}</span>
        <span style={{ fontSize:11, color:'var(--text-dim)' }}>{incomplete.length} {t(lang,'gen.notif_pending')}</span>
      </div>
      <div style={{ maxHeight:300, overflowY:'auto' }}>
        {incomplete.length === 0 ? (
          <div style={{ padding:24, textAlign:'center', color:'var(--text-dim)', fontSize:13 }}>
            <div style={{ fontSize:24, marginBottom:8 }}>✅</div>{t(lang,'gen.notif_ok')}
          </div>
        ) : incomplete.map(m => {
          const etab = getEtab(m.etablissement_id)
          const missing = [!m.contrat_signe&&t(lang,'gen.contract'), !m.fiche_paie_recue&&t(lang,'gen.payslip'), !m.salaire_recu&&t(lang,'gen.salary')].filter(Boolean) as string[]
          return (
            <div key={m.id} style={{ padding:'10px 16px', borderBottom:'1px solid var(--border)', display:'flex', gap:10 }}>
              <div style={{ width:8, height:8, borderRadius:'50%', background:'#f59e0b', marginTop:5, flexShrink:0 }}/>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:13, fontWeight:600, color:'var(--text)' }}>{m.titre} — {etab?.nom}</div>
                <div style={{ fontSize:11, color:'var(--text-dim)', marginTop:1 }}>{new Date(m.date_debut).toLocaleDateString('fr-FR')}</div>
                <div style={{ display:'flex', gap:4, marginTop:4, flexWrap:'wrap' }}>
                  {missing.map(d=><span key={d} style={{ padding:'1px 7px', borderRadius:100, fontSize:10, background:'rgba(245,158,11,.12)', color:'#f59e0b', border:'1px solid rgba(245,158,11,.25)', fontWeight:600 }}>{d} {t(lang,'gen.missing')}</span>)}
                </div>
              </div>
            </div>
          )
        })}
      </div>
      {incomplete.length > 0 && (
        <div style={{ padding:'10px 16px', borderTop:'1px solid var(--border)' }}>
          <Link href="/dashboard/missions" onClick={onClose} style={{ fontSize:12, color:accent, textDecoration:'none', fontWeight:600 }}>{t(lang,'gen.see_all_missions')} →</Link>
        </div>
      )}
    </div>
  )
}

// ========== LAYOUT PRINCIPAL ==========
const NAV_ROUTES = [
  { key:'nav.dashboard', href:'/dashboard', exact:true, icon:'M3 3h7v7H3zm11 0h7v7h-7zM3 14h7v7H3zm11 0h7v7h-7z' },
  { key:'nav.missions', href:'/dashboard/missions', icon:'M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11' },
  { key:'nav.etablissements', href:'/dashboard/etablissements', icon:'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z M9 22V12h6v10' },
  { key:'nav.calendrier', href:'/dashboard/calendrier', icon:'M3 4h18v18H3zM16 2v4M8 2v4M3 10h18' },
  { key:'nav.analyses', href:'/dashboard/analyses', icon:'M18 20V10M12 20V4M6 20v-6M2 20h20' },
  { key:'nav.import', href:'/dashboard/import-gcal', icon:'M3 4h18v18H3zM16 2v4M8 2v4M3 10h18m6 6-3 3-3-3' },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null)
  const [ready, setReady] = useState(false)
  const [showCompte, setShowCompte] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showNotif, setShowNotif] = useState(false)
  const [missions, setMissions] = useState<Mission[]>([])
  const [etabs, setEtabs] = useState<Etab[]>([])
  const [time, setTime] = useState('')
  const [dateStr, setDateStr] = useState('')
  const pathname = usePathname()
  const supabase = createClient()
  const { accent, lang } = useTheme()

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session?.user) {
        setUser(session.user); setReady(true)
        supabase.from('missions').select('id,titre,etablissement_id,date_debut,statut,contrat_signe,fiche_paie_recue,salaire_recu')
          .eq('user_id', session.user.id).then(({ data }) => setMissions((data||[]) as Mission[]))
        supabase.from('etablissements').select('id,nom').eq('user_id', session.user.id)
          .then(({ data }) => setEtabs((data||[]) as Etab[]))
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
  const isActive = (item: typeof NAV_ROUTES[0]) => item.exact ? pathname===item.href : pathname.startsWith(item.href)
  const firstName = user?.user_metadata?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || ''
  const notifCount = missions.filter(m=>m.statut==='passee'&&(!m.contrat_signe||!m.fiche_paie_recue||!m.salaire_recu)).length

  if (!ready||!user) return (
    <div style={{ minHeight:'100vh', background:'var(--bg)', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ width:40, height:40, borderRadius:'50%', border:'3px solid var(--accent-dim)', borderTop:'3px solid var(--accent)', animation:'spin .8s linear infinite' }}/>
    </div>
  )

  return (
    <div style={{ display:'flex', minHeight:'100vh', background:'var(--bg)' }}>
      {/* === SIDEBAR 220px === */}
      <aside style={{ width:220, minWidth:220, background:'var(--sidebar-bg)', borderRight:'1px solid rgba(255,255,255,.06)', display:'flex', flexDirection:'column', position:'sticky', top:0, height:'100vh', zIndex:20 }}>
        {/* Logo — clique → dashboard */}
        <Link href="/dashboard" style={{ padding:'16px 16px', borderBottom:'1px solid rgba(255,255,255,.06)', display:'flex', alignItems:'center', gap:10, textDecoration:'none', flexShrink:0 }}>
          <div style={{ width:34, height:34, minWidth:34, borderRadius:9, background:'var(--accent-dim)', border:'1px solid var(--accent-border)', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke={accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 6 6a6 6 0 0 0 6-6V4a2 2 0 0 0-2-2h-1a.2.2 0 1 0 .3.3"/>
              <path d="M8 15v1a6 6 0 0 0 6 6a6 6 0 0 0 6-6v-4"/><circle cx="20" cy="10" r="2"/>
            </svg>
          </div>
          <div>
            <div style={{ fontWeight:800, fontSize:14, color:'white', letterSpacing:'-.2px' }}>InterimPro</div>
            <div style={{ fontSize:10, color:'rgba(255,255,255,.4)' }}>Infirmier(e) intérimaire</div>
          </div>
        </Link>

        {/* Nav */}
        <nav style={{ flex:1, padding:'8px 10px', display:'flex', flexDirection:'column', gap:2, overflowY:'auto' }}>
          {NAV_ROUTES.map(item => {
            const active = isActive(item)
            return (
              <Link key={item.href} href={item.href} style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 12px', borderRadius:9, textDecoration:'none', background: active ? accent : 'transparent', color: active ? 'white' : 'rgba(255,255,255,.55)', fontWeight: active ? 600 : 400, fontSize:13.5, whiteSpace:'nowrap' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink:0 }}><path d={item.icon}/></svg>
                {t(lang, item.key)}
              </Link>
            )
          })}
        </nav>

        {/* Footer */}
        <div style={{ padding:'10px 10px 14px', borderTop:'1px solid rgba(255,255,255,.06)', flexShrink:0 }}>
          <div style={{ padding:'0 4px', marginBottom:10 }}>
            <span style={{ fontSize:13, fontWeight:700, background:`linear-gradient(90deg,${accent},#a78bfa)`, WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', display:'block' }}>
              {t(lang,'gen.hello')}, {firstName} 👋
            </span>
          </div>
          <button onClick={()=>setShowCompte(true)} style={{ width:'100%', display:'flex', alignItems:'center', gap:10, padding:'8px 12px', borderRadius:8, border:'none', background:'transparent', color:'rgba(255,255,255,.5)', cursor:'pointer', fontSize:13, marginBottom:2, textAlign:'left' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            {t(lang,'nav.account')}
          </button>
          <button onClick={()=>setShowSettings(true)} style={{ width:'100%', display:'flex', alignItems:'center', gap:10, padding:'8px 12px', borderRadius:8, border:'none', background:'transparent', color:'rgba(255,255,255,.5)', cursor:'pointer', fontSize:13, marginBottom:2, textAlign:'left' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
            {t(lang,'nav.settings')}
          </button>
          <button onClick={logout} style={{ width:'100%', display:'flex', alignItems:'center', gap:10, padding:'8px 12px', borderRadius:8, border:'none', background:'transparent', color:'rgba(239,68,68,.7)', cursor:'pointer', fontSize:13, textAlign:'left' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            {t(lang,'nav.logout')}
          </button>
        </div>
      </aside>

      {/* === MAIN === */}
      <main style={{ flex:1, display:'flex', flexDirection:'column', minWidth:0 }}>
        {/* Topbar */}
        <div style={{ height:52, display:'flex', alignItems:'center', justifyContent:'flex-end', padding:'0 24px', gap:12, borderBottom:`1px solid var(--topbar-border)`, background:'var(--bg)', position:'sticky', top:0, zIndex:15 }}>
          <div style={{ textAlign:'right' }}>
            <div style={{ fontSize:15, fontWeight:700, color:'var(--text)', fontVariantNumeric:'tabular-nums' }}>{time}</div>
            <div style={{ fontSize:11, color:'var(--text-dim)', textTransform:'capitalize' }}>{dateStr}</div>
          </div>
          <div style={{ position:'relative' }}>
            <button onClick={()=>setShowNotif(!showNotif)} style={{ width:34, height:34, borderRadius:'50%', background:'var(--bg-card)', border:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', color:'var(--text-muted)' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
              {notifCount > 0 && <span style={{ position:'absolute', top:-3, right:-3, width:17, height:17, borderRadius:'50%', background:'#ef4444', color:'white', fontSize:9, fontWeight:800, display:'flex', alignItems:'center', justifyContent:'center', border:'2px solid var(--bg)' }}>{notifCount>9?'9+':notifCount}</span>}
            </button>
            {showNotif && <NotifDropdown missions={missions} etabs={etabs} onClose={()=>setShowNotif(false)}/>}
          </div>
        </div>
        {/* Content — max-width rétréci */}
        <div style={{ flex:1, overflowY:'auto', padding:'28px 32px', background:'var(--bg)' }}>
          <div style={{ maxWidth:960, margin:'0 auto' }}>
            {children}
          </div>
        </div>
      </main>

      {showCompte && <MonCompteModal user={user} onClose={()=>setShowCompte(false)}/>}
      {showSettings && <SettingsModal onClose={()=>setShowSettings(false)}/>}
    </div>
  )
}
