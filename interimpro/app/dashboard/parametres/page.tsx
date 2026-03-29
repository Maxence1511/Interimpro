'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

const SPECS = ['Infirmier(e)', 'Aide-soignant(e)', 'Infirmier(e) spécialisé(e)', 'Cadre de santé', 'Puériculteur(trice)', 'IBODE', 'IADE', 'Autre']
const inp = { width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: 14, outline: 'none', boxSizing: 'border-box' as const }

export default function ParametresPage() {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState({ first_name: '', last_name: '', telephone: '', specialite: 'Infirmier(e)', numero_rpps: '' })
  const [prefs, setPrefs] = useState({ objectif_heures_mensuel: 152 })
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      const [p, pref] = await Promise.all([
        supabase.from('user_profiles').select('*').eq('user_id', user?.id).single(),
        supabase.from('user_preferences').select('*').eq('user_id', user?.id).single(),
      ])
      if (p.data) setProfile({ first_name: p.data.first_name || '', last_name: p.data.last_name || '', telephone: p.data.telephone || '', specialite: p.data.specialite || 'Infirmier(e)', numero_rpps: p.data.numero_rpps || '' })
      if (pref.data) setPrefs({ objectif_heures_mensuel: pref.data.objectif_heures_mensuel || 152 })
      setLoading(false)
    }
    load()
  }, [])

  const flash = () => { setSaved(true); setTimeout(() => setSaved(false), 2500) }

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    const { data: { user } } = await supabase.auth.getUser()
    const payload = { ...profile, nom_complet: `${profile.first_name} ${profile.last_name}`, user_id: user?.id }
    const ex = await supabase.from('user_profiles').select('id').eq('user_id', user?.id).single()
    if (ex.data) await supabase.from('user_profiles').update(payload).eq('user_id', user?.id)
    else await supabase.from('user_profiles').insert({ ...payload, id: user?.id })
    flash()
  }

  const savePrefs = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    const ex = await supabase.from('user_preferences').select('id').eq('user_id', user?.id).single()
    if (ex.data) await supabase.from('user_preferences').update(prefs).eq('user_id', user?.id)
    else await supabase.from('user_preferences').insert({ ...prefs, user_id: user?.id, id: user?.id })
    flash()
  }

  if (loading) return <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-secondary)' }}>Chargement...</div>

  return (
    <div style={{ maxWidth: 620 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)' }}>Paramètres</h1>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>Gérez votre profil et vos préférences</p>
      </div>

      {saved && (
        <div style={{ padding: '11px 16px', borderRadius: 10, background: '#f0fdf4', border: '1px solid #86efac', color: '#166534', fontSize: 13, marginBottom: 16, fontWeight: 600 }}>
          ✅ Enregistré avec succès !
        </div>
      )}

      {/* Compte */}
      <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 12, padding: 22, marginBottom: 16 }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 14 }}>Compte Google</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 14, borderRadius: 10, background: 'var(--bg-primary)', border: '1px solid var(--border)' }}>
          {user?.user_metadata?.avatar_url && (
            <img src={user.user_metadata.avatar_url} style={{ width: 46, height: 46, borderRadius: '50%', border: '2px solid var(--accent-border)' }} alt="" />
          )}
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{user?.user_metadata?.full_name || 'Utilisateur'}</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{user?.email}</div>
          </div>
          <span style={{ padding: '3px 10px', borderRadius: 100, background: 'var(--accent-light)', border: '1px solid var(--accent-border)', color: 'var(--accent)', fontSize: 11, fontWeight: 700 }}>Connecté</span>
        </div>
      </div>

      {/* Profil */}
      <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 12, padding: 22, marginBottom: 16 }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 14 }}>Profil professionnel</h2>
        <form onSubmit={saveProfile} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>Prénom</label>
              <input value={profile.first_name} onChange={e => setProfile({ ...profile, first_name: e.target.value })} placeholder="Solesne" style={inp} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>Nom</label>
              <input value={profile.last_name} onChange={e => setProfile({ ...profile, last_name: e.target.value })} placeholder="Bonnin" style={inp} />
            </div>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>Spécialité</label>
            <select value={profile.specialite} onChange={e => setProfile({ ...profile, specialite: e.target.value })} style={inp}>
              {SPECS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>Téléphone</label>
              <input value={profile.telephone} onChange={e => setProfile({ ...profile, telephone: e.target.value })} placeholder="06 XX XX XX XX" style={inp} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>N° RPPS</label>
              <input value={profile.numero_rpps} onChange={e => setProfile({ ...profile, numero_rpps: e.target.value })} placeholder="RPPS..." style={inp} />
            </div>
          </div>
          <button type="submit" style={{ padding: '10px 18px', borderRadius: 9, background: 'var(--accent)', color: 'white', border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 700, alignSelf: 'flex-start', boxShadow: '0 2px 8px rgba(217,70,239,.25)' }}>
            Enregistrer le profil
          </button>
        </form>
      </div>

      {/* Préférences */}
      <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 12, padding: 22 }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 14 }}>Préférences</h2>
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>Objectif heures mensuelles</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <input type="number" step="0.5" value={prefs.objectif_heures_mensuel}
              onChange={e => setPrefs({ ...prefs, objectif_heures_mensuel: Number(e.target.value) })}
              style={{ ...inp, width: 130 }} />
            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>h/mois · (temps plein = 151,67h)</span>
          </div>
        </div>
        <button onClick={savePrefs} style={{ padding: '10px 18px', borderRadius: 9, background: 'var(--accent)', color: 'white', border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 700, boxShadow: '0 2px 8px rgba(217,70,239,.25)' }}>
          Enregistrer les préférences
        </button>
      </div>
    </div>
  )
}
