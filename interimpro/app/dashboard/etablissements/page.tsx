'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

type Creneau = { label: string; heure_debut: string; heure_fin: string; pause_minutes: number }
type Etab = { id: string; nom: string; groupe?: string; type: string; taux_horaire: number; telephone?: string; email?: string; notes?: string; creneaux?: Creneau[]; archived: boolean }
const TYPES = ['EHPAD','Clinique','Hôpital','Laboratoire','Rééducation','Psychiatrie','Maison de Santé','Autre']
const TYPE_COLORS: Record<string,string> = { EHPAD:'#f59e0b', Clinique:'#e879f9', 'Hôpital':'#8b5cf6', Laboratoire:'#06b6d4', Rééducation:'#10b981', Psychiatrie:'#ec4899', 'Maison de Santé':'#14b8a6', Autre:'#64748b' }
const INP: React.CSSProperties = { width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #334155', background: '#0f172a', color: '#f1f5f9', fontSize: 14, outline: 'none', boxSizing: 'border-box' }

export default function EtablissementsPage() {
  const [etabs, setEtabs] = useState<Etab[]>([])
  const [missions, setMissions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'actif'|'archive'>('actif')
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('Tous')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Etab | null>(null)
  const supabase = createClient()

  const emptyForm = { nom: '', groupe: '', type: 'Hôpital', taux_horaire: 14, telephone: '', email: '', notes: '', creneaux: [] as Creneau[] }
  const [form, setForm] = useState<any>(emptyForm)

  const load = useCallback(async () => {
    const [e, m] = await Promise.all([
      supabase.from('etablissements').select('*').order('nom'),
      supabase.from('missions').select('etablissement_id'),
    ])
    setEtabs((e.data || []) as Etab[])
    setMissions(m.data || [])
    setLoading(false)
  }, [])
  useEffect(() => { load() }, [load])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const payload = { ...form, taux_horaire: Number(form.taux_horaire), archived: false }
    if (editing) await supabase.from('etablissements').update(payload).eq('id', editing.id)
    else await supabase.from('etablissements').insert(payload)
    setShowForm(false); setEditing(null); setForm(emptyForm); load()
  }

  const archiver = async (etab: Etab) => {
    await supabase.from('etablissements').update({ archived: !etab.archived, date_archive: etab.archived ? null : new Date().toISOString() }).eq('id', etab.id); load()
  }

  const addCreneau = () => setForm({ ...form, creneaux: [...(form.creneaux || []), { label: '', heure_debut: '08:00', heure_fin: '18:00', pause_minutes: 30 }] })
  const updateCreneau = (i: number, field: string, val: any) => {
    const c = [...(form.creneaux || [])]; c[i] = { ...c[i], [field]: val }; setForm({ ...form, creneaux: c })
  }
  const removeCreneau = (i: number) => { const c = [...(form.creneaux || [])]; c.splice(i, 1); setForm({ ...form, creneaux: c }) }

  const missionCount = (id: string) => missions.filter(m => m.etablissement_id === id).length
  const displayed = etabs.filter(e => {
    if (tab === 'actif' && e.archived) return false
    if (tab === 'archive' && !e.archived) return false
    if (search && !e.nom.toLowerCase().includes(search.toLowerCase()) && !(e.groupe||'').toLowerCase().includes(search.toLowerCase())) return false
    if (typeFilter !== 'Tous' && e.type !== typeFilter) return false
    return true
  })
  const actifCount = etabs.filter(e => !e.archived).length
  const archiveCount = etabs.filter(e => e.archived).length

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: '#f1f5f9' }}>Établissements</h1>
        <button onClick={() => { setEditing(null); setForm(emptyForm); setShowForm(true) }} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 10, background: '#e879f9', color: 'white', border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 700 }}>
          + Ajouter
        </button>
      </div>

      <div style={{ position: 'relative', marginBottom: 12 }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher par nom ou groupe..." style={{ ...INP, paddingLeft: 34 }} />
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 2 }}>
          {[{key:'actif',label:`Actifs (${actifCount})`},{key:'archive',label:`Archivés (${archiveCount})`}].map(t => (
            <button key={t.key} onClick={() => setTab(t.key as any)} style={{ padding: '7px 14px', borderRadius: 8, border: tab === t.key ? '1px solid #e879f9' : '1px solid #334155', background: tab === t.key ? 'rgba(232,121,249,.12)' : 'transparent', color: tab === t.key ? '#e879f9' : '#64748b', cursor: 'pointer', fontSize: 13, fontWeight: tab === t.key ? 600 : 400 }}>{t.label}</button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {['Tous', ...TYPES].map(t => (
            <button key={t} onClick={() => setTypeFilter(t)} style={{ padding: '5px 10px', borderRadius: 20, border: typeFilter === t ? '1px solid #e879f9' : '1px solid #334155', background: typeFilter === t ? '#e879f9' : 'transparent', color: typeFilter === t ? 'white' : '#64748b', cursor: 'pointer', fontSize: 12, fontWeight: typeFilter === t ? 600 : 400 }}>{t}</button>
          ))}
        </div>
      </div>

      {loading ? <div style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>Chargement...</div>
      : displayed.length === 0 ? <div style={{ textAlign: 'center', padding: 60, color: '#64748b' }}><p>Aucun établissement</p></div>
      : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
          {displayed.map(etab => {
            const color = TYPE_COLORS[etab.type] || '#64748b'
            return (
              <div key={etab.id} style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 12, padding: 20, cursor: 'pointer', opacity: etab.archived ? .7 : 1 }}
                onClick={() => { setEditing(etab); setForm({ nom: etab.nom, groupe: etab.groupe||'', type: etab.type, taux_horaire: etab.taux_horaire, telephone: etab.telephone||'', email: etab.email||'', notes: etab.notes||'', creneaux: etab.creneaux||[] }); setShowForm(true) }}>
                <div style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#f1f5f9', marginBottom: 2 }}>{etab.nom}</div>
                  {etab.groupe && <div style={{ fontSize: 12, color: '#64748b' }}>{etab.groupe}</div>}
                </div>
                <span style={{ display: 'inline-block', padding: '2px 10px', borderRadius: 100, fontSize: 11, fontWeight: 700, background: color + '25', color, marginBottom: 10 }}>{etab.type}</span>
                <div style={{ fontSize: 20, fontWeight: 800, color: '#e879f9', marginBottom: 8 }}>{etab.taux_horaire.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €/h</div>
                <div style={{ fontSize: 12, color: '#64748b', display: 'flex', alignItems: 'center', gap: 5, marginBottom: 8 }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
                  {missionCount(etab.id)} missions
                </div>
                {(etab.creneaux || []).map((c, i) => (
                  <div key={i} style={{ fontSize: 11, color: '#64748b', borderTop: '1px solid #334155', paddingTop: 6, marginTop: 6 }}>
                    {c.label} · {c.heure_debut}–{c.heure_fin} {c.pause_minutes ? `(Pause ${c.pause_minutes}min)` : ''}
                  </div>
                ))}
              </div>
            )
          })}
        </div>
      )}

      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={e => { if (e.target === e.currentTarget) setShowForm(false) }}>
          <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 16, padding: 28, width: '100%', maxWidth: 540, maxHeight: '95vh', overflow: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <h2 style={{ fontSize: 17, fontWeight: 700, color: '#f1f5f9' }}>{editing ? 'Modifier' : 'Nouvel établissement'}</h2>
                <span style={{ padding: '2px 10px', borderRadius: 100, fontSize: 11, fontWeight: 700, background: (TYPE_COLORS[form.type] || '#64748b') + '25', color: TYPE_COLORS[form.type] || '#64748b' }}>{form.type}</span>
              </div>
              <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 22 }}>×</button>
            </div>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div><label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>Nom de l'établissement *</label>
                <input required value={form.nom} onChange={e => setForm({...form, nom: e.target.value})} placeholder="Ex : CHU de Lyon" style={INP} /></div>
              <div><label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>Groupe / Réseau</label>
                <input value={form.groupe} onChange={e => setForm({...form, groupe: e.target.value})} placeholder="Ex : Groupe Korian" style={INP} /></div>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 8 }}>Type d'établissement</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
                  {TYPES.map(t => <button key={t} type="button" onClick={() => setForm({...form, type: t})} style={{ padding: '8px 4px', borderRadius: 8, border: `1px solid ${form.type === t ? '#e879f9' : '#334155'}`, background: form.type === t ? '#e879f9' : '#0f172a', color: form.type === t ? 'white' : '#94a3b8', cursor: 'pointer', fontSize: 12, fontWeight: form.type === t ? 600 : 400 }}>{t}</button>)}
                </div>
              </div>
              <div><label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>Taux horaire (€/h) *</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <input required type="number" step="0.01" value={form.taux_horaire} onChange={e => setForm({...form, taux_horaire: e.target.value})} style={{ ...INP, width: 120 }} />
                  <span style={{ fontSize: 13, color: '#64748b' }}>par heure</span>
                </div>
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <label style={{ fontSize: 12, color: '#94a3b8' }}>Créneaux de travail habituels</label>
                  <button type="button" onClick={addCreneau} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 7, border: '1px solid #334155', background: '#0f172a', color: '#94a3b8', cursor: 'pointer', fontSize: 12 }}>+ Ajouter</button>
                </div>
                {(form.creneaux || []).length === 0 ? (
                  <div style={{ padding: '12px 16px', borderRadius: 8, border: '1px dashed #334155', textAlign: 'center', color: '#64748b', fontSize: 12 }}>Aucun créneau — cliquez "Ajouter" pour en créer un</div>
                ) : (form.creneaux || []).map((c: Creneau, i: number) => (
                  <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr auto', gap: 6, marginBottom: 6 }}>
                    <input value={c.label} onChange={e => updateCreneau(i, 'label', e.target.value)} placeholder="Matin, Nuit..." style={{ ...INP, fontSize: 12 }} />
                    <input type="time" value={c.heure_debut} onChange={e => updateCreneau(i, 'heure_debut', e.target.value)} style={{ ...INP, fontSize: 12 }} />
                    <input type="time" value={c.heure_fin} onChange={e => updateCreneau(i, 'heure_fin', e.target.value)} style={{ ...INP, fontSize: 12 }} />
                    <input type="number" value={c.pause_minutes} onChange={e => updateCreneau(i, 'pause_minutes', Number(e.target.value))} placeholder="Pause" style={{ ...INP, fontSize: 12 }} />
                    <button type="button" onClick={() => removeCreneau(i)} style={{ padding: '5px 8px', borderRadius: 6, border: '1px solid #334155', background: 'transparent', color: '#ef4444', cursor: 'pointer' }}>×</button>
                  </div>
                ))}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div><label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>Téléphone</label><input value={form.telephone} onChange={e => setForm({...form, telephone: e.target.value})} placeholder="Ex : 04 72 11 22 33" style={INP} /></div>
                <div><label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>Email</label><input value={form.email} onChange={e => setForm({...form, email: e.target.value})} placeholder="Ex : contact@chu-lyon.fr" style={INP} /></div>
              </div>
              <div><label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>Notes</label>
                <textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} placeholder="..." rows={3} style={{ ...INP, resize: 'vertical' as const }} /></div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 4 }}>
                <button type="button" onClick={() => setShowForm(false)} style={{ padding: '10px 18px', borderRadius: 9, border: '1px solid #334155', background: 'transparent', color: '#94a3b8', cursor: 'pointer', fontSize: 14 }}>Annuler</button>
                {editing && <button type="button" onClick={() => archiver(editing)} style={{ padding: '10px 18px', borderRadius: 9, border: '1px solid #f59e0b', background: 'transparent', color: '#f59e0b', cursor: 'pointer', fontSize: 14 }}>{editing.archived ? 'Restaurer' : 'Archiver'}</button>}
                <button type="submit" style={{ padding: '10px 22px', borderRadius: 9, background: '#e879f9', color: 'white', border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 700 }}>{editing ? 'Enregistrer' : 'Créer'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
