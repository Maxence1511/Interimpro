'use client'
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { getSupabase } from '@/lib/supabase/client'
import { useTheme } from '@/lib/theme-context'
import { t } from '@/lib/i18n'

const NAV = [
  { key:'nav.dashboard', href:'/dashboard', exact:true, e:'🏠' },
  { key:'nav.missions', href:'/dashboard/missions', e:'✅' },
  { key:'nav.etablissements', href:'/dashboard/etablissements', e:'🏥' },
  { key:'nav.calendrier', href:'/dashboard/calendrier', e:'📅' },
  { key:'nav.analyses', href:'/dashboard/analyses', e:'📊' },
  { key:'nav.import', href:'/dashboard/import-gcal', e:'🗓️' },
]

function SettingsModal({ onClose }: { onClose:()=>void }) {
  const { accent, darkMode, lang, objectif, setAccent, setDarkMode, setLang, setObjectif, savePrefs } = useTheme()
  const [saving, setSaving] = useState(false)
  const [ok, setOk] = useState(false)
  const COLORS = ['#3b82f6','#6366f1','#8b5cf6','#a855f7','#e879f9','#ec4899','#f43f5e','#ef4444','#f97316','#f59e0b','#eab308','#22c55e','#10b981','#14b8a6','#22d3ee','#38bdf8','#94a3b8','#6b7280','#fb7185','#818cf8','#2dd4bf','#a3e635','#facc15','#4ade80']
  const save = async () => { setSaving(true); await savePrefs(); setSaving(false); setOk(true); setTimeout(()=>setOk(false),2500) }
  const S: React.CSSProperties = { background:'var(--bg-input)', borderRadius:10, padding:'16px 18px', marginBottom:12 }
  return (
    <div style={{ position:'fixed', inset:0, background:'var(--overlay)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{ background:'var(--bg-modal)', border:'1px solid var(--border)', borderRadius:16, padding:28, width:'100%', maxWidth:520, maxHeight:'88vh', overflow:'auto', boxShadow:'0 24px 60px var(--shadow)' }}>
        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:22 }}>
          <h2 style={{ fontSize:18, fontWeight:800, color:'var(--text)' }}>Paramètres</h2>
          <button onClick={onClose} style={{ background:'none', border:'none', color:'var(--text-dim)', cursor:'pointer', fontSize:22 }}>✕</button>
        </div>
        {ok && <div style={{ padding:'8px 12px', borderRadius:8, background:'rgba(16,185,129,.12)', color:'#10b981', fontSize:13, marginBottom:14, textAlign:'center', fontWeight:600 }}>✅ Sauvegardé !</div>}
        <div style={S}>
          <div style={{ fontSize:14, fontWeight:700, color:'var(--text)', marginBottom:14 }}>🎨 Apparence</div>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:18 }}>
            <div><div style={{ fontSize:13, fontWeight:600, color:'var(--text)' }}>Mode sombre</div><div style={{ fontSize:11, color:'var(--text-dim)' }}>Thème sombre / clair</div></div>
            <div onClick={()=>setDarkMode(!darkMode)} style={{ width:48, height:26, borderRadius:100, background:darkMode?accent:'#e2e8f0', position:'relative', cursor:'pointer', transition:'background .2s', flexShrink:0 }}>
              <div style={{ width:22, height:22, borderRadius:'50%', background:'white', position:'absolute', top:2, left:darkMode?24:2, transition:'left .2s', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11 }}>{darkMode?'🌙':'☀️'}</div>
            </div>
          </div>
          <div style={{ fontSize:12, fontWeight:600, color:'var(--text-muted)', marginBottom:10 }}>Couleur accent</div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(8,1fr)', gap:8 }}>
            {COLORS.map(c=><div key={c} onClick={()=>setAccent(c)} style={{ aspectRatio:'1', borderRadius:8, background:c, cursor:'pointer', border:accent===c?'3px solid white':'3px solid transparent', boxShadow:accent===c?`0 0 0 2px ${c}`:'none', transform:accent===c?'scale(1.15)':'scale(1)', transition:'all .15s' }}/>)}
          </div>
        </div>
        <div style={S}>
          <div style={{ fontSize:14, fontWeight:700, color:'var(--text)', marginBottom:12 }}>🎯 Objectif mensuel (heures)</div>
          <input type="number" step="0.5" value={objectif} onChange={e=>setObjectif(Number(e.target.value))} style={{ padding:'8px 12px', borderRadius:8, border:'1px solid var(--border)', background:'var(--bg-card)', color:'var(--text)', fontSize:14, outline:'none', width:140 }}/>
        </div>
        <div style={S}>
          <div style={{ fontSize:14, fontWeight:700, color:'var(--text)', marginBottom:12 }}>🌍 Langue</div>
          <div style={{ display:'flex', gap:8 }}>
            {[{v:'fr',l:'Français',f:'🇫🇷'},{v:'en',l:'English',f:'🇬🇧'},{v:'es',l:'Español',f:'🇪🇸'}].map(item=>(
              <button key={item.v} onClick={()=>setLang(item.v as any)} style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 14px', borderRadius:8, border:`1.5px solid ${lang===item.v?accent:'var(--border)'}`, background:lang===item.v?'var(--accent-dim)':'transparent', color:lang===item.v?accent:'var(--text-muted)', cursor:'pointer', fontSize:13, fontWeight:lang===item.v?700:400 }}><span>{item.f}</span>{item.l}</button>
            ))}
          </div>
        </div>
        <button onClick={save} disabled={saving} style={{ width:'100%', padding:13, borderRadius:10, border:'none', background:`linear-gradient(135deg,${accent},#a855f7)`, color:'white', fontSize:15, fontWeight:700, cursor:'pointer' }}>{saving?'Sauvegarde...':'💾 Sauvegarder'}</button>
      </div>
    </div>
  )
}

function MonCompteModal({ user, onClose }: { user:any; onClose:()=>void }) {
  const { accent, userId } = useTheme()
  const [form, setForm] = useState({ first_name:'', last_name:'', telephone:'', specialite:'Infirmier(e)', numero_rpps:'', photo_url:'' })
  const [saving, setSaving] = useState(false); const [ok, setOk] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const inp: React.CSSProperties = { width:'100%', padding:'9px 12px', borderRadius:8, border:'1px solid var(--border)', background:'var(--bg-input)', color:'var(--text)', fontSize:13, outline:'none', boxSizing:'border-box' }

  useEffect(() => {
    if (!userId) return
    getSupabase().from('user_profiles').select('*').eq('user_id',userId).maybeSingle()
      .then(({ data }) => { if (data) setForm({ first_name:data.first_name||'', last_name:data.last_name||'', telephone:data.telephone||'', specialite:data.specialite||'Infirmier(e)', numero_rpps:data.numero_rpps||'', photo_url:data.photo_url||'' }) })
  }, [userId])

  const uploadPhoto = async (file: File) => {
    if (!userId) return; setUploading(true)
    const ext = file.name.split('.').pop()
    const path = `${userId}/avatar.${ext}`
    await getSupabase().storage.from('avatars').upload(path, file, { upsert:true })
    const { data: { publicUrl } } = getSupabase().storage.from('avatars').getPublicUrl(path)
    setForm(f => ({...f, photo_url: publicUrl+'?t='+Date.now()})); setUploading(false)
  }

  const save = async () => {
    if (!userId) return; setSaving(true)
    const sb = getSupabase()
    const payload = { user_id:userId, first_name:form.first_name, last_name:form.last_name, nom_complet:`${form.first_name} ${form.last_name}`.trim(), telephone:form.telephone, specialite:form.specialite, numero_rpps:form.numero_rpps, photo_url:form.photo_url }
    const { data:ex } = await sb.from('user_profiles').select('id').eq('user_id',userId).maybeSingle()
    if (ex) await sb.from('user_profiles').update(payload).eq('user_id',userId)
    else await sb.from('user_profiles').insert(payload)
    setSaving(false); setOk(true); setTimeout(()=>setOk(false),2500)
  }

  const initials = `${form.first_name?.[0]||''}${form.last_name?.[0]||''}`.toUpperCase() || user?.email?.[0]?.toUpperCase() || '?'

  return (
    <div style={{ position:'fixed', inset:0, background:'var(--overlay)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{ background:'var(--bg-modal)', border:'1px solid var(--border)', borderRadius:16, padding:28, width:'100%', maxWidth:440, maxHeight:'90vh', overflow:'auto', boxShadow:'0 24px 60px var(--shadow)' }}>
        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:20 }}>
          <h2 style={{ fontSize:17, fontWeight:700, color:'var(--text)' }}>Mon compte</h2>
          <button onClick={onClose} style={{ background:'none', border:'none', color:'var(--text-dim)', cursor:'pointer', fontSize:22 }}>✕</button>
        </div>
        <div style={{ textAlign:'center', marginBottom:18 }}>
          <div onClick={()=>fileRef.current?.click()} style={{ width:80, height:80, borderRadius:'50%', margin:'0 auto 8px', cursor:'pointer', border:`3px solid ${accent}`, background:'var(--bg-input)', display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden' }}>
            {form.photo_url?<img src={form.photo_url} style={{ width:'100%', height:'100%', objectFit:'cover' }} alt=""/>:<span style={{ fontSize:28, fontWeight:700, color:accent }}>{initials}</span>}
          </div>
          <div style={{ fontSize:11, color:'var(--text-dim)', cursor:'pointer' }} onClick={()=>fileRef.current?.click()}>{uploading?'⏳ Upload...':'📷 Changer la photo'}</div>
          <input ref={fileRef} type="file" accept="image/*" style={{ display:'none' }} onChange={e=>e.target.files?.[0]&&uploadPhoto(e.target.files[0])}/>
        </div>
        <div style={{ background:'var(--bg-input)', borderRadius:8, padding:'9px 12px', marginBottom:14, fontSize:13, color:'var(--text-dim)' }}>📧 {user?.email}</div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:10 }}>
          <div><label style={{ display:'block', fontSize:11, color:'var(--text-muted)', marginBottom:4 }}>Prénom</label><input value={form.first_name} onChange={e=>setForm({...form,first_name:e.target.value})} style={inp}/></div>
          <div><label style={{ display:'block', fontSize:11, color:'var(--text-muted)', marginBottom:4 }}>Nom</label><input value={form.last_name} onChange={e=>setForm({...form,last_name:e.target.value})} style={inp}/></div>
        </div>
        <div style={{ marginBottom:10 }}><label style={{ display:'block', fontSize:11, color:'var(--text-muted)', marginBottom:4 }}>Téléphone</label><input value={form.telephone} onChange={e=>setForm({...form,telephone:e.target.value})} style={inp}/></div>
        <div style={{ marginBottom:10 }}><label style={{ display:'block', fontSize:11, color:'var(--text-muted)', marginBottom:4 }}>Spécialité</label>
          <select value={form.specialite} onChange={e=>setForm({...form,specialite:e.target.value})} style={inp}>
            {['Infirmier(e)','Aide-soignant(e)','Infirmier(e) spécialisé(e)','Cadre de santé','IBODE','IADE','Puériculteur(trice)','Autre'].map(s=><option key={s}>{s}</option>)}
          </select>
        </div>
        <div style={{ marginBottom:18 }}><label style={{ display:'block', fontSize:11, color:'var(--text-muted)', marginBottom:4 }}>N° RPPS</label><input value={form.numero_rpps} onChange={e=>setForm({...form,numero_rpps:e.target.value})} style={inp}/></div>
        {ok&&<div style={{ padding:'8px 12px', borderRadius:7, background:'rgba(16,185,129,.12)', color:'#10b981', fontSize:13, marginBottom:12, textAlign:'center' }}>✅ Sauvegardé !</div>}
        <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
          <button onClick={onClose} style={{ padding:'9px 18px', borderRadius:8, border:'1px solid var(--border)', background:'transparent', color:'var(--text-muted)', cursor:'pointer', fontSize:13 }}>Annuler</button>
          <button onClick={save} disabled={saving} style={{ padding:'9px 20px', borderRadius:8, border:'none', background:`linear-gradient(135deg,${accent},#a855f7)`, color:'white', cursor:'pointer', fontSize:13, fontWeight:700 }}>{saving?'...':'Sauvegarder'}</button>
        </div>
      </div>
    </div>
  )
}

export default function DashboardLayout({ children }: { children:React.ReactNode }) {
  const [user, setUser] = useState<any>(null)
  const [ready, setReady] = useState(false)
  const [profile, setProfile] = useState<any>(null)
  const [showSettings, setShowSettings] = useState(false)
  const [showCompte, setShowCompte] = useState(false)
  const [time, setTime] = useState('')
  const [dateStr, setDateStr] = useState('')
  const pathname = usePathname()
  const { accent, darkMode, lang } = useTheme()

  useEffect(() => {
    const sb = getSupabase()

    // Récupérer la session directement - méthode la plus fiable
    const initSession = async () => {
      const { data: { session } } = await sb.auth.getSession()
      if (session?.user) {
        setUser(session.user)
        setReady(true)
        sb.from('user_profiles').select('first_name,last_name,specialite,photo_url')
          .eq('user_id', session.user.id).maybeSingle()
          .then(({ data }) => { if (data) setProfile(data) })
        return
      }
      // Pas de session - écouter si elle arrive (implicit flow)
      const { data: { subscription } } = sb.auth.onAuthStateChange((event, session) => {
        if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session?.user) {
          subscription.unsubscribe()
          setUser(session.user)
          setReady(true)
          sb.from('user_profiles').select('first_name,last_name,specialite,photo_url')
            .eq('user_id', session.user.id).maybeSingle()
            .then(({ data }) => { if (data) setProfile(data) })
        } else if (event === 'SIGNED_OUT') {
          subscription.unsubscribe()
          window.location.replace('/')
        }
      })
      // Timeout 6s sans session → login
      setTimeout(() => {
        subscription.unsubscribe()
        if (!ready) window.location.replace('/')
      }, 6000)
    }

    initSession()

    // Écouter déconnexion
    const { data: { subscription: logoutSub } } = sb.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') window.location.replace('/')
    })
    return () => logoutSub.unsubscribe()
  }, [])

  useEffect(() => {
    const tick = () => {
      const n = new Date()
      setTime(n.toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit',second:'2-digit'}))
      setDateStr(n.toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long',year:'numeric'}).replace(/^\w/,c=>c.toUpperCase()))
    }
    tick(); const id = setInterval(tick,1000); return () => clearInterval(id)
  }, [])

  const logout = async () => { await getSupabase().auth.signOut(); window.location.replace('/') }
  const isActive = (item:typeof NAV[0]) => item.exact ? pathname===item.href : pathname.startsWith(item.href)
  const displayName = profile?.first_name || user?.user_metadata?.name?.split(' ')[0] || user?.email?.split('@')[0] || ''
  const initials = `${profile?.first_name?.[0]||''}${profile?.last_name?.[0]||''}`.toUpperCase() || displayName?.[0]?.toUpperCase() || '?'

  // Sidebar : toujours sombre peu importe le thème du reste
  const sbBg = '#0d1526'
  const sbBorder = 'rgba(255,255,255,0.06)'
  const sbText = 'rgba(255,255,255,0.55)'

  if (!ready) return (
    <div style={{ minHeight:'100vh', background:'var(--bg)', display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:14 }}>
      <div style={{ width:38, height:38, borderRadius:'50%', border:`3px solid ${accent}30`, borderTop:`3px solid ${accent}`, animation:'spin .8s linear infinite' }}/>
      <div style={{ fontSize:13, color:'var(--text-dim)' }}>Chargement...</div>
      <style>{'@keyframes spin{to{transform:rotate(360deg)}}'}</style>
    </div>
  )
  if (!user) return null

  return (
    <>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}`}</style>
      <div style={{ display:'flex', minHeight:'100vh', background:'var(--bg)' }}>
        {/* SIDEBAR — couleur fixée indépendamment du thème */}
        <aside style={{ width:230, minWidth:230, background:sbBg, display:'flex', flexDirection:'column', position:'sticky', top:0, height:'100vh', zIndex:20, borderRight:`1px solid ${sbBorder}` }}>
          <Link href="/dashboard" style={{ padding:'18px 16px 14px', display:'flex', alignItems:'center', gap:10, textDecoration:'none', borderBottom:`1px solid ${sbBorder}` }}>
            <div style={{ width:36, height:36, minWidth:36, borderRadius:10, background:`${accent}20`, border:`1px solid ${accent}40`, display:'flex', alignItems:'center', justifyContent:'center' }}>
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke={accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 6 6a6 6 0 0 0 6-6V4a2 2 0 0 0-2-2h-1a.2.2 0 1 0 .3.3"/>
                <path d="M8 15v1a6 6 0 0 0 6 6a6 6 0 0 0 6-6v-4"/><circle cx="20" cy="10" r="2"/>
              </svg>
            </div>
            <div>
              <div style={{ fontWeight:800, fontSize:15, color:'white', letterSpacing:'-.3px' }}>InterimPro</div>
              <div style={{ fontSize:10, color:'rgba(255,255,255,.35)' }}>Missions infirmières</div>
            </div>
          </Link>
          <nav style={{ flex:1, padding:'10px 8px', display:'flex', flexDirection:'column', gap:2, overflowY:'auto' }}>
            {NAV.map(item => {
              const active = isActive(item)
              return (
                <Link key={item.href} href={item.href} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 12px', borderRadius:10, textDecoration:'none', background:active?`${accent}25`:'transparent', color:active?accent:sbText, fontWeight:active?600:400, fontSize:14, border:`1px solid ${active?accent+'40':'transparent'}`, transition:'all .15s', boxSizing:'border-box' }}>
                  <span style={{ fontSize:16 }}>{item.e}</span>{t(lang,item.key)}
                </Link>
              )
            })}
          </nav>
          <div style={{ padding:'10px 8px 16px', borderTop:`1px solid ${sbBorder}` }}>
            <div style={{ padding:'10px 12px', borderRadius:10, background:'rgba(255,255,255,.05)', marginBottom:6, display:'flex', alignItems:'center', gap:10, cursor:'pointer' }} onClick={()=>setShowCompte(true)}>
              <div style={{ width:36, height:36, minWidth:36, borderRadius:'50%', border:`2px solid ${accent}60`, overflow:'hidden', background:`${accent}20`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                {profile?.photo_url?<img src={profile.photo_url} style={{ width:'100%', height:'100%', objectFit:'cover' }} alt=""/>:<span style={{ fontSize:15, fontWeight:700, color:accent }}>{initials}</span>}
              </div>
              <div style={{ minWidth:0 }}>
                <div style={{ fontSize:13, fontWeight:700, color:'white', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{displayName||user.email}</div>
                <span style={{ display:'inline-block', fontSize:10, color:accent, background:`${accent}20`, border:`1px solid ${accent}40`, borderRadius:100, padding:'1px 7px', marginTop:2 }}>{profile?.specialite||'Infirmier(e)'}</span>
              </div>
            </div>
            <button onClick={()=>setShowSettings(true)} style={{ width:'100%', display:'flex', alignItems:'center', gap:10, padding:'8px 12px', borderRadius:8, border:'none', background:'transparent', color:'rgba(255,255,255,.45)', cursor:'pointer', fontSize:13, marginBottom:1, textAlign:'left' }}>⚙️ Paramètres</button>
            <button onClick={logout} style={{ width:'100%', display:'flex', alignItems:'center', gap:10, padding:'8px 12px', borderRadius:8, border:'none', background:'transparent', color:'rgba(239,68,68,.7)', cursor:'pointer', fontSize:13, textAlign:'left' }}>🚪 Déconnexion</button>
          </div>
        </aside>

        {/* MAIN */}
        <main style={{ flex:1, display:'flex', flexDirection:'column', minWidth:0 }}>
          <div style={{ height:56, display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 36px', borderBottom:'1px solid var(--topbar-border)', background:'var(--bg)', position:'sticky', top:0, zIndex:15 }}>
            <div style={{ fontSize:18, fontWeight:700, color:'var(--text)' }}>{dateStr}</div>
            <div style={{ fontSize:16, fontWeight:700, color:'var(--text)', fontVariantNumeric:'tabular-nums' }}>{time}</div>
          </div>
          <div style={{ flex:1, overflowY:'auto', padding:'32px 40px', background:'var(--bg)' }}>
            <div style={{ maxWidth:1100, margin:'0 auto' }}>{children}</div>
          </div>
        </main>

        {showSettings && <SettingsModal onClose={()=>setShowSettings(false)}/>}
        {showCompte && <MonCompteModal user={user} onClose={()=>setShowCompte(false)}/>}
      </div>
    </>
  )
}
