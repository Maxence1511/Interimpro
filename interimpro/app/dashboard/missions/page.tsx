'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

type Mission = {
  id: string; titre: string; etablissement_id: string; date_debut: string; date_fin: string
  statut: string; heures: number; salaire_estime: number; salaire_majore_manuel: number | null
  contrat_signe: boolean; fiche_paie_recue: boolean; salaire_recu: boolean
  majoration_nuit: boolean; majoration_dimanche: boolean; majoration_ferie: boolean
  taux_majoration: number; notes: string; google_calendar_event_id: string | null
}
type Etab = { id: string; nom: string; taux_horaire: number }

const STATUT: Record<string, { label: string; color: string; bg: string }> = {
  a_venir: { label: 'À venir', color: '#7c3aed', bg: '#f5f3ff' },
  passee: { label: 'Passée', color: '#0891b2', bg: '#ecfeff' },
  archive: { label: 'Archivée', color: '#6b7280', bg: '#f9fafb' },
}

const inp = {
  width: '100%', padding: '9px 12px', borderRadius: 8,
  border: '1px solid var(--border)', background: 'var(--bg-primary)',
  color: 'var(--text-primary)', fontSize: 14, outline: 'none',
  boxSizing: 'border-box' as const,
}

export default function MissionsPage() {
  const [missions, setMissions] = useState<Mission[]>([])
  const [etabs, setEtabs] = useState<Etab[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Mission | null>(null)
  const [filtre, setFiltre] = useState('tous')
  const [search, setSearch] = useState('')
  const supabase = createClient()

  const emptyForm = {
    titre: '', etablissement_id: '', date_debut: '', date_fin: '', heures: 8,
    statut: 'a_venir', contrat_signe: false, fiche_paie_recue: false, salaire_recu: false,
    majoration_nuit: false, majoration_dimanche: false, majoration_ferie: false,
    taux_majoration: 0, salaire_majore_manuel: '', notes: '',
  }
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

  const calcSalaire = (f: any) => {
    const etab = etabs.find(e => e.id === f.etablissement_id)
    const taux = etab?.taux_horaire || 14
    const base = (Number(f.heures) || 0) * taux
    let maj = 0
    if (f.majoration_nuit) maj += 0.25
    if (f.majoration_dimanche) maj += 0.25
    if (f.majoration_ferie) maj += 0.50
    return Math.round(base * (1 + maj) * 100) / 100
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const salaire_estime = calcSalaire(form)
    const payload = {
      ...form,
      heures: Number(form.heures),
      taux_majoration: Number(form.taux_majoration),
      salaire_estime,
      salaire_majore_manuel: form.salaire_majore_manuel === '' ? null : Number(form.salaire_majore_manuel),
    }
    if (editing) await supabase.from('missions').update(payload).eq('id', editing.id)
    else await supabase.from('missions').insert(payload)
    setShowForm(false); setEditing(null); setForm(emptyForm); load()
  }

  const toggle = async (m: Mission, field: keyof Mission) => {
    await supabase.from('missions').update({ [field]: !(m[field] as boolean) }).eq('id', m.id)
    load()
  }

  const del = async (id: string) => {
    if (!confirm('Supprimer cette mission ?')) return
    await supabase.from('missions').delete().eq('id', id)
    load()
  }

  const openEdit = (m: Mission) => {
    setEditing(m)
    setForm({ ...m, date_debut: m.date_debut?.slice(0, 16) || '', date_fin: m.date_fin?.slice(0, 16) || '', salaire_majore_manuel: m.salaire_majore_manuel ?? '' })
    setShowForm(true)
  }

  const getEtab = (id: string) => etabs.find(e => e.id === id)
  const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''
  const fmtEur = (n: number) => n?.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }) || '—'

  const filtered = missions
    .filter(m => filtre === 'tous' || m.statut === filtre)
    .filter(m => !search || m.titre.toLowerCase().includes(search.toLowerCase()) || (getEtab(m.etablissement_id)?.nom || '').toLowerCase().includes(search.toLowerCase()))

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)' }}>Missions</h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>{missions.length} mission(s) au total</p>
        </div>
        <button onClick={() => { setEditing(null); setForm(emptyForm); setShowForm(true) }}
          style={{ padding: '10px 18px', borderRadius: 10, background: 'var(--accent)', color: 'white', border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 700, boxShadow: '0 2px 8px rgba(217,70,239,.3)' }}>
          + Nouvelle mission
        </button>
      </div>

      {/* Filtres */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher..."
          style={{ ...inp, width: 200 }} />
        {['tous', 'a_venir', 'passee', 'archive'].map(f => (
          <button key={f} onClick={() => setFiltre(f)}
            style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid var(--border)', background: filtre === f ? 'var(--accent)' : 'white', color: filtre === f ? 'white' : 'var(--text-secondary)', cursor: 'pointer', fontSize: 13, fontWeight: filtre === f ? 700 : 400 }}>
            {f === 'tous' ? 'Toutes' : STATUT[f]?.label}
          </button>
        ))}
      </div>

      {/* Liste */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-secondary)' }}>Chargement...</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-secondary)' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
          <p style={{ marginBottom: 12 }}>Aucune mission trouvée</p>
          <button onClick={() => setShowForm(true)} style={{ color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>+ Ajouter une mission</button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map(m => {
            const etab = getEtab(m.etablissement_id)
            const s = STATUT[m.statut] || STATUT.archive
            const salaireFinal = m.salaire_majore_manuel ?? m.salaire_estime
            return (
              <div key={m.id} style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 4, height: 48, borderRadius: 4, background: s.color, flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{m.titre}</span>
                    <span style={{ padding: '2px 8px', borderRadius: 100, fontSize: 11, fontWeight: 700, background: s.bg, color: s.color }}>{s.label}</span>
                    {m.google_calendar_event_id && <span title="Importé GCal" style={{ fontSize: 12 }}>📅</span>}
                  </div>
                  <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', fontSize: 12, color: 'var(--text-secondary)' }}>
                    {etab && <span>🏥 {etab.nom}</span>}
                    {m.date_debut && <span>🗓 {fmtDate(m.date_debut)}</span>}
                    <span>⏱ {m.heures}h</span>
                    <span style={{ color: '#059669', fontWeight: 700 }}>💰 {fmtEur(salaireFinal)}</span>
                    {m.majoration_nuit && <span style={{ color: '#7c3aed' }}>🌙</span>}
                    {m.majoration_dimanche && <span style={{ color: '#d97706' }}>☀️</span>}
                    {m.majoration_ferie && <span style={{ color: '#dc2626' }}>🎉</span>}
                  </div>
                </div>
                {/* Checkboxes admin */}
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  {([['contrat_signe', '📝', 'Contrat'], ['fiche_paie_recue', '🧾', 'Fiche'], ['salaire_recu', '💸', 'Salaire']] as [keyof Mission, string, string][]).map(([field, ico, label]) => (
                    <button key={String(field)} onClick={() => toggle(m, field)} title={label}
                      style={{ padding: '5px 8px', borderRadius: 6, border: '1px solid var(--border)', background: m[field] ? '#f0fdf4' : 'var(--bg-primary)', cursor: 'pointer', fontSize: 13, color: m[field] ? '#059669' : 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 3 }}>
                      {ico} {m[field] ? '✓' : '○'}
                    </button>
                  ))}
                </div>
                {/* Actions */}
                <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                  <button onClick={() => openEdit(m)} style={{ padding: '7px 10px', borderRadius: 7, border: '1px solid var(--border)', background: 'var(--bg-primary)', cursor: 'pointer', fontSize: 13 }}>✏️</button>
                  <button onClick={() => del(m.id)} style={{ padding: '7px 10px', borderRadius: 7, border: '1px solid #fca5a5', background: '#fef2f2', cursor: 'pointer', fontSize: 13, color: '#dc2626' }}>🗑️</button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal Formulaire */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onClick={e => { if (e.target === e.currentTarget) setShowForm(false) }}>
          <div style={{ background: 'white', borderRadius: 16, padding: 28, width: '100%', maxWidth: 560, maxHeight: '92vh', overflow: 'auto', boxShadow: '0 24px 64px rgba(0,0,0,.15)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
              <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)' }}>{editing ? 'Modifier la mission' : 'Nouvelle mission'}</h2>
              <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: 'var(--text-secondary)' }}>✕</button>
            </div>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>Titre / Service *</label>
                <input required value={form.titre} onChange={e => setForm({ ...form, titre: e.target.value })} placeholder="Médecine interne, Urgences..." style={inp} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>Établissement *</label>
                <select required value={form.etablissement_id} onChange={e => setForm({ ...form, etablissement_id: e.target.value })} style={inp}>
                  <option value="">Sélectionner...</option>
                  {etabs.map(e => <option key={e.id} value={e.id}>{e.nom}</option>)}
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>Début *</label>
                  <input required type="datetime-local" value={form.date_debut} onChange={e => setForm({ ...form, date_debut: e.target.value })} style={inp} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>Fin</label>
                  <input type="datetime-local" value={form.date_fin} onChange={e => setForm({ ...form, date_fin: e.target.value })} style={inp} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>Heures *</label>
                  <input required type="number" step="0.5" min="0" value={form.heures} onChange={e => setForm({ ...form, heures: e.target.value })} style={inp} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>Statut</label>
                  <select value={form.statut} onChange={e => setForm({ ...form, statut: e.target.value })} style={inp}>
                    <option value="a_venir">À venir</option>
                    <option value="passee">Passée</option>
                    <option value="archive">Archivée</option>
                  </select>
                </div>
              </div>

              {/* Majorations */}
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>Majorations</label>
                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                  {[['majoration_nuit', '🌙 Nuit (+25%)'], ['majoration_dimanche', '☀️ Dimanche (+25%)'], ['majoration_ferie', '🎉 Férié (+50%)']] .map(([field, label]) => (
                    <label key={field} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13 }}>
                      <input type="checkbox" checked={form[field]} onChange={e => setForm({ ...form, [field]: e.target.checked })} />
                      {label}
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>Salaire majoré (manuel, optionnel)</label>
                <input type="number" step="0.01" value={form.salaire_majore_manuel} onChange={e => setForm({ ...form, salaire_majore_manuel: e.target.value })} placeholder="Laissez vide pour calcul automatique" style={inp} />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>Notes</label>
                <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} style={{ ...inp, resize: 'vertical' as const }} />
              </div>

              {/* Résumé salaire */}
              <div style={{ padding: '12px 14px', borderRadius: 9, background: 'var(--accent-light)', border: '1px solid var(--accent-border)' }}>
                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>💰 Salaire estimé automatiquement : </span>
                <strong style={{ color: 'var(--accent)' }}>
                  {calcSalaire(form).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                </strong>
              </div>

              {/* Checkboxes suivi */}
              <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                {[['contrat_signe', '📝 Contrat signé'], ['fiche_paie_recue', '🧾 Fiche de paie reçue'], ['salaire_recu', '💸 Salaire reçu']].map(([field, label]) => (
                  <label key={field} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13 }}>
                    <input type="checkbox" checked={form[field]} onChange={e => setForm({ ...form, [field]: e.target.checked })} />
                    {label}
                  </label>
                ))}
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
                <button type="button" onClick={() => setShowForm(false)} style={{ padding: '10px 18px', borderRadius: 9, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 14 }}>Annuler</button>
                <button type="submit" style={{ padding: '10px 22px', borderRadius: 9, background: 'var(--accent)', color: 'white', border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 700 }}>{editing ? 'Enregistrer' : 'Créer'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
