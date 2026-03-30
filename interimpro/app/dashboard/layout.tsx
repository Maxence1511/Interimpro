'use client'
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useTheme } from '@/lib/theme-context'
import { t } from '@/lib/i18n'

const NAV = [
  { key:'nav.dashboard', href:'/dashboard', exact:true, icon:<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg> },
  { key:'nav.missions', href:'/dashboard/missions', icon:<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg> },
  { key:'nav.etablissements', href:'/dashboard/etablissements', icon:<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg> },
  { key:'nav.calendrier', href:'/dashboard/calendrier', icon:<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> },
  { key:'nav.analyses', href:'/dashboard/analyses', icon:<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/></svg> },
  { key:'nav.import', href:'/dashboard/import-gcal', icon:<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><polyline points="8 14 10 16 14 12"/></svg> },
]

type Mission = { id:string; titre:string; etablissement_id:string; date_debut:string; statut:string; contrat_signe:boolean; fiche_paie_recue:boolean; salaire_recu:boolean }
type Etab = { id:string; nom:string }

function NotifPanel({ missions, etabs, onClose }: { missions:Mission[]; etabs:Etab[]; onClose:()=>void }) {
  const ref = useRef<HTMLDivElement>(null)
  const { accent, lang } = useTheme()
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose() }
    document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h)
  }, [])
  const incomplete = missions.filter(m => m.statut==='passee' && (!m.contrat_signe||!m.fiche_paie_recue||!m.salaire_recu))
  const getEtab = (id:string) => etabs.find(e=>e.id===id)
  return (
    <div ref={ref} style={{ position:'absolute', top:'calc(100%+8px)', right:0, width:340, background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:12, boxShadow:`0 16px 48px var(--shadow)`, zIndex:300, overflow:'hidden', animation:'fadeIn .15s ease' }}>
      <div style={{ padding:'12px 16px', borderBottom:'1px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <span style={{ fontSize:13, fontWeight:700, color:'var(--text)' }}>Notifications</span>
        <span style={{ fontSize:11, color:'var(--text-dim)' }}>{incomplete.length} en attente</span>
      </div>
      <div style={{ maxHeight:320, overflowY:'auto' }}>
        {incomplete.length===0 ? (
          <div style={{ padding:28, textAlign:'center' }}>
            <div style={{ fontSize:28, marginBottom:8 }}>✅</div>
            <p style={{ fontSize:13, color:'var(--text-dim)' }}>Tous les documents sont à jour !</p>
          </div>
        ) : incomplete.map(m=>{
          const etab = getEtab(m.etablissement_id)
          const missing = [!m.contrat_signe&&'Contrat',!m.fiche_paie_recue&&'Fiche de paie',!m.salaire_recu&&'Salaire'].filter(Boolean) as string[]
          return (
            <div key={m.id} style={{ padding:'10px 16px', borderBottom:'1px solid var(--border)', display:'flex', gap:10 }}>
              <div style={{ width:8, height:8, borderRadius:'50%', background:'#f59e0b', marginTop:5, flexShrink:0 }}/>
              <div>
                <div style={{ fontSize:13, fontWeight:600, color:'var(--text)' }}>{m.titre}</div>
                <div style={{ fontSize:11, color:'var(--text-dim)' }}>{etab?.nom} · {new Date(m.date_debut).toLocaleDateString('fr-FR')}</div>
                <div style={{ display:'flex', gap:4, marginTop:4, flexWrap:'wrap' as const }}>
                  {missing.map(d=><span key={d} style={{ padding:'1px 7px', borderRadius:100, fontSize:10, background:'rgba(245,158,11,.12)', color:'#f59e0b', border:'1px solid rgba(245,158,11,.25)', fontWeight:600 }}>{d} manquant</span>)}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function MonCompteModal({ user, onClose }: { user:any; onClose:()=>void }) {
  const supabase = createClient()
  const { accent, lang, userId } = useTheme()
  const [form, setForm] = useState({ first_name:'', last_name:'', telephone:'', specialite:'Infirmier(e)', numero_rpps:'', photo_url:'' })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const SPECS = ['Infirmier(e)','Aide-soignant(e)','Infirmier(e) spécialisé(e)','Cadre de santé','Puériculteur(trice)','IBODE','IADE','Autre']
  const inp: React.CSSProperties = { width:'100%', padding:'9px 12px', borderRadius:8, border:'1px solid var(--border)', background:'var(--bg-input)', color:'var(--text)', fontSize:13, outline:'none', boxSizing:'border-box' }
  useEffect(() => {
    if (!userId) return
    supabase.from('user_profiles').select('*').eq('user_id', userId).single().then(({ data }) => {
      if (data) setForm({ first_name:data.first_name||'', last_name:data.last_name||'', telephone:data.telephone||'', specialite:data.specialite||'Infirmier(e)', numero_rpps:data.numero_rpps||'', photo_url:data.photo_url||'' })
    })
  }, [userId])
  const save = async () => {
    if (!userId) return
    setSaving(true)
    const payload = { ...form, user_id:userId, nom_complet:`${form.first_name} ${form.last_name}` }
    const { data:ex } = await supabase.from('user_profiles').select('id').eq('user_id',userId).single()
    if (ex) await supabase.from('user_profiles').update(payload).eq('user_id',userId)
    else await supabase.from('user_profiles').insert(payload)
    setSaving(false); setSaved(true); setTimeout(()=>setSaved(false),2000)
  }
  const initials = `${form.first_name?.[0]||''}${form.last_name?.[0]||''}` || user?.email?.[0]?.toUpperCase() || '?'
  return (
    <div style={{ position:'fixed', inset:0, background:'var(--overlay)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{ background:'var(--bg-modal)', border:'1px solid var(--border)', borderRadius:16, padding:28, width:'100%', maxWidth:440, maxHeight:'90vh', overflow:'auto', boxShadow:`0 24px 60px var(--shadow)`, animation:'slideIn .2s ease' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
          <h2 style={{ fontSize:17, fontWeight:700, color:'var(--text)' }}>Mon compte</h2>
          <button onClick={onClose} style={{ background:'none', border:'none', color:'var(--text-dim)', cursor:'pointer', fontSize:22 }}>✕</button>
        </div>
        <div style={{ textAlign:'center', marginBottom:18 }}>
          <div style={{ width:72, height:72, borderRadius:'50%', background:form.photo_url?'transparent':'var(--accent-dim)', border:'2px solid var(--accent-border)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 8px', overflow:'hidden' }}>
            {form.photo_url ? <img src={form.photo_url} style={{ width:'100%', height:'100%', objectFit:'cover' }} alt=""/> : <span style={{ fontSize:24, fontWeight:700, color:accent }}>{initials}</span>}
          </div>
          <div style={{ fontSize:12, color:accent, cursor:'pointer', fontWeight:600 }}>⬆ Modifier la photo</div>
        </div>
        <div style={{ background:'var(--bg-input)', borderRadius:8, padding:'9px 12px', marginBottom:14, display:'flex', justifyContent:'space-between' }}>
          <span style={{ fontSize:13, color:'var(--text-muted)' }}>Email</span>
          <span style={{ fontSize:13, color:'var(--text-dim)' }}>{user?.email}</span>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:10 }}>
          <div><label style={{ display:'block', fontSize:11, color:'var(--text-muted)', marginBottom:4 }}>Prénom</label><input value={form.first_name} onChange={e=>setForm({...form,first_name:e.target.value})} style={inp}/></div>
          <div><label style={{ display:'block', fontSize:11, color:'var(--text-muted)', marginBottom:4 }}>Nom</label><input value={form.last_name} onChange={e=>setForm({...form,last_name:e.target.value})} style={inp}/></div>
        </div>
        <div style={{ marginBottom:10 }}><label style={{ display:'block', fontSize:11, color:'var(--text-muted)', marginBottom:4 }}>Téléphone</label><input value={form.telephone} onChange={e=>setForm({...form,telephone:e.target.value})} style={inp}/></div>
        <div style={{ marginBottom:10 }}><label style={{ display:'block', fontSize:11, color:'var(--text-muted)', marginBottom:4 }}>Spécialité</label>
          <select value={form.specialite} onChange={e=>setForm({...form,specialite:e.target.value})} style={inp}>{SPECS.map(s=><option key={s}>{s}</option>)}</select>
        </div>
        <div style={{ marginBottom:18 }}><label style={{ display:'block', fontSize:11, color:'var(--text-muted)', marginBottom:4 }}>Numéro RPPS</label><input value={form.numero_rpps} onChange={e=>setForm({...form,numero_rpps:e.target.value})} style={inp}/></div>
        {saved && <div style={{ padding:'8px 12px', borderRadius:7, background:'rgba(16,185,129,.1)', border:'1px solid rgba(16,185,129,.3)', fontSize:13, color:'#10b981', marginBottom:12, textAlign:'center' }}>✅ Profil sauvegardé !</div>}
        <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
          <button onClick={onClose} style={{ padding:'9px 18px', borderRadius:8, border:'1px solid var(--border)', background:'transparent', color:'var(--text-muted)', cursor:'pointer', fontSize:13 }}>Annuler</button>
          <button onClick={save} disabled={saving} style={{ padding:'9px 20px', borderRadius:8, border:'none', background:`linear-gradient(135deg,${accent},#a855f7)`, color:'white', cursor:'pointer', fontSize:13, fontWeight:700 }}>{saving?'Sauvegarde...':'Sauvegarder'}</button>
        </div>
      </div>
    </div>
  )
}

function SettingsModal({ onClose }: { onClose:()=>void }) {
  const { accent, darkMode, lang, objectif, setAccent, setDarkMode, setLang, setObjectif, savePrefs } = useTheme()
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const COLORS = [
    {n:'Bleu',c:'#3b82f6'},{n:'Indigo',c:'#6366f1'},{n:'Violet',c:'#8b5cf6'},{n:'Lilas',c:'#a855f7'},
    {n:'Fuchsia',c:'#e879f9'},{n:'Rose',c:'#ec4899'},{n:'Framboise',c:'#f43f5e'},{n:'Rouge',c:'#ef4444'},
    {n:'Orange',c:'#f97316'},{n:'Ambre',c:'#f59e0b'},{n:'Citron',c:'#eab308'},{n:'Vert',c:'#22c55e'},
    {n:'Émeraude',c:'#10b981'},{n:'Teal',c:'#14b8a6'},{n:'Cyan',c:'#22d3ee'},{n:'Sky',c:'#38bdf8'},
    {n:'Ardoise',c:'#94a3b8'},{n:'Zinc',c:'#71717a'},{n:'Pierre',c:'#78716c'},{n:'Charbon',c:'#4b5563'},
    {n:'Corail',c:'#fb7185'},{n:'Lavande',c:'#818cf8'},{n:'Turquoise',c:'#2dd4bf'},{n:'Citron v.',c:'#a3e635'},
  ]
  const LANGS = [{v:'fr',l:'Français',f:'🇫🇷'},{v:'en',l:'English',f:'🇬🇧'},{v:'es',l:'Español',f:'🇪🇸'}]
  const inp: React.CSSProperties = { padding:'8px 12px', borderRadius:8, border:'1px solid var(--border)', background:'var(--bg-input)', color:'var(--text)', fontSize:14, outline:'none' }
  const S: React.CSSProperties = { background:'var(--bg-input)', borderRadius:10, padding:'16px 18px', marginBottom:12 }
  const save = async () => { setSaving(true); await savePrefs(); setSaving(false); setSaved(true); setTimeout(()=>setSaved(false),2000) }
  return (
    <div style={{ position:'fixed', inset:0, background:'var(--overlay)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{ background:'var(--bg-modal)', border:'1px solid var(--border)', borderRadius:16, padding:28, width:'100%', maxWidth:560, maxHeight:'88vh', overflow:'auto', boxShadow:`0 24px 60px var(--shadow)`, animation:'slideIn .2s ease' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:22 }}>
          <h2 style={{ fontSize:18, fontWeight:800, color:'var(--text)' }}>Paramètres</h2>
          <button onClick={onClose} style={{ background:'none', border:'none', color:'var(--text-dim)', cursor:'pointer', fontSize:22 }}>✕</button>
        </div>
        {saved && <div style={{ padding:'8px 12px', borderRadius:8, background:'rgba(16,185,129,.1)', border:'1px solid rgba(16,185,129,.3)', fontSize:13, color:'#10b981', marginBottom:14, fontWeight:600, textAlign:'center' }}>✅ Paramètres sauvegardés !</div>}
        <div style={S}>
          <div style={{ fontSize:14, fontWeight:700, color:'var(--text)', marginBottom:14 }}>🎨 Apparence</div>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:18 }}>
            <div>
              <div style={{ fontSize:13, fontWeight:600, color:'var(--text)' }}>Mode sombre</div>
              <div style={{ fontSize:11, color:'var(--text-dim)', marginTop:1 }}>Basculer entre thème sombre et clair</div>
            </div>
            <div onClick={()=>setDarkMode(!darkMode)} style={{ width:48, height:26, borderRadius:100, background:darkMode?accent:'#e2e8f0', position:'relative', cursor:'pointer', transition:'background .25s', flexShrink:0 }}>
              <div style={{ width:22, height:22, borderRadius:'50%', background:'white', position:'absolute', top:2, left:darkMode?24:2, transition:'left .25s', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11 }}>{darkMode?'🌙':'☀️'}</div>
            </div>
          </div>
          <div style={{ fontSize:12, fontWeight:600, color:'var(--text-muted)', marginBottom:10 }}>Couleur accent</div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(8,1fr)', gap:8 }}>
            {COLORS.map(({c,n})=>(
              <div key={c} title={n} onClick={()=>setAccent(c)} style={{ width:'100%', aspectRatio:'1', borderRadius:9, background:c, cursor:'pointer', border:accent===c?'3px solid white':'3px solid transparent', boxShadow:accent===c?`0 0 0 2px ${c},0 4px 10px ${c}50`:'none', transform:accent===c?'scale(1.15)':'scale(1)', transition:'all .15s' }}/>
            ))}
          </div>
        </div>
        <div style={S}>
          <div style={{ fontSize:14, fontWeight:700, color:'var(--text)', marginBottom:12 }}>🎯 Objectifs</div>
          <label style={{ display:'block', fontSize:12, color:'var(--text-muted)', marginBottom:6 }}>Objectif heures mensuelles</label>
          <input type="number" step="0.5" value={objectif} onChange={e=>setObjectif(Number(e.target.value))} style={{ ...inp, width:160 }}/>
        </div>
        <div style={S}>
          <div style={{ fontSize:14, fontWeight:700, color:'var(--text)', marginBottom:12 }}>🌍 Langue</div>
          <div style={{ display:'flex', gap:8 }}>
            {LANGS.map(l=>(
              <button key={l.v} onClick={()=>setLang(l.v as any)} style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 14px', borderRadius:8, border:`1.5px solid ${lang===l.v?accent:'var(--border)'}`, background:lang===l.v?'var(--accent-dim)':'var(--bg-card)', color:lang===l.v?accent:'var(--text-muted)', cursor:'pointer', fontSize:13, fontWeight:lang===l.v?700:400 }}>
                <span style={{ fontSize:16 }}>{l.f}</span>{l.l}
              </button>
            ))}
          </div>
        </div>
        <button onClick={save} disabled={saving} style={{ width:'100%', padding:13, borderRadius:10, border:'none', background:`linear-gradient(135deg,${accent},#a855f7)`, color:'white', fontSize:15, fontWeight:700, cursor:'pointer', boxShadow:`0 4px 16px ${accent}40` }}>
          {saving ? 'Sauvegarde...' : '💾 Sauvegarder les paramètres'}
        </button>
      </div>
    </div>
  )
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null)
  const [ready, setReady] = useState(false)
  const [showCompte, setShowCompte] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showNotif, setShowNotif] = useState(false)
  const [missions, setMissions] = useState<Mission[]>([])
  const [etabs, setEtabs] = useState<Etab[]>([])
  const [time, setTime] = useState('')
  const [profile, setProfile] = useState<any>(null)
  const pathname = usePathname()
  const supabase = createClient()
  const { accent, lang, userId } = useTheme()

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session?.user) {
        setUser(session.user); setReady(true)
        const uid = session.user.id
        Promise.all([
          supabase.from('missions').select('id,titre,etablissement_id,date_debut,statut,contrat_signe,fiche_paie_recue,salaire_recu').eq('user_id',uid),
          supabase.from('etablissements').select('id,nom').eq('user_id',uid),
          supabase.from('user_profiles').select('*').eq('user_id',uid).single(),
        ]).then(([m,e,p]) => {
          setMissions((m.data||[]) as Mission[])
          setEtabs((e.data||[]) as Etab[])
          if (p.data) setProfile(p.data)
        })
      } else { setReady(true); window.location.href='/' }
    })
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    const tick = () => setTime(new Date().toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit',second:'2-digit'}))
    tick(); const id = setInterval(tick,1000); return () => clearInterval(id)
  }, [])

  const logout = async () => { await supabase.auth.signOut(); window.location.href='/' }
  const isActive = (item:typeof NAV[0]) => item.exact ? pathname===item.href : pathname.startsWith(item.href)
  const notifCount = missions.filter(m=>m.statut==='passee'&&(!m.contrat_signe||!m.fiche_paie_recue||!m.salaire_recu)).length
  const displayName = profile?.first_name || user?.user_metadata?.name?.split(' ')[0] || user?.email?.split('@')[0] || 'Utilisateur'
  const initials = profile ? `${profile.first_name?.[0]||''}${profile.last_name?.[0]||''}` : displayName[0]?.toUpperCase()

  if (!ready||!user) return (
    <div style={{ minHeight:'100vh', background:'var(--bg)', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ width:40, height:40, borderRadius:'50%', border:`3px solid var(--accent-dim)`, borderTop:`3px solid ${accent}`, animation:'spin .8s linear infinite' }}/>
    </div>
  )

  return (
    <div style={{ display:'flex', minHeight:'100vh', background:'var(--bg)' }}>
      {/* SIDEBAR */}
      <aside style={{ width:240, minWidth:240, background:'var(--sidebar-bg)', borderRight:'1px solid rgba(255,255,255,.06)', display:'flex', flexDirection:'column', position:'sticky', top:0, height:'100vh', zIndex:20 }}>
        {/* Logo */}
        <Link href="/dashboard" style={{ padding:'18px 18px 14px', display:'flex', alignItems:'center', gap:11, textDecoration:'none', borderBottom:'1px solid rgba(255,255,255,.06)', flexShrink:0 }}>
          <div style={{ width:36, height:36, minWidth:36, borderRadius:10, background:'var(--accent-dim)', border:'1px solid var(--accent-border)', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke={accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 6 6a6 6 0 0 0 6-6V4a2 2 0 0 0-2-2h-1a.2.2 0 1 0 .3.3"/>
              <path d="M8 15v1a6 6 0 0 0 6 6a6 6 0 0 0 6-6v-4"/>
              <circle cx="20" cy="10" r="2"/>
            </svg>
          </div>
          <div>
            <div style={{ fontWeight:800, fontSize:15, color:'white', letterSpacing:'-.3px' }}>InterimPro</div>
            <div style={{ fontSize:10, color:'rgba(255,255,255,.35)', fontWeight:500 }}>Missions infirmières</div>
          </div>
        </Link>

        {/* Navigation */}
        <nav style={{ flex:1, padding:'10px 10px', display:'flex', flexDirection:'column', gap:2, overflowY:'auto' }}>
          {NAV.map(item => {
            const active = isActive(item)
            return (
              <Link key={item.href} href={item.href} style={{ display:'flex', alignItems:'center', gap:11, padding:'10px 13px', borderRadius:10, textDecoration:'none', background:active?`${accent}20`:'transparent', color:active?accent:'rgba(255,255,255,.5)', fontWeight:active?600:400, fontSize:14, transition:'all .15s', border:active?`1px solid ${accent}30`:'1px solid transparent', boxSizing:'border-box' }}>
                <div style={{ flexShrink:0 }}>{item.icon}</div>
                {t(lang, item.key)}
              </Link>
            )
          })}
        </nav>

        {/* User footer */}
        <div style={{ padding:'12px 10px 16px', borderTop:'1px solid rgba(255,255,255,.06)', flexShrink:0 }}>
          <div style={{ padding:'9px 13px', background:'var(--accent-dim)', borderRadius:10, marginBottom:10 }}>
            <div style={{ fontSize:12, color:'rgba(255,255,255,.5)', marginBottom:1 }}>Bonjour 👋</div>
            <div style={{ fontSize:14, fontWeight:700, color:'white' }}>{displayName}</div>
            <div style={{ display:'inline-block', fontSize:10, color:accent, background:`${accent}20`, border:`1px solid ${accent}40`, borderRadius:100, padding:'2px 8px', marginTop:3 }}>
              {profile?.specialite||'Infirmier(e)'}
            </div>
          </div>
          {[
            { icon:'👤', label:'Mon compte', action:()=>setShowCompte(true) },
            { icon:'⚙️', label:'Paramètres', action:()=>setShowSettings(true) },
          ].map(item=>(
            <button key={item.label} onClick={item.action} style={{ width:'100%', display:'flex', alignItems:'center', gap:10, padding:'8px 13px', borderRadius:8, border:'none', background:'transparent', color:'rgba(255,255,255,.45)', cursor:'pointer', fontSize:13, marginBottom:1, textAlign:'left' }}>
              <span>{item.icon}</span>{item.label}
            </button>
          ))}
          <button onClick={logout} style={{ width:'100%', display:'flex', alignItems:'center', gap:10, padding:'8px 13px', borderRadius:8, border:'none', background:'transparent', color:'rgba(239,68,68,.6)', cursor:'pointer', fontSize:13, textAlign:'left', marginTop:4 }}>
            <span>🚪</span>Déconnexion
          </button>
        </div>
      </aside>

      {/* MAIN */}
      <main style={{ flex:1, display:'flex', flexDirection:'column', minWidth:0 }}>
        {/* Topbar */}
        <div style={{ height:56, display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 28px', borderBottom:'1px solid var(--topbar-border)', background:'var(--bg)', position:'sticky', top:0, zIndex:15 }}>
          <div style={{ fontSize:11, color:'var(--text-dim)', fontVariantNumeric:'tabular-nums' }}>
            {new Date().toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long',year:'numeric'}).replace(/^\w/,c=>c.toUpperCase())}
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <div style={{ fontSize:15, fontWeight:700, color:'var(--text)', fontVariantNumeric:'tabular-nums' }}>{time}</div>
            <div style={{ position:'relative' }}>
              <button onClick={()=>setShowNotif(!showNotif)} style={{ width:36, height:36, borderRadius:'50%', background:'var(--bg-card)', border:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', color:'var(--text-muted)', position:'relative' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
                {notifCount>0 && <span style={{ position:'absolute', top:-3, right:-3, width:17, height:17, borderRadius:'50%', background:'#ef4444', color:'white', fontSize:9, fontWeight:800, display:'flex', alignItems:'center', justifyContent:'center', border:'2px solid var(--bg)' }}>{notifCount>9?'9+':notifCount}</span>}
              </button>
              {showNotif && <NotifPanel missions={missions} etabs={etabs} onClose={()=>setShowNotif(false)}/>}
            </div>
          </div>
        </div>

        {/* Content */}
        <div style={{ flex:1, overflowY:'auto', padding:'28px 36px', background:'var(--bg)' }}>
          <div style={{ maxWidth:880, margin:'0 auto' }}>
            {children}
          </div>
        </div>
      </main>

      {showCompte && <MonCompteModal user={user} onClose={()=>setShowCompte(false)}/>}
      {showSettings && <SettingsModal onClose={()=>setShowSettings(false)}/>}
    </div>
  )
}
