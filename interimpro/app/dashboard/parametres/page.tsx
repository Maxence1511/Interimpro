'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useTheme } from '@/lib/theme-context'

const COLORS = [
  '#3b82f6','#6366f1','#8b5cf6','#a855f7','#e879f9','#ec4899','#f43f5e','#ef4444',
  '#dc2626','#f97316','#f59e0b','#eab308','#ca8a04','#84cc16','#22c55e','#10b981',
  '#14b8a6','#06b6d4','#22d3ee','#38bdf8','#94a3b8','#6b7280','#4b5563','#374151',
]
const LANGS = [
  { value:'fr', label:'Français', flag:'🇫🇷' },
  { value:'en', label:'English', flag:'🇬🇧' },
  { value:'es', label:'Español', flag:'🇪🇸' },
]

export default function ParametresPage() {
  const { accent, darkMode, setAccent, setDarkMode, savePrefs } = useTheme()
  const [objectif, setObjectif] = useState(152)
  const [langue, setLangue] = useState('fr')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase.from('user_preferences').select('*').eq('user_id', user.id).single()
      if (data) {
        setObjectif(data.objectif_heures_mensuel || 152)
        setLangue(data.langue || 'fr')
      }
    }
    load()
  }, [])

  const save = async () => {
    setSaving(true)
    // Sauvegarder les couleurs via le ThemeContext
    await savePrefs()
    // Sauvegarder les autres prefs dans Supabase
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: ex } = await supabase.from('user_preferences').select('id').eq('user_id', user.id).single()
      const payload = { couleur_theme: accent, mode_sombre: darkMode, objectif_heures_mensuel: objectif, langue, user_id: user.id }
      if (ex) await supabase.from('user_preferences').update(payload).eq('user_id', user.id)
      else await supabase.from('user_preferences').insert({ ...payload, id: user.id })
    }
    setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 2500)
  }

  const section: React.CSSProperties = { background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:12, padding:24, marginBottom:14 }
  const inp: React.CSSProperties = { padding:'8px 12px', borderRadius:8, border:'1px solid var(--border)', background:'var(--bg-input)', color:'var(--text)', fontSize:14, outline:'none' }

  return (
    <div style={{ maxWidth:640 }}>
      <h1 style={{ fontSize:22, fontWeight:800, color:'var(--text)', marginBottom:22 }}>Paramètres</h1>

      {saved && <div style={{ padding:'10px 14px', borderRadius:9, background:'rgba(16,185,129,.1)', border:'1px solid rgba(16,185,129,.3)', fontSize:13, color:'#10b981', marginBottom:14, fontWeight:600, animation:'fadeIn .2s ease' }}>✅ Paramètres sauvegardés !</div>}

      {/* Aperçu couleur en temps réel */}
      <div style={{ ...section, display:'flex', alignItems:'center', gap:12, padding:'14px 20px', background:'var(--accent-dim)', border:'1px solid var(--accent-border)' }}>
        <div style={{ width:36, height:36, borderRadius:9, background:accent, boxShadow:`0 4px 12px ${accent}60`, flexShrink:0 }} />
        <div>
          <div style={{ fontSize:13, fontWeight:700, color:'var(--text)' }}>Aperçu de votre thème</div>
          <div style={{ fontSize:12, color:'var(--text-muted)' }}>{darkMode ? '🌙 Mode sombre' : '☀️ Mode clair'} — Accent <code style={{ color:accent }}>{accent}</code></div>
        </div>
      </div>

      {/* Apparence */}
      <div style={section}>
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:20 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
          <h2 style={{ fontSize:15, fontWeight:700, color:'var(--text)' }}>Apparence</h2>
        </div>

        {/* Toggle dark mode */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24, padding:'12px 14px', background:'var(--bg-input)', borderRadius:9 }}>
          <div>
            <div style={{ fontSize:13, fontWeight:600, color:'var(--text)', marginBottom:2 }}>Mode sombre</div>
            <div style={{ fontSize:12, color:'var(--text-dim)' }}>Basculer entre thème sombre et clair</div>
          </div>
          <div onClick={() => setDarkMode(!darkMode)} style={{ width:48, height:26, borderRadius:100, background: darkMode ? accent : 'var(--border)', position:'relative', cursor:'pointer', transition:'background .25s', flexShrink:0 }}>
            <div style={{ width:22, height:22, borderRadius:'50%', background:'white', position:'absolute', top:2, left: darkMode ? 24 : 2, transition:'left .25s', boxShadow:'0 1px 4px rgba(0,0,0,.3)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12 }}>
              {darkMode ? '🌙' : '☀️'}
            </div>
          </div>
        </div>

        {/* Couleurs */}
        <div>
          <div style={{ fontSize:13, fontWeight:600, color:'var(--text)', marginBottom:4 }}>Couleur accent ({COLORS.length})</div>
          <div style={{ fontSize:11, color:'var(--text-dim)', marginBottom:12 }}>Appliquée à toute l'interface en temps réel</div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(8, 1fr)', gap:8 }}>
            {COLORS.map(c => (
              <div key={c} onClick={() => setAccent(c)}
                title={c}
                style={{ width:'100%', aspectRatio:'1', borderRadius:10, background:c, cursor:'pointer', border: accent===c ? '3px solid white' : '3px solid transparent', boxShadow: accent===c ? `0 0 0 2px ${c}, 0 4px 12px ${c}60` : `0 2px 6px ${c}30`, transition:'all .15s', transform: accent===c ? 'scale(1.1)' : 'scale(1)' }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Objectifs */}
      <div style={section}>
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:18 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>
          <h2 style={{ fontSize:15, fontWeight:700, color:'var(--text)' }}>Objectifs</h2>
        </div>
        <div>
          <label style={{ display:'block', fontSize:13, fontWeight:500, color:'var(--text-muted)', marginBottom:8 }}>Objectif heures mensuelles</label>
          <input type="number" step="0.5" value={objectif} onChange={e => setObjectif(Number(e.target.value))} style={{ ...inp, width:180 }} />
          <div style={{ marginTop:8, height:5, background:'var(--bg-input)', borderRadius:100, overflow:'hidden', maxWidth:300 }}>
            <div style={{ height:'100%', width:`${Math.min((objectif/200)*100,100)}%`, background:`linear-gradient(90deg,${accent},#a855f7)`, borderRadius:100, transition:'width .3s' }} />
          </div>
          <div style={{ fontSize:11, color:'var(--text-dim)', marginTop:4 }}>{objectif}h / 200h (référence)</div>
        </div>
      </div>

      {/* Langue */}
      <div style={section}>
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:18 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
          <h2 style={{ fontSize:15, fontWeight:700, color:'var(--text)' }}>Langue &amp; Région</h2>
        </div>
        <div>
          <label style={{ display:'block', fontSize:13, fontWeight:500, color:'var(--text-muted)', marginBottom:10 }}>Langue (impacte les jours fériés du calendrier)</label>
          <div style={{ display:'flex', gap:10 }}>
            {LANGS.map(l => (
              <button key={l.value} onClick={() => setLangue(l.value)} style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 16px', borderRadius:9, border:`1.5px solid ${langue===l.value ? accent : 'var(--border)'}`, background: langue===l.value ? 'var(--accent-dim)' : 'var(--bg-input)', color: langue===l.value ? accent : 'var(--text-muted)', cursor:'pointer', fontSize:13, fontWeight: langue===l.value ? 700 : 400, transition:'all .15s' }}>
                <span style={{ fontSize:18 }}>{l.flag}</span>{l.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <button onClick={save} disabled={saving} style={{ width:'100%', padding:'14px', borderRadius:10, border:'none', background:`linear-gradient(135deg,${accent},#a855f7)`, color:'white', fontSize:15, fontWeight:700, cursor:'pointer', opacity: saving ? 0.7 : 1, display:'flex', alignItems:'center', justifyContent:'center', gap:10, boxShadow:`0 4px 20px ${accent}40`, transition:'opacity .15s' }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
        {saving ? 'Sauvegarde...' : 'Sauvegarder les paramètres'}
      </button>
    </div>
  )
}
