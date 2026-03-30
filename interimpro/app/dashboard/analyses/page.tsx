'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

type Mission = { id: string; date_debut: string; heures: number; salaire_estime: number; etablissement_id: string; statut: string }
type Etab = { id: string; nom: string }

const MOIS_LABELS = ['janv.','févr.','mars','avr.','mai','juin','juil.','août','sept.','oct.','nov.','déc.']

export default function AnalysesPage() {
  const [missions, setMissions] = useState<Mission[]>([])
  const [etabs, setEtabs] = useState<Etab[]>([])
  const [moisCur, setMoisCur] = useState(new Date())
  const [anneeCur, setAnneeCur] = useState(new Date().getFullYear())
  const supabase = createClient()

  useEffect(() => {
    const load = async () => {
      const [m, e] = await Promise.all([
        supabase.from('missions').select('*').order('date_debut'),
        supabase.from('etablissements').select('*'),
      ])
      setMissions((m.data || []) as Mission[])
      setEtabs((e.data || []) as Etab[])
    }
    load()
  }, [])

  const y = moisCur.getFullYear(), mo = moisCur.getMonth()
  const moisDeb = new Date(y, mo, 1).toISOString()
  const moisFin = new Date(y, mo + 1, 0, 23, 59, 59).toISOString()
  const moisMs = missions.filter(m => m.date_debut >= moisDeb && m.date_debut <= moisFin)
  const revM = moisMs.reduce((a, m) => a + (m.salaire_estime || 0), 0)
  const hM = moisMs.reduce((a, m) => a + (m.heures || 0), 0)

  // Evolution mensuelle (année en cours)
  const evoData = Array.from({ length: 12 }, (_, i) => {
    const deb = new Date(y, i, 1).toISOString()
    const fin = new Date(y, i + 1, 0, 23, 59, 59).toISOString()
    const ms = missions.filter(m => m.date_debut >= deb && m.date_debut <= fin)
    return { h: ms.reduce((a, m) => a + (m.heures || 0), 0), rev: ms.reduce((a, m) => a + (m.salaire_estime || 0), 0) }
  })
  const maxEvo = Math.max(...evoData.map(d => d.h), 1)

  // Répartition par étab
  const etabData = etabs.map(e => {
    const ms = missions.filter(m => m.etablissement_id === e.id)
    return { ...e, count: ms.length, h: ms.reduce((a, m) => a + (m.heures || 0), 0) }
  }).filter(e => e.count > 0)
  const totalH = etabData.reduce((a, e) => a + e.h, 0)
  const COLORS = ['#06b6d4','#e879f9','#8b5cf6','#10b981','#f59e0b','#ef4444']

  // Stats annuelles
  const anneeMs = missions.filter(m => m.date_debut?.startsWith(String(anneeCur)))
  const revA = anneeMs.reduce((a, m) => a + (m.salaire_estime || 0), 0)
  const hA = anneeMs.reduce((a, m) => a + (m.heures || 0), 0)
  const evoAnnee = Array.from({ length: 12 }, (_, i) => {
    const deb = new Date(anneeCur, i, 1).toISOString()
    const fin = new Date(anneeCur, i + 1, 0, 23, 59, 59).toISOString()
    const ms = missions.filter(m => m.date_debut >= deb && m.date_debut <= fin)
    return { h: ms.reduce((a, m) => a + (m.heures || 0), 0) }
  })
  const maxA = Math.max(...evoAnnee.map(d => d.h), 1)

  const fmtEur = (n: number) => n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'
  const moisLabel = moisCur.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }).replace(/^./, c => c.toUpperCase())

  const StatCard = ({ label, value, color, icon }: any) => (
    <div style={{ flex: 1, background: '#1e293b', border: '1px solid #334155', borderLeft: `3px solid ${color}`, borderRadius: 12, padding: '16px 20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: '#64748b' }}>{label}</span>
        <span style={{ color: '#334155' }}>{icon}</span>
      </div>
      <div style={{ fontSize: 24, fontWeight: 800, color: '#f1f5f9' }}>{value}</div>
    </div>
  )

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: '#f1f5f9' }}>Analyses</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={() => setMoisCur(new Date(y, mo - 1, 1))} style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid #334155', background: '#1e293b', color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>‹</button>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#f1f5f9', minWidth: 110, textAlign: 'center' }}>{moisLabel}</span>
          <button onClick={() => setMoisCur(new Date(y, mo + 1, 1))} style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid #334155', background: '#1e293b', color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>›</button>
        </div>
      </div>

      {/* KPIs mois */}
      <div style={{ display: 'flex', gap: 14, marginBottom: 20 }}>
        <StatCard label="Revenus du mois" value={fmtEur(revM)} color="#10b981" icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>} />
        <StatCard label="Heures du mois" value={`${hM.toFixed(1)}h`} color="#8b5cf6" icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>} />
        <StatCard label="Missions du mois" value={String(moisMs.length)} color="#e879f9" icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>} />
      </div>

      {/* Graphiques */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
        {/* Evolution mensuelle */}
        <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 12, padding: 20 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9', marginBottom: 16 }}>Évolution mensuelle</h3>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 140, padding: '0 4px' }}>
            {evoData.map((d, i) => (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, height: '100%', justifyContent: 'flex-end' }}>
                <div style={{ width: '100%', borderRadius: '3px 3px 0 0', background: d.h > 0 ? '#06b6d4' : '#334155', height: `${Math.max((d.h / maxEvo) * 115, d.h > 0 ? 4 : 2)}px`, transition: 'height .3s' }} />
                <span style={{ fontSize: 8, color: '#64748b', transform: 'rotate(-30deg)', transformOrigin: 'center', whiteSpace: 'nowrap' }}>{MOIS_LABELS[i]}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Répartition */}
        <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 12, padding: 20 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9', marginBottom: 16 }}>Répartition par établissement</h3>
          {etabData.length === 0 ? <p style={{ color: '#64748b', fontSize: 13 }}>Aucune donnée</p> : (
            <>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
                <svg viewBox="0 0 120 120" width="150" height="150">
                  {(() => {
                    let offset = 0
                    return etabData.map((e, i) => {
                      const pct = totalH > 0 ? (e.h / totalH) : 0
                      const dash = pct * 314
                      const gap = 314 - dash
                      const el = <circle key={e.id} cx="60" cy="60" r="50" fill="none" stroke={COLORS[i % COLORS.length]} strokeWidth="18" strokeDasharray={`${dash} ${gap}`} strokeDashoffset={-offset * 314 / 1} transform="rotate(-90 60 60)" />
                      offset += pct
                      return el
                    })
                  })()}
                </svg>
              </div>
              {etabData.map((e, i) => (
                <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <div style={{ width: 10, height: 10, borderRadius: 2, background: COLORS[i % COLORS.length], flexShrink: 0 }} />
                  <span style={{ fontSize: 12, color: '#94a3b8' }}>{e.nom}</span>
                </div>
              ))}
            </>
          )}
        </div>
      </div>

      {/* Stats annuelles */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: '#f1f5f9' }}>Statistiques annuelles</h2>
          <button onClick={() => setAnneeCur(a => a - 1)} style={{ width: 22, height: 22, borderRadius: 5, border: '1px solid #334155', background: '#1e293b', color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>‹</button>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#f1f5f9' }}>{anneeCur}</span>
          <button onClick={() => setAnneeCur(a => a + 1)} style={{ width: 22, height: 22, borderRadius: 5, border: '1px solid #334155', background: '#1e293b', color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>›</button>
        </div>
        <div style={{ display: 'flex', gap: 14, marginBottom: 16 }}>
          <StatCard label="Revenus annuels" value={fmtEur(revA)} color="#10b981" icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>} />
          <StatCard label="Heures annuelles" value={`${hA.toFixed(1)}h`} color="#8b5cf6" icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>} />
          <StatCard label="Missions annuelles" value={String(anneeMs.length)} color="#e879f9" icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>} />
        </div>
        <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 12, padding: 20 }}>
          <h3 style={{ fontSize: 13, fontWeight: 700, color: '#f1f5f9', marginBottom: 14 }}>Évolution mensuelle — {anneeCur}</h3>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 120 }}>
            {evoAnnee.map((d, i) => (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, height: '100%', justifyContent: 'flex-end' }}>
                <div style={{ width: '100%', borderRadius: '3px 3px 0 0', background: d.h > 0 ? '#e879f9' : '#334155', height: `${Math.max((d.h / maxA) * 95, d.h > 0 ? 4 : 2)}px` }} />
                <span style={{ fontSize: 8, color: '#64748b', transform: 'rotate(-30deg)', transformOrigin: 'center', whiteSpace: 'nowrap' }}>{MOIS_LABELS[i]}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
