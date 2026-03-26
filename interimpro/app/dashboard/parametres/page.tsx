'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

const SPECS = ['Infirmier(e)','Aide-soignant(e)','Infirmier(e) specialise(e)','Cadre de sante','Puericulteur(trice)','IBODE','IADE','Autre']

export default function ParametresPage() {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState({ first_name:'', last_name:'', telephone:'', specialite:'Infirmier(e)', numero_rpps:'' })
  const [prefs, setPrefs] = useState({ objectif_heures_mensuel: 151.67 })
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      const [p, pref] = await Promise.all([
        supabase.from('user_profiles').select('*').eq('user_id', user?.id).single(),
        supabase.from('user_preferences').select('*').eq('user_id', user?.id).single()
      ])
      if (p.data) setProfile({ first_name:p.data.first_name||'', last_name:p.data.last_name||'', telephone:p.data.telephone||'', specialite:p.data.specialite||'Infirmier(e)', numero_rpps:p.data.numero_rpps||'' })
      if (pref.data) setPrefs({ objectif_heures_mensuel: pref.data.objectif_heures_mensuel || 151.67 })
      setLoading(false)
    }
    load()
  }, [])

  const flash = () => { setSaved(true); setTimeout(() => setSaved(false), 2500) }

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    const { data: { user } } = await supabase.auth.getUser()
    const data = { ...profile, nom_complet: profile.first_name + ' ' + profile.last_name, user_id: user?.id }
    const existing = await supabase.from('user_profiles').select('id').eq('user_id', user?.id).single()
    if (existing.data) await supabase.from('user_profiles').update(data).eq('user_id', user?.id)
    else await supabase.from('user_profiles').insert({ ...data, id: user?.id })
    flash()
  }

  const savePrefs = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    const existing = await supabase.from('user_preferences').select('id').eq('user_id', user?.id).single()
    if (existing.data) await supabase.from('user_preferences').update(prefs).eq('user_id', user?.id)
    else await supabase.from('user_preferences').insert({ ...prefs, user_id: user?.id, id: user?.id })
    flash()
  }

  const inp = { width:'100%', padding:'10px 12px', borderRadius:'8px', border:'1px solid var(--border)', background:'var(--bg-primary)', color:'var(--text-primary)', fontSize:'14px', outline:'none', boxSizing:'border-box' as const }

  if (loading) return <div style={{ textAlign:'center', padding:'40px', color:'var(--text-secondary)' }}>Chargement...</div>

  return (
    <div style={{ maxWidth:'600px' }}>
      <div style={{ marginBottom:'24px' }}>
        <h1 style={{ fontSize:'22px', fontWeight:800, color:'var(--text-primary)', marginBottom:'2px' }}>Parametres</h1>
        <p style={{ fontSize:'13px', color:'var(--text-secondary)' }}>Gerez votre profil et vos preferences</p>
      </div>

      {saved && (
        <div style={{ padding:'12px 16px', borderRadius:'10px', background:'#f0fdf4', border:'1px solid #86efac', color:'#166534', fontSize:'14px', marginBottom:'16px' }}>
          ✅ Enregistre avec succes !
        </div>
      )}

      <div style={{ background:'white', border:'1px solid var(--border)', borderRadius:'12px', padding:'22px', marginBottom:'16px' }}>
        <h2 style={{ fontSize:'15px', fontWeight:700, color:'var(--text-primary)', marginBottom:'14px' }}>Compte Google</h2>
        <div style={{ display:'flex', alignItems:'center', gap:'12px', padding:'12px', borderRadius:'10px', background:'var(--bg-primary)', border:'1px solid var(--border)' }}>
          {user?.user_metadata?.avatar_url && <img src={user.user_metadata.avatar_url} style={{ width:44, height:44, borderRadius:'50%', border:'2px solid rgba(232,123,249,0.3)' }} alt="" />}
          <div style={{ flex:1 }}>
            <div style={{ fontSize:'14px', fontWeight:600, color:'var(--text-primary)' }}>{user?.user_metadata?.full_name || 'Utilisateur'}</div>
            <div style={{ fontSize:'12px', color:'var(--text-secondary)' }}>{user?.email}</div>
          </div>
          <span style={{ padding:'4px 10px', borderRadius:'100px', background:'rgba(232,123,249,0.1)', border:'1px solid rgba(232,123,249,0.2)', color:'var(--accent)', fontSize:'11px', fontWeight:600 }}>Connecte</span>
        </div>
      </div>

      <div style={{ background:'white', border:'1px solid var(--border)', borderRadius:'12px', padding:'22px', marginBottom:'16px' }}>
        <h2 style={{ fontSize:'15px', fontWeight:700, color:'var(--text-primary)', marginBottom:'14px' }}>Profil professionnel</h2>
        <form onSubmit={saveProfile} style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px' }}>
            <div><label style={{ display:'block', fontSize:'12px', fontWeight:500, color:'var(--text-secondary)', marginBottom:'4px' }}>Prenom</label><input value={profile.first_name} onChange={e=>setProfile({...profile,first_name:e.target.value})} placeholder="Solesne" style={inp}/></div>
            <div><label style={{ display:'block', fontSize:'12px', fontWeight:500, color:'var(--text-secondary)', marginBottom:'4px' }}>Nom</label><input value={profile.last_name} onChange={e=>setProfile({...profile,last_name:e.target.value})} placeholder="Bonnin" style={inp}/></div>
          </div>
          <div><label style={{ display:'block', fontSize:'12px', fontWeight:500, color:'var(--text-secondary)', marginBottom:'4px' }}>Specialite</label><select value={profile.specialite} onChange={e=>setProfile({...profile,specialite:e.target.value})} style={inp}>{SPECS.map(s=><option key={s} value={s}>{s}</option>)}</select></div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px' }}>
            <div><label style={{ display:'block', fontSize:'12px', fontWeight:500, color:'var(--text-secondary)', marginBottom:'4px' }}>Telephone</label><input value={profile.telephone} onChange={e=>setProfile({...profile,telephone:e.target.value})} placeholder="06 XX XX XX XX" style={inp}/></div>
            <div><label style={{ display:'block', fontSize:'12px', fontWeight:500, color:'var(--text-secondary)', marginBottom:'4px' }}>Numero RPPS</label><input value={profile.numero_rpps} onChange={e=>setProfile({...profile,numero_rpps:e.target.value})} placeholder="RPPS..." style={inp}/></div>
          </div>
          <button type="submit" style={{ padding:'10px 18px', borderRadius:'9px', background:'var(--accent)', color:'white', border:'none', cursor:'pointer', fontSize:'14px', fontWeight:600, alignSelf:'flex-start', boxShadow:'0 2px 8px rgba(232,123,249,0.25)' }}>Enregistrer le profil</button>
        </form>
      </div>

      <div style={{ background:'white', border:'1px solid var(--border)', borderRadius:'12px', padding:'22px' }}>
        <h2 style={{ fontSize:'15px', fontWeight:700, color:'var(--text-primary)', marginBottom:'14px' }}>Preferences</h2>
        <div style={{ marginBottom:'16px' }}>
          <label style={{ display:'block', fontSize:'12px', fontWeight:500, color:'var(--text-secondary)', marginBottom:'6px' }}>Objectif heures mensuelles</label>
          <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
            <input type="number" step="0.5" value={prefs.objectif_heures_mensuel} onChange={e=>setPrefs({...prefs,objectif_heures_mensuel:Number(e.target.value)})} style={{ ...inp, width:'140px' }} />
            <span style={{ fontSize:'12px', color:'var(--text-secondary)' }}>h / mois &nbsp;(temps plein = 151.67h)</span>
          </div>
        </div>
        <button onClick={savePrefs} style={{ padding:'10px 18px', borderRadius:'9px', background:'var(--accent)', color:'white', border:'none', cursor:'pointer', fontSize:'14px', fontWeight:600, boxShadow:'0 2px 8px rgba(232,123,249,0.25)' }}>Enregistrer les preferences</button>
      </div>
    </div>
  )
}
