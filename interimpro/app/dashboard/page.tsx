'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

type Mission = { id: string; titre: string; etablissement_id: string; date_debut: string; date_fin: string; statut: string; heures: number; salaire_estime: number; contrat_signe: boolean; fiche_paie_recue: boolean; salaire_recu: boolean }
type Etab = { id: string; nom: string; taux_horaire: number }

const C = (s: React.CSSProperties) => s

export default function DashboardPage() {
  const [missions, setMissions] = useState<Mission[]>([])
  const [etabs, setEtabs] = useState<Etab[]>([])
  const [mois, setMois] = useState(new Date())
  const [loading, setLoading] = useState(true)
  const [prevRev, setPrevRev] = useState(0)
  const [prevH, setPrevH] = useState(0)
  const [objectif, setObjectif] = useState(151.67)
  const supabase = createClient()

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      const [m, e, p] = await Promise.all([
        supabase.from('missions').select('*').order('date_debut', { ascending: false }),
        supabase.from('etablissements').select('*').eq('archived', false),
        supabase.from('user_preferences').select('objectif_heures_mensuel').eq('user_id', user?.id).single(),
      ])
      setMissions((m.data || []) as Mission[])
      setEtabs((e.data || []) as Etab[])
      if (p.data?.objectif_heures_mensuel) setObjectif(p.data.objectif_heures_mensuel)
      setLoading(false)
    }
    load()
  }, [])

  const y = mois.getFullYear(), mo = mois.getMonth()
  const deb = new Date(y, mo, 1).toISOString()
  const fin = new Date(y, mo + 1, 0, 23, 59, 59).toISOString()
  const debPrev = new Date(y, mo - 1, 1).toISOString()
  const finPrev = new Date(y, mo, 0, 23, 59, 59).toISOString()

  const moisMs = missions.filter(m => m.date_debut >= deb && m.date_debut <= fin)
  const prevMs = missions.filter(m => m.date_debut >= debPrev && m.date_debut <= finPrev)
  const rev = moisMs.reduce((a, m) => a + (m.salaire_estime || 0), 0)
  const h = moisMs.reduce((a, m) => a + (m.heures || 0), 0)
  const prevRevM = prevMs.reduce((a, m) => a + (m.salaire_estime || 0), 0)
  const prevHM = prevMs.reduce((a, m) => a + (m.heures || 0), 0)
  const pct = Math.min((h / objectif) * 100, 100)
  const avenir = missions.filter(m => m.statut === 'a_venir').sort((a, b) => a.date_debut.localeCompare(b.date_debut))
  const passees = missions.filter(m => m.statut === 'passee').sort((a, b) => b.date_debut.localeCompare(a.date_debut))
  const getEtab = (id: string) => etabs.find(e => e.id === id)

  const fmtEur = (n: number) => n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'
  const fmtDate = (d: string) => new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
  const moisLabel = mois.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }).replace(/^./, c => c.toUpperCase())

  const StatCard = ({ label, value, sub, color, icon }: any) => (
    <div style={{ background: '#1e293b', border: '1px solid #334155', borderLeft: `3px solid ${color}`, borderRadius: 12, padding: '16px 20px', flex: 1 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: '#64748b' }}>{label}</span>
        <span style={{ color: '#334155', opacity: .7 }}>{icon}</span>
      </div>
      <div style={{ fontSize: 26, fontWeight: 800, color: '#f1f5f9', marginBottom: 6 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: '#10b981', display: 'flex', alignItems: 'center', gap: 3 }}>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/></svg>
        {sub}
      </div>}
    </div>
  )

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '50vh' }}><div style={{ width: 32, height: 32, borderRadius: '50%', border: '3px solid rgba(232,121,249,.15)', borderTop: '3px solid #e879f9', animation: 'spin .8s linear infinite' }} /><style>{'@keyframes spin{to{transform:rotate(360deg)}}'}</style></div>

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: '#f1f5f9', marginBottom: 2 }}>Tableau de bord</h1>
        <p style={{ fontSize: 13, color: '#64748b' }}>Votre carrière d'intérimaire simplifiée</p>
      </div>

      {/* Mois navigation */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <button onClick={() => setMois(new Date(y, mo - 1, 1))} style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid #334155', background: '#1e293b', color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>‹</button>
        <span style={{ fontSize: 14, fontWeight: 600, color: '#f1f5f9', minWidth: 100, textAlign: 'center' }}>{moisLabel}</span>
        <button onClick={() => setMois(new Date(y, mo + 1, 1))} style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid #334155', background: '#1e293b', color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>›</button>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'flex', gap: 14, marginBottom: 24 }}>
        <StatCard label="Revenus du mois" value={fmtEur(rev)} sub={prevRevM > 0 ? `+${fmtEur(rev - prevRevM)} vs mois préc.` : undefined} color="#10b981"
          icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>} />
        <StatCard label="Heures du mois" value={`${h.toFixed(1)}h`} sub={prevHM > 0 ? `+${(h - prevHM).toFixed(1)}h vs mois préc.` : undefined} color="#8b5cf6"
          icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>} />
        <div style={{ background: '#1e293b', border: '1px solid #334155', borderLeft: '3px solid #e879f9', borderRadius: 12, padding: '16px 20px', flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
            <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: '#64748b' }}>Objectif</span>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#334155" strokeWidth="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: '#f1f5f9', marginBottom: 4 }}>{pct.toFixed(0)}%</div>
          <div style={{ fontSize: 11, color: '#64748b', marginBottom: 8 }}>{h.toFixed(1)}h / {objectif}h</div>
          <div style={{ height: 4, background: '#334155', borderRadius: 100, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${pct}%`, background: '#e879f9', borderRadius: 100 }} />
          </div>
        </div>
      </div>

      {/* 2 colonnes */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Prochaines missions */}
        <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 12, padding: 20 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9', marginBottom: 14 }}>Prochaines missions</h3>
          {avenir.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 0', color: '#64748b' }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ margin: '0 auto 10px', display: 'block' }}><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              <p style={{ fontSize: 13 }}>Aucune mission à venir</p>
            </div>
          ) : avenir.slice(0, 4).map(m => {
            const etab = getEtab(m.etablissement_id)
            return (
              <div key={m.id} style={{ padding: '10px 12px', borderRadius: 8, background: '#0f172a', border: '1px solid #334155', marginBottom: 6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#f1f5f9' }}>{m.titre}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#e879f9' }}>{fmtEur(m.salaire_estime)}</span>
                </div>
                <div style={{ fontSize: 11, color: '#64748b' }}>{etab?.nom} · {m.heures}h</div>
                <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{fmtDate(m.date_debut)}</div>
              </div>
            )
          })}
        </div>

        {/* Dernières missions réalisées */}
        <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 12, padding: 20 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9', marginBottom: 14 }}>Dernières missions réalisées</h3>
          {passees.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 0', color: '#64748b' }}><p style={{ fontSize: 13 }}>Aucune mission réalisée</p></div>
          ) : passees.slice(0, 4).map(m => {
            const etab = getEtab(m.etablissement_id)
            return (
              <div key={m.id} style={{ padding: '10px 12px', borderRadius: 8, background: '#0f172a', border: '1px solid #334155', marginBottom: 6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#f1f5f9' }}>{m.titre}</div>
                    <div style={{ fontSize: 11, color: '#64748b' }}>{etab?.nom}</div>
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#e879f9' }}>{fmtEur(m.salaire_estime)}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 6 }}>
                  <span style={{ fontSize: 11, color: '#64748b', display: 'flex', alignItems: 'center', gap: 3 }}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                    {fmtDate(m.date_debut)} · {m.heures}h
                  </span>
                  <span style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={m.contrat_signe ? '#10b981' : '#475569'} strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={m.fiche_paie_recue ? '#10b981' : '#475569'} strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={m.salaire_recu ? '#10b981' : '#475569'} strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                  </span>
                </div>
              </div>
            )
          })}
          {passees.length > 0 && (
            <div style={{ marginTop: 10, textAlign: 'right' }}>
              <Link href="/dashboard/missions" style={{ fontSize: 12, color: '#e879f9', textDecoration: 'none', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                Voir toutes <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
