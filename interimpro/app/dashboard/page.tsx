'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

type Mission = {
  id: string; titre: string; etablissement_id: string; date_debut: string; date_fin: string
  statut: string; heures: number; salaire_estime: number; contrat_signe: boolean
  fiche_paie_recue: boolean; salaire_recu: boolean; majoration_nuit: boolean
  majoration_dimanche: boolean; majoration_ferie: boolean; notes: string
}
type Etab = { id: string; nom: string; taux_horaire: number; type?: string }

export default function DashboardPage() {
  const [missions, setMissions] = useState<Mission[]>([])
  const [etabs, setEtabs] = useState<Etab[]>([])
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
      setMissions((m.data || []) as Mission[])
      setEtabs((e.data || []) as Etab[])
      setLoading(false)
    }
    load()
  }, [])

  const now = new Date()
  const moisDebut = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const moisFin = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString()
  const moisMissions = missions.filter(m => m.date_debut >= moisDebut && m.date_debut <= moisFin)
  const heuresMois = moisMissions.reduce((a, m) => a + (m.heures || 0), 0)
  const revenusMois = moisMissions.reduce((a, m) => a + (m.salaire_estime || 0), 0)
  const objectif = 152
  const progressPct = Math.min((heuresMois / objectif) * 100, 100)
  const missionsAvenir = missions.filter(m => m.statut === 'a_venir')
  const getEtab = (id: string) => etabs.find(e => e.id === id)

  // Alertes
  const alertes: { type: 'warning' | 'error'; msg: string }[] = []
  const demain = new Date(); demain.setDate(demain.getDate() + 2)
  missionsAvenir.forEach(m => {
    if (!m.contrat_signe && new Date(m.date_debut) <= demain)
      alertes.push({ type: 'warning', msg: `Contrat non signé · ${m.titre}` })
  })
  missions.filter(m => m.statut === 'passee').forEach(m => {
    if (!m.fiche_paie_recue) {
      const le6 = new Date(new Date(m.date_debut).getFullYear(), new Date(m.date_debut).getMonth() + 1, 6)
      if (new Date() > le6) alertes.push({ type: 'error', msg: `Fiche de paie manquante · ${m.titre}` })
    }
  })

  const fmtDate = (d: string) => new Date(d).toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
  const fmtEur = (n: number) => n.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <div style={{ width: 36, height: 36, borderRadius: '50%', border: '3px solid var(--accent-light)', borderTop: '3px solid var(--accent)', animation: 'spin .8s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  return (
    <div style={{ maxWidth: 1100 }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: 'var(--text-primary)' }}>
          Bonjour {user?.user_metadata?.full_name?.split(' ')[0] || 'Solesne'} 👋
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginTop: 4 }}>
          {now.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>

      {/* Alertes */}
      {alertes.length > 0 && (
        <div style={{ marginBottom: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {alertes.map((a, i) => (
            <div key={i} style={{ padding: '10px 16px', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 10, background: a.type === 'error' ? '#fef2f2' : '#fffbeb', border: `1px solid ${a.type === 'error' ? '#fca5a5' : '#fde68a'}` }}>
              <span>{a.type === 'error' ? '🔴' : '⚠️'}</span>
              <span style={{ fontSize: 13, color: a.type === 'error' ? '#dc2626' : '#92400e', fontWeight: 500 }}>{a.msg}</span>
            </div>
          ))}
        </div>
      )}

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 14, marginBottom: 20 }}>
        {[
          { label: 'Revenus du mois', value: fmtEur(revenusMois), sub: `${moisMissions.length} mission(s)`, color: 'var(--accent)', icon: '💰' },
          { label: 'Heures ce mois', value: `${heuresMois.toFixed(1)}h`, sub: `sur ${objectif}h objectif`, color: '#6366f1', icon: '⏱️' },
          { label: 'Missions à venir', value: String(missionsAvenir.length), sub: `${missions.filter(m => m.statut === 'passee').length} passées`, color: '#06b6d4', icon: '📋' },
          { label: 'Établissements', value: String(etabs.length), sub: 'actifs', color: '#f59e0b', icon: '🏥' },
        ].map((k, i) => (
          <div key={i} style={{ background: 'white', border: '1px solid var(--border)', borderTop: `3px solid ${k.color}`, borderRadius: 12, padding: '18px 20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
              <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--text-secondary)' }}>{k.label}</span>
              <span style={{ fontSize: 20 }}>{k.icon}</span>
            </div>
            <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 3 }}>{k.value}</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Barre objectif */}
      <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 12, padding: '18px 20px', marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <div>
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>Progression objectif mensuel</span>
            <span style={{ fontSize: 12, color: 'var(--text-secondary)', marginLeft: 8 }}>{heuresMois.toFixed(1)}h / {objectif}h</span>
          </div>
          <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--accent)' }}>{progressPct.toFixed(0)}%</span>
        </div>
        <div style={{ height: 10, background: '#f3f4f6', borderRadius: 100, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${progressPct}%`, background: 'linear-gradient(90deg, #d946ef, #a21caf)', borderRadius: 100, transition: 'width .5s' }} />
        </div>
        {progressPct >= 100 && <p style={{ fontSize: 12, color: 'var(--accent)', marginTop: 6, fontWeight: 600 }}>🎉 Objectif atteint ce mois !</p>}
      </div>

      {/* Grille inférieure */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Prochaines missions */}
        <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 12, padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>Prochaines missions</h3>
            <Link href="/dashboard/missions" style={{ fontSize: 12, color: 'var(--accent)', textDecoration: 'none', fontWeight: 600 }}>Voir tout →</Link>
          </div>
          {missionsAvenir.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '28px 0', color: 'var(--text-secondary)' }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>📋</div>
              <p style={{ fontSize: 13 }}>Aucune mission à venir</p>
              <Link href="/dashboard/missions" style={{ fontSize: 12, color: 'var(--accent)', textDecoration: 'none', display: 'inline-block', marginTop: 8 }}>+ Ajouter une mission</Link>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {missionsAvenir.slice(0, 4).map(m => {
                const etab = getEtab(m.etablissement_id)
                return (
                  <div key={m.id} style={{ padding: 12, borderRadius: 8, background: 'var(--bg-primary)', border: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{m.titre}</span>
                      {!m.contrat_signe && <span style={{ fontSize: 10, background: '#fef3c7', color: '#92400e', padding: '2px 6px', borderRadius: 4, fontWeight: 600 }}>CONTRAT !</span>}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 3 }}>{etab?.nom} · {m.heures}h</div>
                    <div style={{ fontSize: 11, color: 'var(--accent)', marginTop: 2, fontWeight: 500 }}>📅 {fmtDate(m.date_debut)}</div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Suivi administratif */}
        <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 12, padding: 20 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 16 }}>Suivi administratif</h3>
          {[
            { label: 'Contrats signés', count: missions.filter(m => m.contrat_signe).length, total: missions.length, color: 'var(--accent)' },
            { label: 'Fiches de paie reçues', count: missions.filter(m => m.fiche_paie_recue).length, total: missions.filter(m => m.statut === 'passee').length, color: '#6366f1' },
            { label: 'Salaires reçus', count: missions.filter(m => m.salaire_recu).length, total: missions.filter(m => m.statut === 'passee').length, color: '#10b981' },
          ].map((item, i) => (
            <div key={i} style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{item.label}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{item.count}/{item.total}</span>
              </div>
              <div style={{ height: 6, background: '#f3f4f6', borderRadius: 100, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: item.total > 0 ? `${(item.count / item.total) * 100}%` : '0%', background: item.color, borderRadius: 100 }} />
              </div>
            </div>
          ))}
          <div style={{ marginTop: 16, padding: 14, borderRadius: 10, background: 'var(--accent-light)', border: '1px solid var(--accent-border)' }}>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 3 }}>Total revenus estimés (tout)</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--accent)' }}>
              {fmtEur(missions.reduce((a, m) => a + (m.salaire_estime || 0), 0))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
