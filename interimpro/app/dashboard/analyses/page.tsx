'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

type Mission = { id: string; date_debut: string; heures: number; salaire_estime: number; etablissement_id: string; statut: string; contrat_signe: boolean; fiche_paie_recue: boolean }
type Etab = { id: string; nom: string }

export default function AnalysesPage() {
  const [missions, setMissions] = useState<Mission[]>([])
  const [etabs, setEtabs] = useState<Etab[]>([])
  const [periode, setPeriode] = useState('6m')
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

  const now = new Date()
  const nb = periode === '3m' ? 3 : periode === '6m' ? 6 : 12
  const moisLabels: string[] = []
  const moisRev: number[] = []
  const moisH: number[] = []

  for (let i = nb - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    moisLabels.push(d.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' }))
    const debut = new Date(d.getFullYear(), d.getMonth(), 1).toISOString()
    const fin = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59).toISOString()
    const ms = missions.filter(x => x.date_debut >= debut && x.date_debut <= fin)
    moisRev.push(ms.reduce((a, x) => a + (x.salaire_estime || 0), 0))
    moisH.push(ms.reduce((a, x) => a + (x.heures || 0), 0))
  }

  const maxRev = Math.max(...moisRev, 1)
  const maxH = Math.max(...moisH, 1)
  const fmtEur = (n: number) => n.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })

  const topEtabs = etabs.map(e => {
    const ms = missions.filter(x => x.etablissement_id === e.id)
    return { ...e, count: ms.length, heures: ms.reduce((a, x) => a + (x.heures || 0), 0), rev: ms.reduce((a, x) => a + (x.salaire_estime || 0), 0) }
  }).sort((a, b) => b.rev - a.rev).slice(0, 5)

  const totalRev = missions.reduce((a, m) => a + (m.salaire_estime || 0), 0)
  const totalH = missions.reduce((a, m) => a + (m.heures || 0), 0)
  const passees = missions.filter(m => m.statut === 'passee')

  return (
    <div style={{ maxWidth: 1000 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)' }}>Analyses</h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>Vue d'ensemble de votre activité</p>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {['3m', '6m', '12m'].map(p => (
            <button key={p} onClick={() => setPeriode(p)}
              style={{ padding: '7px 13px', borderRadius: 8, border: '1px solid var(--border)', background: periode === p ? 'var(--accent)' : 'white', color: periode === p ? 'white' : 'var(--text-secondary)', cursor: 'pointer', fontSize: 13, fontWeight: periode === p ? 700 : 400 }}>{p}</button>
          ))}
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Revenus totaux', value: fmtEur(totalRev), color: 'var(--accent)' },
          { label: 'Heures totales', value: `${totalH.toFixed(0)}h`, color: '#6366f1' },
          { label: 'Taux contrats signés', value: missions.length > 0 ? `${Math.round(missions.filter(m => m.contrat_signe).length / missions.length * 100)}%` : '0%', color: '#06b6d4' },
          { label: 'Taux fiches reçues', value: passees.length > 0 ? `${Math.round(passees.filter(m => m.fiche_paie_recue).length / passees.length * 100)}%` : '0%', color: '#10b981' },
        ].map((k, i) => (
          <div key={i} style={{ background: 'white', border: '1px solid var(--border)', borderLeft: `3px solid ${k.color}`, borderRadius: 10, padding: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: 8, letterSpacing: '.05em' }}>{k.label}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)' }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Graphique revenus */}
      <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 12, padding: 20, marginBottom: 16 }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 16 }}>Revenus par mois</h3>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 150 }}>
          {moisRev.map((v, i) => (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, height: '100%', justifyContent: 'flex-end' }}>
              {v > 0 && <span style={{ fontSize: 9, color: 'var(--text-secondary)', fontWeight: 600 }}>{fmtEur(v).replace(',00', '')}</span>}
              <div style={{ width: '100%', borderRadius: '4px 4px 0 0', background: 'linear-gradient(180deg,#d946ef,#a21caf)', height: `${Math.max((v / maxRev) * 120, v > 0 ? 4 : 0)}px`, transition: 'height .4s' }} />
              <span style={{ fontSize: 9, color: 'var(--text-secondary)' }}>{moisLabels[i]}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Graphique heures */}
      <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 12, padding: 20, marginBottom: 16 }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 16 }}>Heures travaillées par mois</h3>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 110 }}>
          {moisH.map((v, i) => (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, height: '100%', justifyContent: 'flex-end' }}>
              {v > 0 && <span style={{ fontSize: 9, color: 'var(--text-secondary)' }}>{v.toFixed(0)}h</span>}
              <div style={{ width: '100%', borderRadius: '4px 4px 0 0', background: '#6366f1', height: `${Math.max((v / maxH) * 85, v > 0 ? 4 : 0)}px` }} />
              <span style={{ fontSize: 9, color: 'var(--text-secondary)' }}>{moisLabels[i]}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Top établissements */}
      <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 12, padding: 20 }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 14 }}>Top établissements</h3>
        {topEtabs.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>Aucune donnée disponible</p>
        ) : topEtabs.map((e, i) => (
          <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 8, background: 'var(--bg-primary)', marginBottom: 6 }}>
            <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-secondary)', minWidth: 24 }}>#{i + 1}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{e.nom}</div>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{e.count} mission(s) · {e.heures.toFixed(0)}h</div>
            </div>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#059669' }}>{fmtEur(e.rev)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
