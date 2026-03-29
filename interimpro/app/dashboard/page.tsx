'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

type Mission = { id: string; titre: string; etablissement_id: string; date_debut: string; date_fin: string; statut: string; heures: number; salaire_estime: number; contrat_signe: boolean; fiche_paie_recue: boolean; salaire_recu: boolean; majoration_nuit: boolean; majoration_dimanche: boolean; majoration_ferie: boolean }
type Etab = { id: string; nom: string; taux_horaire: number }
type Prefs = { objectif_heures_mensuel: number }

function StatCard({ label, value, sub, color, icon }: { label: string; value: string; sub: string; color: string; icon: React.ReactNode }) {
  return (
    <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 12, padding: '18px 20px', borderTop: `3px solid ${color}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: '#9ca3af' }}>{label}</span>
        <span style={{ color, opacity: .8 }}>{icon}</span>
      </div>
      <div style={{ fontSize: 28, fontWeight: 800, color: '#111827', marginBottom: 3 }}>{value}</div>
      <div style={{ fontSize: 12, color: '#9ca3af' }}>{sub}</div>
    </div>
  )
}

export default function DashboardPage() {
  const [missions, setMissions] = useState<Mission[]>([])
  const [etabs, setEtabs] = useState<Etab[]>([])
  const [user, setUser] = useState<any>(null)
  const [prefs, setPrefs] = useState<Prefs>({ objectif_heures_mensuel: 151.67 })
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      const [m, e, p] = await Promise.all([
        supabase.from('missions').select('*').order('date_debut', { ascending: true }),
        supabase.from('etablissements').select('*').eq('archived', false),
        supabase.from('user_preferences').select('*').eq('user_id', user?.id).single(),
      ])
      setMissions((m.data || []) as Mission[])
      setEtabs((e.data || []) as Etab[])
      if (p.data) setPrefs(p.data)
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
  const objectif = prefs.objectif_heures_mensuel
  const pct = Math.min((heuresMois / objectif) * 100, 100)
  const avenir = missions.filter(m => m.statut === 'a_venir')
  const passees = missions.filter(m => m.statut === 'passee')
  const getEtab = (id: string) => etabs.find(e => e.id === id)

  // Alertes intelligentes
  const alertes: { type: 'warning' | 'error'; msg: string }[] = []
  const dans2j = new Date(); dans2j.setDate(dans2j.getDate() + 2)
  avenir.forEach(m => {
    if (!m.contrat_signe && new Date(m.date_debut) <= dans2j)
      alertes.push({ type: 'warning', msg: `Contrat non signé · ${m.titre} · ${new Date(m.date_debut).toLocaleDateString('fr-FR')}` })
  })
  passees.forEach(m => {
    if (!m.fiche_paie_recue) {
      const le6 = new Date(new Date(m.date_debut).getFullYear(), new Date(m.date_debut).getMonth() + 1, 6)
      if (new Date() > le6) alertes.push({ type: 'error', msg: `Fiche de paie manquante · ${m.titre}` })
    }
    if (m.fiche_paie_recue && !m.salaire_recu) {
      const le20 = new Date(new Date(m.date_debut).getFullYear(), new Date(m.date_debut).getMonth() + 1, 20)
      if (new Date() > le20) alertes.push({ type: 'warning', msg: `Salaire non reçu · ${m.titre}` })
    }
  })

  const fmtDate = (d: string) => new Date(d).toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
  const fmtEur = (n: number) => n?.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }) || '0 €'

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '50vh' }}>
      <div style={{ width: 36, height: 36, borderRadius: '50%', border: '3px solid rgba(232,121,249,.2)', borderTop: '3px solid #e879f9', animation: 'spin .8s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  return (
    <div style={{ maxWidth: 1100 }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: '#111827' }}>
          Bonjour {user?.user_metadata?.full_name?.split(' ')[0] || ''} 👋
        </h1>
        <p style={{ color: '#6b7280', fontSize: 14, marginTop: 4 }}>
          {now.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>

      {/* Alertes */}
      {alertes.length > 0 && (
        <div style={{ marginBottom: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {alertes.map((a, i) => (
            <div key={i} style={{ padding: '10px 16px', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 10, background: a.type === 'error' ? '#fef2f2' : '#fffbeb', border: `1px solid ${a.type === 'error' ? '#fecaca' : '#fde68a'}` }}>
              <span style={{ fontSize: 16 }}>{a.type === 'error' ? '🔴' : '⚠️'}</span>
              <span style={{ fontSize: 13, color: a.type === 'error' ? '#dc2626' : '#92400e', fontWeight: 500 }}>{a.msg}</span>
            </div>
          ))}
        </div>
      )}

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 20 }}>
        <StatCard label="Revenus du mois" value={fmtEur(revenusMois)} sub={`${moisMissions.length} mission(s) ce mois`} color="#e879f9" icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>} />
        <StatCard label="Heures ce mois" value={`${heuresMois.toFixed(1)}h`} sub={`Objectif : ${objectif}h`} color="#8b5cf6" icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>} />
        <StatCard label="Missions à venir" value={String(avenir.length)} sub={`${passees.length} passée(s)`} color="#06b6d4" icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>} />
        <StatCard label="Établissements" value={String(etabs.length)} sub="partenaires actifs" color="#f59e0b" icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>} />
      </div>

      {/* Objectif mensuel */}
      <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 12, padding: '18px 20px', marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <div>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>Progression objectif mensuel</span>
            <span style={{ fontSize: 13, color: '#9ca3af', marginLeft: 10 }}>{heuresMois.toFixed(1)}h / {objectif}h</span>
          </div>
          <span style={{ fontSize: 16, fontWeight: 800, color: pct >= 100 ? '#10b981' : '#e879f9' }}>{pct.toFixed(0)}%</span>
        </div>
        <div style={{ height: 10, background: '#f3f4f6', borderRadius: 100, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${pct}%`, background: pct >= 100 ? 'linear-gradient(90deg,#10b981,#059669)' : 'linear-gradient(90deg,#e879f9,#c026d3)', borderRadius: 100, transition: 'width .5s' }} />
        </div>
        {pct >= 100 && <p style={{ fontSize: 12, color: '#10b981', marginTop: 6, fontWeight: 600 }}>🎉 Objectif atteint ce mois !</p>}
        {pct < 100 && <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 6 }}>Il vous reste {(objectif - heuresMois).toFixed(1)}h pour atteindre votre objectif</p>}
      </div>

      {/* 2 colonnes */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        {/* Prochaines missions */}
        <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 12, padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>Prochaines missions</h3>
            <Link href="/dashboard/missions" style={{ fontSize: 12, color: '#e879f9', textDecoration: 'none', fontWeight: 600 }}>Voir tout →</Link>
          </div>
          {avenir.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '28px 0', color: '#9ca3af' }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>📋</div>
              <p style={{ fontSize: 13, marginBottom: 10 }}>Aucune mission à venir</p>
              <Link href="/dashboard/missions" style={{ fontSize: 12, color: '#e879f9', textDecoration: 'none', fontWeight: 600 }}>+ Ajouter une mission</Link>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {avenir.slice(0, 5).map(m => {
                const etab = getEtab(m.etablissement_id)
                return (
                  <div key={m.id} style={{ padding: 12, borderRadius: 9, background: '#f9fafb', border: '1px solid #f3f4f6' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>{m.titre}</span>
                      <div style={{ display: 'flex', gap: 4 }}>
                        {m.contrat_signe && <span title="Contrat signé" style={{ fontSize: 14 }}>✅</span>}
                        {!m.contrat_signe && <span title="Contrat non signé" style={{ fontSize: 14 }}>⚠️</span>}
                      </div>
                    </div>
                    {etab && <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 2 }}>🏥 {etab.nom}</div>}
                    <div style={{ fontSize: 11, color: '#e879f9', fontWeight: 600 }}>📅 {fmtDate(m.date_debut)} · {m.heures}h · {fmtEur(m.salaire_estime)}</div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Suivi administratif */}
        <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 12, padding: 20 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: '#111827', marginBottom: 16 }}>Suivi administratif</h3>
          {[
            { label: 'Contrats signés', val: missions.filter(m => m.contrat_signe).length, total: missions.length, color: '#e879f9' },
            { label: 'Fiches de paie reçues', val: missions.filter(m => m.fiche_paie_recue).length, total: passees.length, color: '#8b5cf6' },
            { label: 'Salaires reçus', val: missions.filter(m => m.salaire_recu).length, total: passees.length, color: '#10b981' },
          ].map((item, i) => (
            <div key={i} style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 13, color: '#4b5563' }}>{item.label}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>{item.val}/{item.total}</span>
              </div>
              <div style={{ height: 6, background: '#f3f4f6', borderRadius: 100, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: item.total > 0 ? `${(item.val / item.total) * 100}%` : '0%', background: item.color, borderRadius: 100 }} />
              </div>
            </div>
          ))}
          <div style={{ marginTop: 20, padding: 14, borderRadius: 10, background: 'rgba(232,121,249,.08)', border: '1px solid rgba(232,121,249,.15)' }}>
            <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 4 }}>Total revenus estimés (tous mois)</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: '#e879f9' }}>{fmtEur(missions.reduce((a, m) => a + (m.salaire_estime || 0), 0))}</div>
          </div>
        </div>
      </div>

      {/* Raccourcis rapides */}
      <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 12, padding: 20 }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: '#111827', marginBottom: 14 }}>Actions rapides</h3>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {[
            { href: '/dashboard/missions', label: '+ Nouvelle mission', color: '#e879f9' },
            { href: '/dashboard/etablissements', label: '+ Nouvel établissement', color: '#8b5cf6' },
            { href: '/dashboard/import-gcal', label: '📅 Importer Google Agenda', color: '#06b6d4' },
            { href: '/dashboard/analyses', label: '📊 Voir les analyses', color: '#f59e0b' },
          ].map((a, i) => (
            <Link key={i} href={a.href} style={{ padding: '9px 16px', borderRadius: 9, border: `1px solid ${a.color}30`, background: `${a.color}0d`, color: a.color, textDecoration: 'none', fontSize: 13, fontWeight: 600 }}>
              {a.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
