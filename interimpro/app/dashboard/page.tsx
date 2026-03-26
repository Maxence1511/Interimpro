'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

function StatCard({ label, value, sub, color, icon }: any) {
  return (
    <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px', borderTop: `3px solid ${color}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
        <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
        <span style={{ fontSize: '22px' }}>{icon}</span>
      </div>
      <div style={{ fontSize: '26px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '4px' }}>{value}</div>
      <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{sub}</div>
    </div>
  )
}

export default function DashboardPage() {
  const [missions, setMissions] = useState<any[]>([])
  const [etablissements, setEtablissements] = useState<any[]>([])
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      const [m, e] = await Promise.all([
        supabase.from('missions').select('*').order('date_debut', { ascending: true }),
        supabase.from('etablissements').select('*').eq('archived', false)
      ])
      setMissions(m.data || []); setEtablissements(e.data || []); setLoading(false)
    }
    load()
  }, [])

  const now = new Date()
  const moisDebut = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const moisFin = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString()
  const moisMissions = missions.filter(m => m.date_debut >= moisDebut && m.date_debut <= moisFin)
  const heures = moisMissions.reduce((a, m) => a + (m.heures || 0), 0)
  const revenus = moisMissions.reduce((a, m) => a + (m.salaire_estime || 0), 0)
  const objectif = 151.67
  const progress = Math.min((heures / objectif) * 100, 100)
  const avenir = missions.filter(m => m.statut === 'a_venir').slice(0, 5)
  const getEtab = (id: string) => etablissements.find(e => e.id === id)
  const fmt = (d: string) => new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
  const fmtEur = (n: number) => n.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })

  // Alertes
  const alertes: any[] = []
  const demain = new Date(); demain.setDate(demain.getDate() + 1)
  missions.forEach(m => {
    if (m.statut === 'a_venir' && !m.contrat_signe && new Date(m.date_debut) <= demain)
      alertes.push({ type: 'warning', msg: `Contrat non signé — ${m.titre}` })
    if (m.statut === 'passee' && !m.fiche_paie_recue) {
      const le6 = new Date(new Date(m.date_debut).getFullYear(), new Date(m.date_debut).getMonth() + 1, 6)
      if (new Date() > le6) alertes.push({ type: 'error', msg: `Fiche de paie manquante — ${m.titre}` })
    }
  })

  if (loading) return <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-secondary)' }}>Chargement...</div>

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '4px' }}>
          Bonjour {user?.user_metadata?.full_name?.split(' ')[0] || ''} 👋
        </h1>
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
          {new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })} — voici un résumé de votre activité
        </p>
      </div>

      {/* Alertes */}
      {alertes.length > 0 && (
        <div style={{ marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {alertes.slice(0, 3).map((a, i) => (
            <div key={i} style={{ padding: '12px 16px', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '10px', background: a.type === 'error' ? '#fef2f2' : '#fffbeb', border: `1px solid ${a.type === 'error' ? '#fca5a5' : '#fde68a'}` }}>
              <span>{a.type === 'error' ? '🔴' : '⚠️'}</span>
              <span style={{ fontSize: '13px', color: a.type === 'error' ? '#dc2626' : '#92400e' }}>{a.msg}</span>
            </div>
          ))}
        </div>
      )}

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginBottom: '20px' }}>
        <StatCard label="Revenus du mois" value={fmtEur(revenus)} sub={`${moisMissions.length} missions`} color="#e87bf9" icon="💰" />
        <StatCard label="Heures travaillées" value={`${heures.toFixed(1)}h`} sub={`Objectif : ${objectif}h`} color="#818cf8" icon="⏱️" />
        <StatCard label="Missions à venir" value={avenir.length.toString()} sub={`${missions.filter(m => m.statut === 'passee').length} passées`} color="#34d399" icon="📋" />
        <StatCard label="Établissements" value={etablissements.length.toString()} sub="actifs" color="#fb923c" icon="🏥" />
      </div>

      {/* Barre de progression */}
      <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
          <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>Objectif mensuel</span>
          <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--accent)' }}>{progress.toFixed(0)}%</span>
        </div>
        <div style={{ height: '8px', background: 'var(--bg-primary)', borderRadius: '100px', overflow: 'hidden', marginBottom: '8px' }}>
          <div style={{ height: '100%', width: `${progress}%`, background: 'linear-gradient(90deg, #e87bf9, #a855f7)', borderRadius: '100px', transition: 'width 0.5s' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-secondary)' }}>
          <span>{heures.toFixed(1)}h effectuées</span>
          <span>{objectif}h objectif</span>
        </div>
      </div>

      {/* Grille 2 colonnes */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        {/* Prochaines missions */}
        <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>Prochaines missions</h3>
            <Link href="/dashboard/missions" style={{ fontSize: '12px', color: 'var(--accent)', textDecoration: 'none', fontWeight: 500 }}>Voir tout →</Link>
          </div>
          {avenir.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-secondary)', fontSize: '14px' }}>
              <div style={{ fontSize: '28px', marginBottom: '8px' }}>📋</div>
              Aucune mission à venir
              <div style={{ marginTop: '10px' }}>
                <Link href="/dashboard/missions" style={{ color: 'var(--accent)', fontSize: '13px', textDecoration: 'none', fontWeight: 500 }}>+ Ajouter une mission</Link>
              </div>
            </div>
          ) : avenir.map(m => {
            const etab = getEtab(m.etablissement_id)
            return (
              <div key={m.id} style={{ padding: '12px', borderRadius: '8px', background: 'var(--bg-primary)', border: '1px solid var(--border)', marginBottom: '8px' }}>
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>{m.titre}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '2px' }}>🏥 {etab?.nom || '—'}</div>
                <div style={{ fontSize: '12px', color: 'var(--accent)', fontWeight: 500 }}>📅 {fmt(m.date_debut)} · {m.heures}h</div>
                {!m.contrat_signe && <span style={{ fontSize: '11px', color: '#f59e0b', display: 'block', marginTop: '4px' }}>⚠️ Contrat non signé</span>}
              </div>
            )
          })}
        </div>

        {/* Suivi administratif */}
        <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '16px' }}>Suivi administratif</h3>
          {[
            { label: 'Contrats signés', count: missions.filter(m => m.contrat_signe).length, total: missions.length, color: '#e87bf9' },
            { label: 'Fiches de paie', count: missions.filter(m => m.fiche_paie_recue).length, total: missions.filter(m => m.statut === 'passee').length, color: '#818cf8' },
            { label: 'Salaires reçus', count: missions.filter(m => m.salaire_recu).length, total: missions.filter(m => m.statut === 'passee').length, color: '#34d399' },
          ].map((item, i) => (
            <div key={i} style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{item.label}</span>
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{item.count}/{item.total}</span>
              </div>
              <div style={{ height: '6px', background: 'var(--bg-primary)', borderRadius: '100px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: item.total > 0 ? `${(item.count / item.total) * 100}%` : '0%', background: item.color, borderRadius: '100px', transition: 'width 0.5s' }} />
              </div>
            </div>
          ))}
          <div style={{ marginTop: '20px', padding: '14px', borderRadius: '10px', background: 'rgba(232,123,249,0.08)', border: '1px solid rgba(232,123,249,0.2)' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Total estimé (tous mois)</div>
            <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--accent)' }}>
              {fmtEur(missions.reduce((a, m) => a + (m.salaire_estime || 0), 0))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
