import { Mission, Etablissement } from './types'

export function calculerHeures(dateDebut: string, dateFin: string, pauseHeures: number): number {
  const debut = new Date(dateDebut)
  const fin = new Date(dateFin)
  const diffMs = fin.getTime() - debut.getTime()
  const diffHeures = diffMs / (1000 * 60 * 60)
  return Math.max(0, diffHeures - pauseHeures)
}

export function calculerTauxMajoration(nuit: boolean, dimanche: boolean, ferie: boolean): number {
  let taux = 0
  if (nuit) taux += 25
  if (dimanche) taux += 50
  if (ferie) taux += 100
  return taux
}

export function calculerSalaire(heures: number, tauxHoraire: number, tauxMajoration: number): number {
  return heures * tauxHoraire * (1 + tauxMajoration / 100)
}

export function getMissionsParMois(missions: Mission[], year: number, month: number): Mission[] {
  return missions.filter(m => {
    if (!m.date_debut) return false
    const d = new Date(m.date_debut)
    return d.getFullYear() === year && d.getMonth() === month
  })
}

export function getRevenusParMois(missions: Mission[], year: number, month: number): number {
  return getMissionsParMois(missions, year, month)
    .filter(m => m.statut !== 'archive' || m.salaire_estime)
    .reduce((sum, m) => sum + (m.salaire_estime || 0), 0)
}

export function getHeuresParMois(missions: Mission[], year: number, month: number): number {
  return getMissionsParMois(missions, year, month)
    .reduce((sum, m) => sum + (m.heures || 0), 0)
}

export function formatEuros(montant: number): string {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(montant)
}

export function formatHeures(heures: number): string {
  const h = Math.floor(heures)
  const m = Math.round((heures - h) * 60)
  return m > 0 ? `${h}h${String(m).padStart(2, '0')}` : `${h}h`
}

export function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit', month: 'short', year: 'numeric'
  }).format(new Date(dateStr))
}

export function formatDateTime(dateStr: string): string {
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  }).format(new Date(dateStr))
}

export function isMissionTerminee(mission: Mission): boolean {
  if (!mission.date_fin) return false
  return new Date(mission.date_fin) < new Date()
}

export function shouldAutoArchive(mission: Mission): boolean {
  return mission.contrat_signe && mission.fiche_paie_recue && mission.salaire_recu && mission.statut !== 'archive'
}

export function getAlertes(missions: Mission[]) {
  const alertes: Array<{ id: string; type: 'urgent' | 'warning' | 'info'; message: string; mission: Mission }> = []
  const now = new Date()

  missions.filter(m => m.statut !== 'archive').forEach(m => {
    if (m.statut === 'a_venir' && m.date_debut) {
      const debut = new Date(m.date_debut)
      const diffJours = (debut.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)

      if (!m.contrat_signe) {
        if (diffJours <= 2 && diffJours >= 0) {
          alertes.push({ id: `contrat-urgent-${m.id}`, type: 'urgent', message: `⚠️ Contrat non signé — Mission "${m.titre}" dans moins de 48h`, mission: m })
        } else if (diffJours <= 7 && diffJours > 2) {
          alertes.push({ id: `contrat-warning-${m.id}`, type: 'warning', message: `Contrat à signer — Mission "${m.titre}" dans ${Math.round(diffJours)} jours`, mission: m })
        }
      }
    }

    if (m.statut === 'passee' && m.date_fin) {
      const finMission = new Date(m.date_fin)
      const moisSuivant = new Date(finMission.getFullYear(), finMission.getMonth() + 1, 6)

      if (!m.fiche_paie_recue && now > moisSuivant) {
        alertes.push({ id: `fiche-${m.id}`, type: 'warning', message: `Fiche de paie en attente — Mission "${m.titre}" du ${formatDate(m.date_fin)}`, mission: m })
      }

      if (m.fiche_paie_recue && !m.salaire_recu) {
        alertes.push({ id: `salaire-${m.id}`, type: 'info', message: `Salaire non confirmé — Mission "${m.titre}"`, mission: m })
      }
    }
  })

  return alertes
}
