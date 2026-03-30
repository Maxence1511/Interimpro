'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

type Mission = { id: string; titre: string; etablissement_id: string; date_debut: string; date_fin: string; pause_heures: number; heures: number; statut: string; contrat_signe: boolean; fiche_paie_recue: boolean; salaire_recu: boolean; majoration_nuit: boolean; majoration_dimanche: boolean; majoration_ferie: boolean; taux_majoration: number; salaire_estime: number; notes: string; source: string }
type Etab = { id: string; nom: string; taux_horaire: number; creneaux?: any[] }

const INP: React.CSSProperties = { width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #334155', background: '#0f172a', color: '#f1f5f9', fontSize: 14, outline: 'none', boxSizing: 'border-box' }

export default function MissionsPage() {
  const [missions, setMissions] = useState<Mission[]>([])
  const [etabs, setEtabs] = useState<Etab[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'a_venir'|'passee'|'archive'>('a_venir')
  const [search, setSearch] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Mission | null>(null)
  const supabase = createClient()

  const emptyForm = { titre: '', etablissement_id: '', date: '', debut: '08:00', fin: '18:00', pause_heures: 1, majoration_nuit: false, majoration_dimanche: false, majoration_ferie: false, notes: '' }
  const [form, setForm] = useState<any>(emptyForm)

  const load = useCallback(async () => {
    const [m, e] = await Promise.all([
      supabase.from('missions').select('*').order('date_debut', { ascending: false }),
      supabase.from('etablissements').select('*').eq('archived', false).order('nom'),
    ])
    setMissions((m.data || []) as Mission[])
    setEtabs((e.data || []) as Etab[])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const calcHeures = (debut: string, fin: string, pause: number) => {
    if (!debut || !fin) return 0
    const [dh, dm] = debut.split(':').map(Number)
    const [fh, fm] = fin.split(':').map(Number)
    return Math.max(0, (fh * 60 + fm - dh * 60 - dm) / 60 - pause)
  }

  const calcSalaire = (f: any) => {
    const etab = etabs.find(e => e.id === f.etablissement_id)
    if (!etab) return 0
    const h = calcHeures(f.debut, f.fin, Number(f.pause_heures))
    const base = h * etab.taux_horaire
    let maj = 0
    if (f.majoration_nuit) maj += 0.25
    if (f.majoration_dimanche) maj += 0.50
    if (f.majoration_ferie) maj += 1.0
    return Math.round(base * (1 + maj) * 100) / 100
  }

  const heuresForm = calcHeures(form.debut, form.fin, Number(form.pause_heures))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const date_debut = form.date ? `${form.date}T${form.debut}:00` : ''
    const date_fin = form.date ? `${form.date}T${form.fin}:00` : ''
    const heures = calcHeures(form.debut, form.fin, Number(form.pause_heures))
    const salaire_estime = calcSalaire(form)
    const payload = { titre: form.titre, etablissement_id: form.etablissement_id, date_debut, date_fin, pause_heures: Number(form.pause_heures), heures, statut: editing?.statut || 'a_venir', contrat_signe: editing?.contrat_signe || false, fiche_paie_recue: editing?.fiche_paie_recue || false, salaire_recu: editing?.salaire_recu || false, majoration_nuit: form.majoration_nuit, majoration_dimanche: form.majoration_dimanche, majoration_ferie: form.majoration_ferie, taux_majoration: (form.majoration_nuit ? 25 : 0) + (form.majoration_dimanche ? 50 : 0) + (form.majoration_ferie ? 100 : 0), salaire_estime, notes: form.notes, source: 'manual' }
    if (editing) await supabase.from('missions').update(payload).eq('id', editing.id)
    else await supabase.from('missions').insert(payload)
    setShowForm(false); setEditing(null); setForm(emptyForm); load()
  }

  const toggleField = async (m: Mission, field: 'contrat_signe' | 'fiche_paie_recue' | 'salaire_recu') => {
    const updates: any = { [field]: !m[field] }
    if (field === 'contrat_signe') updates.date_contrat_signe = !m[field] ? new Date().toISOString() : null
    if (field === 'fiche_paie_recue') updates.date_fiche_paie_recue = !m[field] ? new Date().toISOString() : null
    if (field === 'salaire_recu') updates.date_salaire_recu = !m[field] ? new Date().toISOString() : null
    await supabase.from('missions').update(updates).eq('id', m.id); load()
  }

  const archiver = async (m: Mission) => { await supabase.from('missions').update({ statut: 'archive', date_archive: new Date().toISOString() }).eq('id', m.id); load() }
  const supprimer = async (id: string) => { if (!confirm('Supprimer cette mission ?')) return; await supabase.from('missions').delete().eq('id', id); load() }

  const openEdit = (m: Mission) => {
    const d = m.date_debut ? m.date_debut.slice(0, 10) : ''
    const debut = m.date_debut ? m.date_debut.slice(11, 16) : '08:00'
    const fin = m.date_fin ? m.date_fin.slice(11, 16) : '18:00'
    setEditing(m)
    setForm({ titre: m.titre, etablissement_id: m.etablissement_id, date: d, debut, fin, pause_heures: m.pause_heures || 1, majoration_nuit: m.majoration_nuit, majoration_dimanche: m.majoration_dimanche, majoration_ferie: m.majoration_ferie, notes: m.notes || '' })
    setShowForm(true)
  }

  const getEtab = (id: string) => etabs.find(e => e.id === id)
  const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : ''
  const fmtEur = (n: number) => n?.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'

  const counts = { a_venir: missions.filter(m => m.statut === 'a_venir').length, passee: missions.filter(m => m.statut === 'passee').length, archive: missions.filter(m => m.statut === 'archive').length }

  const filtered = missions.filter(m => {
    if (m.statut !== tab) return false
    if (search) {
      const etab = getEtab(m.etablissement_id)
      if (!m.titre.toLowerCase().includes(search.toLowerCase()) && !(etab?.nom || '').toLowerCase().includes(search.toLowerCase())) return false
    }
    if (dateFrom && m.date_debut < dateFrom) return false
    if (dateTo && m.date_debut > dateTo + 'T23:59:59') return false
    return true
  })

  const TABS: { key: 'a_venir' | 'passee' | 'archive'; label: string }[] = [
    { key: 'a_venir', label: 'À venir' },
    { key: 'passee', label: 'Passées' },
    { key: 'archive', label: 'Archivées' },
  ]

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: '#f1f5f9' }}>Missions</h1>
        <button onClick={() => { setEditing(null); setForm(emptyForm); setShowForm(true) }} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 10, background: '#e879f9', color: 'white', border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 700 }}>
          + Nouvelle mission
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 14, alignItems: 'center' }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher par mission ou établissement..." style={{ ...INP, paddingLeft: 34 }} />
        </div>
        <span style={{ fontSize: 13, color: '#64748b' }}>Du</span>
        <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={{ ...INP, width: 140 }} />
        <span style={{ fontSize: 13, color: '#64748b' }}>Au</span>
        <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} style={{ ...INP, width: 140 }} />
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 2, marginBottom: 16 }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{ padding: '7px 14px', borderRadius: 8, border: tab === t.key ? '1px solid #e879f9' : '1px solid #334155', background: tab === t.key ? 'rgba(232,121,249,.12)' : 'transparent', color: tab === t.key ? '#e879f9' : '#64748b', cursor: 'pointer', fontSize: 13, fontWeight: tab === t.key ? 600 : 400 }}>
            {t.label} ({counts[t.key]})
          </button>
        ))}
      </div>

      {/* Table */}
      <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 12, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #334155' }}>
              {['Mission', 'Établissement', 'Date', 'Heures', 'Salaire', 'Suivi', 'Actions'].map(h => (
                <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.05em' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} style={{ padding: 40, textAlign: 'center', color: '#64748b', fontSize: 13 }}>Chargement...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={7} style={{ padding: 40, textAlign: 'center', color: '#64748b', fontSize: 13 }}>Aucune mission</td></tr>
            ) : filtered.map(m => {
              const etab = getEtab(m.etablissement_id)
              return (
                <tr key={m.id} style={{ borderBottom: '1px solid #1e293b' }}>
                  <td style={{ padding: '12px 16px', fontSize: 14, fontWeight: 500, color: '#f1f5f9' }}>{m.titre}</td>
                  <td style={{ padding: '12px 16px', fontSize: 13, color: '#94a3b8' }}>{etab?.nom || '—'}</td>
                  <td style={{ padding: '12px 16px', fontSize: 13, color: '#94a3b8' }}>{fmtDate(m.date_debut)}</td>
                  <td style={{ padding: '12px 16px', fontSize: 13, color: '#94a3b8' }}>{m.heures?.toFixed(1)}h</td>
                  <td style={{ padding: '12px 16px', fontSize: 14, fontWeight: 700, color: '#e879f9' }}>{fmtEur(m.salaire_estime)}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {([['contrat_signe', 'Contrat'], ['fiche_paie_recue', 'Fiche'], ['salaire_recu', 'Salaire']] as const).map(([field, label]) => (
                        <button key={field} onClick={() => toggleField(m, field)} title={label} style={{ padding: '3px 6px', borderRadius: 5, border: '1px solid #334155', background: m[field] ? 'rgba(16,185,129,.15)' : 'transparent', cursor: 'pointer' }}>
                          {field === 'contrat_signe' && <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={m.contrat_signe ? '#10b981' : '#475569'} strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>}
                          {field === 'fiche_paie_recue' && <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={m.fiche_paie_recue ? '#10b981' : '#475569'} strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>}
                          {field === 'salaire_recu' && <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={m.salaire_recu ? '#10b981' : '#475569'} strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>}
                        </button>
                      ))}
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button onClick={() => openEdit(m)} style={{ padding: '5px', borderRadius: 6, border: '1px solid #334155', background: 'transparent', cursor: 'pointer', color: '#94a3b8' }}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      </button>
                      {m.statut !== 'archive' && <button onClick={() => archiver(m)} style={{ padding: '5px', borderRadius: 6, border: '1px solid #334155', background: 'transparent', cursor: 'pointer', color: '#94a3b8' }}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></svg>
                      </button>}
                      <button onClick={() => supprimer(m.id)} style={{ padding: '5px', borderRadius: 6, border: '1px solid #334155', background: 'transparent', cursor: 'pointer', color: '#ef4444' }}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={e => { if (e.target === e.currentTarget) setShowForm(false) }}>
          <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 16, padding: 28, width: '100%', maxWidth: 520, maxHeight: '95vh', overflow: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: '#f1f5f9' }}>{editing ? 'Modifier la mission' : 'Nouvelle mission'}</h2>
              <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 22 }}>×</button>
            </div>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div><label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>Établissement *</label>
                <select required value={form.etablissement_id} onChange={e => setForm({...form, etablissement_id: e.target.value})} style={INP}>
                  <option value="">Sélectionner</option>
                  {etabs.map(e => <option key={e.id} value={e.id}>{e.nom}</option>)}
                </select>
              </div>
              <div><label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>Titre / Service *</label>
                <input required value={form.titre} onChange={e => setForm({...form, titre: e.target.value})} placeholder="Urgences, Réanimation..." style={INP} />
              </div>
              <div><label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>Date</label>
                <input type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} style={INP} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                <div><label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>Début</label><input type="time" value={form.debut} onChange={e => setForm({...form, debut: e.target.value})} style={INP} /></div>
                <div><label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>Fin</label><input type="time" value={form.fin} onChange={e => setForm({...form, fin: e.target.value})} style={INP} /></div>
                <div><label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>Pause (h)</label><input type="number" step="0.5" min="0" value={form.pause_heures} onChange={e => setForm({...form, pause_heures: e.target.value})} style={INP} /></div>
              </div>
              <div style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 8, padding: '12px 16px', textAlign: 'center' }}>
                <span style={{ fontSize: 13, color: '#64748b' }}>Heures calculées : </span>
                <span style={{ fontSize: 20, fontWeight: 800, color: '#f1f5f9' }}>{heuresForm.toFixed(2)}h</span>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 8 }}>Majorations</label>
                <div style={{ display: 'flex', gap: 20 }}>
                  {[['majoration_nuit', 'Nuit (+25%)'], ['majoration_dimanche', 'Dimanche (+50%)'], ['majoration_ferie', 'Férié (+100%)']] .map(([field, label]) => (
                    <label key={field} style={{ display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer', fontSize: 13, color: '#94a3b8' }}>
                      <div onClick={() => setForm({...form, [field]: !form[field]})} style={{ width: 16, height: 16, borderRadius: '50%', border: `2px solid ${form[field] ? '#e879f9' : '#475569'}`, background: form[field] ? '#e879f9' : 'transparent', cursor: 'pointer', flexShrink: 0 }} />
                      {label}
                    </label>
                  ))}
                </div>
              </div>
              <div style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 8, padding: '12px 16px', textAlign: 'center' }}>
                <span style={{ fontSize: 13, color: '#64748b' }}>Salaire estimé : </span>
                <span style={{ fontSize: 20, fontWeight: 800, color: '#e879f9' }}>{calcSalaire(form).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €</span>
              </div>
              <div><label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>Notes</label>
                <textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} placeholder="Notes supplémentaires..." rows={3} style={{ ...INP, resize: 'vertical' as const }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 4 }}>
                <button type="button" onClick={() => setShowForm(false)} style={{ padding: '10px 18px', borderRadius: 9, border: '1px solid #334155', background: 'transparent', color: '#94a3b8', cursor: 'pointer', fontSize: 14 }}>Annuler</button>
                <button type="submit" style={{ padding: '10px 22px', borderRadius: 9, background: '#e879f9', color: 'white', border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 700 }}>{editing ? 'Enregistrer' : 'Créer'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
