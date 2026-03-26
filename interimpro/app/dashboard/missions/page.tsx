'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

const STATUTS: Record<string, any> = {
  a_venir: { label: 'A venir', color: '#e87bf9', bg: 'rgba(232,123,249,0.1)' },
  passee: { label: 'Passee', color: '#818cf8', bg: 'rgba(129,140,248,0.1)' },
  archive: { label: 'Archivee', color: '#94a3b8', bg: 'rgba(148,163,184,0.1)' }
}

export default function MissionsPage() {
  const [missions, setMissions] = useState<any[]>([])
  const [etablissements, setEtablissements] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [filtre, setFiltre] = useState('tous')
  const supabase = createClient()
  const empty = { titre: '', etablissement_id: '', date_debut: '', heures: 8, statut: 'a_venir', contrat_signe: false, fiche_paie_recue: false, salaire_recu: false, majoration_nuit: false, majoration_dimanche: false, majoration_ferie: false, notes: '', source: 'manual' }
  const [form, setForm] = useState<any>(empty)

  const load = async () => {
    const [m, e] = await Promise.all([
      supabase.from('missions').select('*').order('date_debut', { ascending: false }),
      supabase.from('etablissements').select('*').eq('archived', false).order('nom')
    ])
    setMissions(m.data || []); setEtablissements(e.data || []); setLoading(false)
  }
  useEffect(() => { load() }, [])

  const calcSalaire = (f: any) => {
    const etab = etablissements.find(e => e.id === f.etablissement_id)
    const taux = etab?.taux_horaire || 14
    let base = (f.heures || 0) * taux
    if (f.majoration_nuit) base *= 1.25
    if (f.majoration_dimanche) base *= 1.25
    if (f.majoration_ferie) base *= 1.50
    return Math.round(base * 100) / 100
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const data = { ...form, salaire_estime: calcSalaire(form), heures: Number(form.heures) }
    if (editing) await supabase.from('missions').update(data).eq('id', editing.id)
    else await supabase.from('missions').insert(data)
    setShowForm(false); setEditing(null); setForm(empty); load()
  }

  const toggle = async (m: any, field: string) => {
    const update: any = { [field]: !m[field] }
    if (field === 'contrat_signe') update.date_contrat_signe = !m[field] ? new Date().toISOString() : null
    if (field === 'fiche_paie_recue') update.date_fiche_paie_recue = !m[field] ? new Date().toISOString() : null
    if (field === 'salaire_recu') update.date_salaire_recu = !m[field] ? new Date().toISOString() : null
    await supabase.from('missions').update(update).eq('id', m.id); load()
  }

  const del = async (id: string) => { if (!confirm('Supprimer ?')) return; await supabase.from('missions').delete().eq('id', id); load() }
  const getEtab = (id: string) => etablissements.find(e => e.id === id)
  const fmt = (d: string) => d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''
  const fmtEur = (n: number) => n?.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }) || 'EUR 0'
  const inp = { width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: '14px', outline: 'none', boxSizing: 'border-box' as const }
  const filtered = missions.filter(m => filtre === 'tous' || m.statut === filtre)

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '2px' }}>Missions</h1>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{missions.length} missions au total</p>
        </div>
        <button onClick={() => { setEditing(null); setForm(empty); setShowForm(true) }} style={{ padding: '10px 18px', borderRadius: '10px', background: 'var(--accent)', color: 'white', border: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: 600 }}>
          + Nouvelle mission
        </button>
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        {['tous', 'a_venir', 'passee', 'archive'].map(f => (
          <button key={f} onClick={() => setFiltre(f)} style={{ padding: '7px 14px', borderRadius: '8px', border: '1px solid var(--border)', background: filtre === f ? 'var(--accent)' : 'white', color: filtre === f ? 'white' : 'var(--text-secondary)', cursor: 'pointer', fontSize: '13px', fontWeight: filtre === f ? 600 : 400 }}>
            {f === 'tous' ? 'Toutes' : STATUTS[f]?.label}
          </button>
        ))}
      </div>

      {loading ? <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>Chargement...</div>
      : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-secondary)' }}>
          <div style={{ fontSize: '36px', marginBottom: '12px' }}>📋</div>
          <button onClick={() => setShowForm(true)} style={{ color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: 500 }}>+ Ajouter une mission</button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {filtered.map(m => {
            const etab = getEtab(m.etablissement_id)
            const s = STATUTS[m.statut] || STATUTS.archive
            return (
              <div key={m.id} style={{ background: 'white', border: '1px solid var(--border)', borderRadius: '10px', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{ width: '4px', height: '44px', borderRadius: '4px', background: s.color, flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>{m.titre}</span>
                    <span style={{ padding: '2px 8px', borderRadius: '100px', fontSize: '11px', fontWeight: 600, background: s.bg, color: s.color }}>{s.label}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '12px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                    {etab && <span>🏥 {etab.nom}</span>}
                    {m.date_debut && <span>📅 {fmt(m.date_debut)}</span>}
                    <span>⏱ {m.heures}h</span>
                    <span style={{ color: '#16a34a', fontWeight: 600 }}>💰 {fmtEur(m.salaire_estime)}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '5px', flexShrink: 0 }}>
                  {[['contrat_signe','📝'],['fiche_paie_recue','🧾'],['salaire_recu','💸']].map(([f,ico]) => (
                    <button key={f} onClick={() => toggle(m, f)} style={{ padding: '5px 7px', borderRadius: '6px', border: '1px solid var(--border)', background: (m as any)[f] ? 'rgba(16,185,129,0.1)' : 'var(--bg-primary)', cursor: 'pointer', fontSize: '13px', color: (m as any)[f] ? '#16a34a' : 'var(--text-secondary)' }}>
                      {ico}{(m as any)[f] ? '✓' : '○'}
                    </button>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <button onClick={() => { setEditing(m); setForm({...empty,...m,date_debut:m.date_debut?.slice(0,16)||''}); setShowForm(true) }} style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-primary)', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '13px' }}>✏️</button>
                  <button onClick={() => del(m.id)} style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #fca5a5', background: '#fef2f2', color: '#dc2626', cursor: 'pointer', fontSize: '13px' }}>🗑️</button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }} onClick={e => { if (e.target === e.currentTarget) setShowForm(false) }}>
          <div style={{ background: 'white', borderRadius: '16px', padding: '28px', width: '100%', maxWidth: '520px', maxHeight: '90vh', overflow: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '22px' }}>
              <h2 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--text-primary)' }}>{editing ? 'Modifier' : 'Nouvelle mission'}</h2>
              <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '20px' }}>✕</button>
            </div>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '13px' }}>
              <div><label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '4px' }}>Titre *</label><input required value={form.titre} onChange={e => setForm({...form,titre:e.target.value})} placeholder="Medecine interne" style={inp} /></div>
              <div><label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '4px' }}>Etablissement *</label><select required value={form.etablissement_id} onChange={e => setForm({...form,etablissement_id:e.target.value})} style={inp}><option value="">Selectionner...</option>{etablissements.map(e => <option key={e.id} value={e.id}>{e.nom}</option>)}</select></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div><label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '4px' }}>Debut *</label><input required type="datetime-local" value={form.date_debut} onChange={e => setForm({...form,date_debut:e.target.value})} style={inp} /></div>
                <div><label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '4px' }}>Heures *</label><input required type="number" step="0.5" min="0" value={form.heures} onChange={e => setForm({...form,heures:Number(e.target.value)})} style={inp} /></div>
              </div>
              <div><label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '4px' }}>Statut</label><select value={form.statut} onChange={e => setForm({...form,statut:e.target.value})} style={inp}><option value="a_venir">A venir</option><option value="passee">Passee</option><option value="archive">Archivee</option></select></div>
              <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
                {[['majoration_nuit','Nuit +25%'],['majoration_dimanche','Dimanche +25%'],['majoration_ferie','Ferie +50%']].map(([f,l]) => (
                  <label key={f} style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '13px', color: 'var(--text-secondary)' }}><input type="checkbox" checked={form[f]} onChange={e => setForm({...form,[f]:e.target.checked})} />{l}</label>
                ))}
              </div>
              <div style={{ padding: '12px', borderRadius: '8px', background: 'rgba(232,123,249,0.08)', border: '1px solid rgba(232,123,249,0.2)', fontSize: '14px', fontWeight: 700, color: 'var(--accent)' }}>
                Salaire estime : {calcSalaire(form).toLocaleString('fr-FR',{style:'currency',currency:'EUR'})}
              </div>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '4px' }}>
                <button type="button" onClick={() => setShowForm(false)} style={{ padding: '10px 16px', borderRadius: '8px', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '14px' }}>Annuler</button>
                <button type="submit" style={{ padding: '10px 18px', borderRadius: '8px', background: 'var(--accent)', color: 'white', border: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: 600 }}>{editing ? 'Enregistrer' : 'Creer'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
