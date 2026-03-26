'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

const TYPES = ['EHPAD','Clinique','Hopital','Laboratoire','Reeducation','Psychiatrie','Maison de Sante','Autre']
const TYPE_COLORS: Record<string,string> = { 'EHPAD':'#f59e0b','Clinique':'#e87bf9','Hopital':'#818cf8','Laboratoire':'#34d399','Reeducation':'#8b5cf6','Psychiatrie':'#ec4899','Maison de Sante':'#14b8a6','Autre':'#94a3b8' }

export default function EtablissementsPage() {
  const [etabs, setEtabs] = useState<any[]>([])
  const [missions, setMissions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [archives, setArchives] = useState(false)
  const supabase = createClient()
  const empty = { nom:'', groupe:'', type:'Hopital', taux_horaire:14, telephone:'', email:'', notes:'' }
  const [form, setForm] = useState<any>(empty)

  const load = async () => {
    const [e, m] = await Promise.all([
      supabase.from('etablissements').select('*').order('nom'),
      supabase.from('missions').select('etablissement_id, heures, salaire_estime')
    ])
    setEtabs(e.data || []); setMissions(m.data || []); setLoading(false)
  }
  useEffect(() => { load() }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const data = { ...form, taux_horaire: Number(form.taux_horaire), archived: false }
    if (editing) await supabase.from('etablissements').update(data).eq('id', editing.id)
    else await supabase.from('etablissements').insert(data)
    setShowForm(false); setEditing(null); setForm(empty); load()
  }

  const archive = async (etab: any) => {
    await supabase.from('etablissements').update({ archived: !etab.archived, date_archive: etab.archived ? null : new Date().toISOString() }).eq('id', etab.id)
    load()
  }

  const stats = (id: string) => {
    const m = missions.filter(m => m.etablissement_id === id)
    return { count: m.length, heures: m.reduce((a,x) => a+(x.heures||0),0), revenus: m.reduce((a,x) => a+(x.salaire_estime||0),0) }
  }

  const fmtEur = (n: number) => n.toLocaleString('fr-FR',{style:'currency',currency:'EUR',maximumFractionDigits:0})
  const inp = { width:'100%', padding:'10px 12px', borderRadius:'8px', border:'1px solid var(--border)', background:'var(--bg-primary)', color:'var(--text-primary)', fontSize:'14px', outline:'none', boxSizing:'border-box' as const }
  const displayed = etabs.filter(e => archives ? e.archived : !e.archived)

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px' }}>
        <div>
          <h1 style={{ fontSize:'22px', fontWeight:800, color:'var(--text-primary)', marginBottom:'2px' }}>Etablissements</h1>
          <p style={{ fontSize:'13px', color:'var(--text-secondary)' }}>{etabs.filter(e=>!e.archived).length} actifs · {etabs.filter(e=>e.archived).length} archives</p>
        </div>
        <div style={{ display:'flex', gap:'8px' }}>
          <button onClick={() => setArchives(!archives)} style={{ padding:'9px 14px', borderRadius:'9px', border:'1px solid var(--border)', background: archives ? 'var(--accent)' : 'white', color: archives ? 'white' : 'var(--text-secondary)', cursor:'pointer', fontSize:'13px' }}>
            {archives ? 'Archives' : 'Voir archives'}
          </button>
          <button onClick={() => { setEditing(null); setForm(empty); setShowForm(true) }} style={{ padding:'9px 16px', borderRadius:'9px', background:'var(--accent)', color:'white', border:'none', cursor:'pointer', fontSize:'14px', fontWeight:600 }}>
            + Ajouter
          </button>
        </div>
      </div>

      {loading ? <div style={{ textAlign:'center', padding:'40px', color:'var(--text-secondary)' }}>Chargement...</div>
      : displayed.length === 0 ? (
        <div style={{ textAlign:'center', padding:'60px', color:'var(--text-secondary)' }}>
          <div style={{ fontSize:'36px', marginBottom:'12px' }}>🏥</div>
          <button onClick={() => setShowForm(true)} style={{ color:'var(--accent)', background:'none', border:'none', cursor:'pointer', fontSize:'14px', fontWeight:500 }}>+ Ajouter un etablissement</button>
        </div>
      ) : (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(300px, 1fr))', gap:'14px' }}>
          {displayed.map(etab => {
            const s = stats(etab.id)
            const color = TYPE_COLORS[etab.type] || '#94a3b8'
            return (
              <div key={etab.id} style={{ background:'white', border:'1px solid var(--border)', borderRadius:'12px', padding:'20px', opacity: etab.archived ? 0.65 : 1 }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'14px' }}>
                  <div>
                    <h3 style={{ fontSize:'15px', fontWeight:700, color:'var(--text-primary)', marginBottom:'3px' }}>{etab.nom}</h3>
                    {etab.groupe && <p style={{ fontSize:'12px', color:'var(--text-secondary)' }}>{etab.groupe}</p>}
                  </div>
                  <span style={{ padding:'3px 10px', borderRadius:'100px', fontSize:'11px', fontWeight:600, background:color+'20', color }}>{etab.type}</span>
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'8px', marginBottom:'14px' }}>
                  {[{label:'Missions',value:s.count},{label:'Heures',value:s.heures.toFixed(0)+'h'},{label:'Revenus',value:s.revenus>0?(s.revenus/1000).toFixed(1)+'k':'0€'}].map((st,i) => (
                    <div key={i} style={{ background:'var(--bg-primary)', borderRadius:'8px', padding:'8px', textAlign:'center' }}>
                      <div style={{ fontSize:'15px', fontWeight:700, color:'var(--text-primary)' }}>{st.value}</div>
                      <div style={{ fontSize:'11px', color:'var(--text-secondary)' }}>{st.label}</div>
                    </div>
                  ))}
                </div>
                <div style={{ marginBottom:'14px', display:'flex', flexDirection:'column', gap:'3px' }}>
                  <div style={{ fontSize:'13px', color:'var(--text-secondary)' }}>💰 {etab.taux_horaire}€/h</div>
                  {etab.telephone && <div style={{ fontSize:'13px', color:'var(--text-secondary)' }}>📞 {etab.telephone}</div>}
                </div>
                <div style={{ display:'flex', gap:'8px' }}>
                  <button onClick={() => { setEditing(etab); setForm({nom:etab.nom,groupe:etab.groupe||'',type:etab.type||'Hopital',taux_horaire:etab.taux_horaire,telephone:etab.telephone||'',email:etab.email||'',notes:etab.notes||''}); setShowForm(true) }} style={{ flex:1, padding:'8px', borderRadius:'7px', border:'1px solid var(--border)', background:'var(--bg-primary)', color:'var(--text-secondary)', cursor:'pointer', fontSize:'13px' }}>✏️ Modifier</button>
                  <button onClick={() => archive(etab)} style={{ flex:1, padding:'8px', borderRadius:'7px', border:'1px solid var(--border)', background:'var(--bg-primary)', color: etab.archived ? '#16a34a' : '#f59e0b', cursor:'pointer', fontSize:'13px' }}>
                    {etab.archived ? '↩️ Restaurer' : '📦 Archiver'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showForm && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', zIndex:100, display:'flex', alignItems:'center', justifyContent:'center', padding:'20px' }} onClick={e => { if (e.target === e.currentTarget) setShowForm(false) }}>
          <div style={{ background:'white', borderRadius:'16px', padding:'28px', width:'100%', maxWidth:'460px', boxShadow:'0 20px 60px rgba(0,0,0,0.15)' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'22px' }}>
              <h2 style={{ fontSize:'17px', fontWeight:700, color:'var(--text-primary)' }}>{editing ? 'Modifier' : 'Nouvel etablissement'}</h2>
              <button onClick={() => setShowForm(false)} style={{ background:'none', border:'none', color:'var(--text-secondary)', cursor:'pointer', fontSize:'20px' }}>✕</button>
            </div>
            <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:'13px' }}>
              <div><label style={{ display:'block', fontSize:'12px', fontWeight:500, color:'var(--text-secondary)', marginBottom:'4px' }}>Nom *</label><input required value={form.nom} onChange={e=>setForm({...form,nom:e.target.value})} placeholder="CHU de Lyon" style={inp}/></div>
              <div><label style={{ display:'block', fontSize:'12px', fontWeight:500, color:'var(--text-secondary)', marginBottom:'4px' }}>Groupe / Reseau</label><input value={form.groupe} onChange={e=>setForm({...form,groupe:e.target.value})} placeholder="Korian..." style={inp}/></div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px' }}>
                <div><label style={{ display:'block', fontSize:'12px', fontWeight:500, color:'var(--text-secondary)', marginBottom:'4px' }}>Type</label><select value={form.type} onChange={e=>setForm({...form,type:e.target.value})} style={inp}>{TYPES.map(t=><option key={t} value={t}>{t}</option>)}</select></div>
                <div><label style={{ display:'block', fontSize:'12px', fontWeight:500, color:'var(--text-secondary)', marginBottom:'4px' }}>Taux horaire (€)*</label><input required type="number" step="0.5" value={form.taux_horaire} onChange={e=>setForm({...form,taux_horaire:e.target.value})} style={inp}/></div>
              </div>
              <div><label style={{ display:'block', fontSize:'12px', fontWeight:500, color:'var(--text-secondary)', marginBottom:'4px' }}>Telephone</label><input value={form.telephone} onChange={e=>setForm({...form,telephone:e.target.value})} placeholder="04 XX XX XX XX" style={inp}/></div>
              <div style={{ display:'flex', gap:'10px', justifyContent:'flex-end', marginTop:'4px' }}>
                <button type="button" onClick={() => setShowForm(false)} style={{ padding:'10px 16px', borderRadius:'8px', border:'1px solid var(--border)', background:'transparent', color:'var(--text-secondary)', cursor:'pointer', fontSize:'14px' }}>Annuler</button>
                <button type="submit" style={{ padding:'10px 18px', borderRadius:'8px', background:'var(--accent)', color:'white', border:'none', cursor:'pointer', fontSize:'14px', fontWeight:600 }}>{editing ? 'Enregistrer' : 'Creer'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
