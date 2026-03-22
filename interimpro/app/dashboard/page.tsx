'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Mission, Etablissement, UserPreferences } from '@/lib/types'
import { formatEuros, formatHeures, formatDate, getRevenusParMois, getHeuresParMois, getAlertes, isMissionTerminee, shouldAutoArchive } from '@/lib/utils'
import { TrendingUp, TrendingDown, ChevronLeft, ChevronRight, Calendar, Clock, Euro } from 'lucide-react'
import toast from 'react-hot-toast'
import { useRouter } from 'next/navigation'

export default function DashboardPage() {
  const supabase = createClient()
  const router = useRouter()
  const [missions, setMissions] = useState<Mission[]>([])
  const [etablissements, setEtablissements] = useState<Etablissement[]>([])
  const [prefs, setPrefs] = useState<UserPreferences | null>(null)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [visibleProchaines, setVisibleProchaines] = useState(5)
  const [visiblePassees, setVisiblePassees] = useState(5)

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const [{ data: m }, { data: e }, { data: p }] = await Promise.all([
      supabase.from('missions').select('*, etablissement:etablissements(*)').eq('user_id', user.id),
      supabase.from('etablissements').select('*').eq('user_id', user.id).eq('archived', false),
      supabase.from('user_preferences').select('*').eq('id', user.id).single(),
    ])

    let updatedMissions = m || []

    // Auto-passage en passée
    for (const mission of updatedMissions) {
      if (mission.statut === 'a_venir' && isMissionTerminee(mission)) {
        await supabase.from('missions').update({ statut: 'passee' }).eq('id', mission.id)
        mission.statut = 'passee'
      }
      if (shouldAutoArchive(mission)) {
        await supabase.from('missions').update({ statut: 'archive', date_archive: new Date().toISOString() }).eq('id', mission.id)
        mission.statut = 'archive'
      }
    }

    setMissions(updatedMissions)
    setEtablissements(e || [])
    setPrefs(p)
  }

  async function togglePointage(mission: Mission, field: 'contrat_signe' | 'fiche_paie_recue' | 'salaire_recu') {
    const newVal = !mission[field]
    const dateField = field === 'contrat_signe' ? 'date_contrat_signe' : field === 'fiche_paie_recue' ? 'date_fiche_paie_recue' : 'date_salaire_recu'
    const updates: any = { [field]: newVal, [dateField]: newVal ? new Date().toISOString() : null }

    const updated = { ...mission, [field]: newVal }
    if (shouldAutoArchive(updated)) {
      updates.statut = 'archive'
      updates.date_archive = new Date().toISOString()
      toast.success('Mission archivée automatiquement ✓')
    }

    await supabase.from('missions').update(updates).eq('id', mission.id)
    setMissions(prev => prev.map(m => m.id === mission.id ? { ...m, ...updates } : m))
  }

  const revenusMois = getRevenusParMois(missions, year, month)
  const heuresMois = getHeuresParMois(missions, year, month)
  const prevMonth = month === 0 ? 11 : month - 1
  const prevYear = month === 0 ? year - 1 : year
  const revenusPrev = getRevenusParMois(missions, prevYear, prevMonth)
  const heuresPrev = getHeuresParMois(missions, prevYear, prevMonth)
  const diffRevenus = revenusMois - revenusPrev
  const diffHeures = heuresMois - heuresPrev

  const objectif = prefs?.objectif_heures_mensuel || 151.67
  const progressPct = Math.min(100, Math.round((heuresMois / objectif) * 100))

  const prochaines = missions.filter(m => m.statut === 'a_venir').sort((a, b) => new Date(a.date_debut!).getTime() - new Date(b.date_debut!).getTime())
  const passees = missions.filter(m => m.statut === 'passee').sort((a, b) => new Date(b.date_fin!).getTime() - new Date(a.date_fin!).getTime())

  const moisNom = currentDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })

  const navMois = (dir: number) => {
    setCurrentDate(prev => { const d = new Date(prev); d.setMonth(d.getMonth() + dir); return d })
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>Tableau de bord</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Vue d'ensemble de vos missions et statistiques</p>
      </div>

      {/* Navigation mois */}
      <div className="flex items-center gap-3">
        <button onClick={() => navMois(-1)} className="p-1.5 rounded-lg hover:opacity-70 transition-opacity" style={{ border: '1px solid var(--border)' }}>
          <ChevronLeft size={16} />
        </button>
        <span className="text-sm font-medium capitalize" style={{ color: 'var(--text-primary)' }}>{moisNom}</span>
        <button onClick={() => navMois(1)} className="p-1.5 rounded-lg hover:opacity-70 transition-opacity" style={{ border: '1px solid var(--border)' }}>
          <ChevronRight size={16} />
        </button>
        <button onClick={() => setCurrentDate(new Date())} className="text-xs px-3 py-1.5 rounded-lg transition-opacity hover:opacity-70" style={{ background: 'var(--accent)', color: 'white' }}>
          Aujourd'hui
        </button>
      </div>

      {/* Métriques */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Revenus */}
        <div className="card rounded-xl p-5 border" style={{ borderLeft: '3px solid #10b981' }}>
          <div className="flex justify-between items-start mb-3">
            <span className="text-xs font-medium uppercase tracking-wide" style={{ color: '#10b981' }}>Revenus</span>
            <Euro size={16} style={{ color: '#10b981' }} />
          </div>
          <div className="text-3xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>{formatEuros(revenusMois)}</div>
          <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>Ce mois-ci</div>
          {revenusPrev !== 0 && (
            <div className={`flex items-center gap-1 mt-2 text-xs font-medium ${diffRevenus >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {diffRevenus >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
              {diffRevenus >= 0 ? '+' : ''}{formatEuros(diffRevenus)} vs mois précédent
            </div>
          )}
        </div>

        {/* Heures */}
        <div className="card rounded-xl p-5 border" style={{ borderLeft: '3px solid #6366f1' }}>
          <div className="flex justify-between items-start mb-3">
            <span className="text-xs font-medium uppercase tracking-wide" style={{ color: '#6366f1' }}>Heures</span>
            <Clock size={16} style={{ color: '#6366f1' }} />
          </div>
          <div className="text-3xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>{formatHeures(heuresMois)}</div>
          <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>Ce mois-ci</div>
          {heuresPrev !== 0 && (
            <div className={`flex items-center gap-1 mt-2 text-xs font-medium ${diffHeures >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {diffHeures >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
              {diffHeures >= 0 ? '+' : ''}{formatHeures(Math.abs(diffHeures))} vs mois précédent
            </div>
          )}
        </div>

        {/* Objectif */}
        <div className="card rounded-xl p-5 border" style={{ borderLeft: '3px solid #8b5cf6' }}>
          <div className="flex justify-between items-start mb-3">
            <span className="text-xs font-medium uppercase tracking-wide" style={{ color: '#8b5cf6' }}>Objectif</span>
            <Calendar size={16} style={{ color: '#8b5cf6' }} />
          </div>
          <div className="text-3xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>{progressPct}%</div>
          <div className="text-xs mb-2" style={{ color: 'var(--text-secondary)' }}>{formatHeures(heuresMois)} / {formatHeures(objectif)}</div>
          <div className="h-2 rounded-full" style={{ background: 'var(--border)' }}>
            <div className="h-2 rounded-full transition-all" style={{ width: `${progressPct}%`, background: '#8b5cf6' }} />
          </div>
        </div>
      </div>

      {/* Sections missions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Prochaines missions */}
        <div className="card rounded-xl border p-5" style={{ minHeight: 320 }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-medium" style={{ color: 'var(--text-primary)' }}>Prochaines missions</h2>
            <button onClick={() => router.push('/dashboard/missions?tab=a_venir')} className="text-xs hover:underline" style={{ color: 'var(--accent)' }}>Voir toutes →</button>
          </div>
          {prochaines.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-center">
              <div className="text-3xl mb-2">📅</div>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Aucune mission à venir</p>
            </div>
          ) : (
            <div className="space-y-2">
              {prochaines.slice(0, visibleProchaines).map(m => (
                <MissionCard key={m.id} mission={m} etablissements={etablissements} onToggle={togglePointage} />
              ))}
              {prochaines.length > visibleProchaines && (
                <button onClick={() => setVisibleProchaines(v => v + 5)} className="w-full text-xs py-2 rounded-lg hover:opacity-70 transition-opacity" style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
                  Voir 5 de plus ({prochaines.length - visibleProchaines} restantes)
                </button>
              )}
            </div>
          )}
        </div>

        {/* Dernières missions */}
        <div className="card rounded-xl border p-5" style={{ minHeight: 320 }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-medium" style={{ color: 'var(--text-primary)' }}>Dernières missions réalisées</h2>
            <button onClick={() => router.push('/dashboard/missions?tab=passee')} className="text-xs hover:underline" style={{ color: 'var(--accent)' }}>Voir toutes →</button>
          </div>
          {passees.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-center">
              <div className="text-3xl mb-2">✅</div>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Aucune mission réalisée</p>
            </div>
          ) : (
            <div className="space-y-2">
              {passees.slice(0, visiblePassees).map(m => (
                <MissionCard key={m.id} mission={m} etablissements={etablissements} onToggle={togglePointage} showPointage />
              ))}
              {passees.length > visiblePassees && (
                <button onClick={() => setVisiblePassees(v => v + 5)} className="w-full text-xs py-2 rounded-lg hover:opacity-70 transition-opacity" style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
                  Voir 5 de plus ({passees.length - visiblePassees} restantes)
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function MissionCard({ mission, etablissements, onToggle, showPointage = false }: {
  mission: Mission
  etablissements: Etablissement[]
  onToggle: (m: Mission, f: any) => void
  showPointage?: boolean
}) {
  const etab = etablissements.find(e => e.id === mission.etablissement_id)
  return (
    <div className="flex items-center justify-between p-3 rounded-lg" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)' }}>
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'color-mix(in srgb, var(--accent) 15%, transparent)' }}>
          <Calendar size={14} style={{ color: 'var(--accent)' }} />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{mission.titre}</p>
          <p className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>
            {etab?.nom || 'Établissement'} • {mission.date_debut ? new Date(mission.date_debut).toLocaleDateString('fr-FR') : ''}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {mission.salaire_estime && (
          <span className="text-xs px-2 py-1 rounded-full font-medium" style={{ background: '#10b98120', color: '#10b981' }}>
            {formatEuros(mission.salaire_estime)}
          </span>
        )}
        {showPointage && (
          <div className="flex gap-1">
            {(['contrat_signe', 'fiche_paie_recue', 'salaire_recu'] as const).map((field, i) => {
              const icons = ['📄', '💰', '✅']
              const labels = ['Contrat', 'Fiche paie', 'Salaire']
              return (
                <button key={field} onClick={() => onToggle(mission, field)} title={labels[i]}
                  className={`w-6 h-6 rounded text-xs transition-opacity hover:opacity-70 ${mission[field] ? 'opacity-100' : 'opacity-30'}`}>
                  {icons[i]}
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
