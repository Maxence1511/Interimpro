export type TypeEtablissement = 'EHPAD' | 'Clinique' | 'Hôpital' | 'Laboratoire' | 'Rééducation' | 'Psychiatrie' | 'Maison de Santé' | 'Autre'
export type StatutMission = 'a_venir' | 'passee' | 'archive'
export type SourceMission = 'manual' | 'google_calendar'

export interface Creneau {
  label: string
  heure_debut: string
  heure_fin: string
  pause_minutes: number
}

export interface Etablissement {
  id: string
  user_id: string
  nom: string
  groupe?: string
  type?: TypeEtablissement
  type_personnalise?: string
  taux_horaire: number
  telephone?: string
  email?: string
  notes?: string
  creneaux: Creneau[]
  archived: boolean
  date_archive?: string
  created_at: string
  updated_at: string
}

export interface Mission {
  id: string
  user_id: string
  etablissement_id?: string
  etablissement?: Etablissement
  titre: string
  date_debut?: string
  date_fin?: string
  pause_heures: number
  heures?: number
  statut: StatutMission
  contrat_signe: boolean
  fiche_paie_recue: boolean
  salaire_recu: boolean
  date_contrat_signe?: string
  date_fiche_paie_recue?: string
  date_salaire_recu?: string
  majoration_nuit: boolean
  majoration_dimanche: boolean
  majoration_ferie: boolean
  taux_majoration: number
  salaire_estime?: number
  notes?: string
  date_archive?: string
  source: SourceMission
  google_calendar_event_id?: string
  google_calendar_synced_at?: string
  created_at: string
  updated_at: string
}

export interface UserProfile {
  id: string
  first_name?: string
  last_name?: string
  telephone?: string
  specialite?: string
  numero_rpps?: string
  photo_url?: string
}

export interface UserPreferences {
  id: string
  objectif_heures_mensuel: number
  couleur_theme: string
  mode_sombre: boolean
  langue: string
}

export interface GoogleCalendarSync {
  id: string
  user_id: string
  calendar_id?: string
  calendar_name?: string
  google_account_email?: string
  google_access_token?: string
  google_refresh_token?: string
  last_sync_at?: string
  auto_sync_enabled: boolean
  events_processed: number
  sync_from_date?: string
  sync_history: SyncHistoryEntry[]
}

export interface SyncHistoryEntry {
  date: string
  imported: number
  errors: number
  pending: number
}

export interface GoogleCalendarEvent {
  id: string
  summary: string
  description?: string
  location?: string
  start: { dateTime?: string; date?: string; timeZone?: string }
  end: { dateTime?: string; date?: string; timeZone?: string }
}

export interface ImportPreview {
  event: GoogleCalendarEvent
  matched_etablissement?: Etablissement
  match_score: number
  extracted_titre: string
  extracted_etablissement_nom: string
  selected: boolean
  create_new_etablissement: boolean
}

export const COULEURS_THEME: Record<string, string> = {
  teal: '#06b6d4',
  cyan: '#22d3ee',
  blue: '#3b82f6',
  indigo: '#6366f1',
  violet: '#8b5cf6',
  purple: '#a855f7',
  fuchsia: '#d946ef',
  pink: '#ec4899',
  rose: '#f43f5e',
  red: '#ef4444',
  orange: '#f97316',
  amber: '#f59e0b',
  yellow: '#eab308',
  lime: '#84cc16',
  green: '#22c55e',
  emerald: '#10b981',
}

export const COULEURS_TYPE: Record<TypeEtablissement, string> = {
  'EHPAD': '#f97316',
  'Clinique': '#3b82f6',
  'Hôpital': '#ef4444',
  'Laboratoire': '#06b6d4',
  'Rééducation': '#22c55e',
  'Psychiatrie': '#8b5cf6',
  'Maison de Santé': '#ec4899',
  'Autre': '#6b7280',
}

export const JOURS_FERIES_FR = (year: number): string[] => {
  const easterDate = getEasterDate(year)
  const easter = new Date(easterDate)
  const addDays = (d: Date, n: number) => {
    const r = new Date(d); r.setDate(r.getDate() + n); return r
  }
  const fmt = (d: Date) => d.toISOString().split('T')[0]
  return [
    `${year}-01-01`, `${year}-05-01`, `${year}-05-08`,
    `${year}-07-14`, `${year}-08-15`, `${year}-11-01`,
    `${year}-11-11`, `${year}-12-25`,
    fmt(addDays(easter, 1)),
    fmt(addDays(easter, 39)),
    fmt(addDays(easter, 49)),
    fmt(addDays(easter, 50)),
  ]
}

function getEasterDate(year: number): string {
  const a = year % 19, b = Math.floor(year / 100), c = year % 100
  const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const month = Math.floor((h + l - 7 * m + 114) / 31)
  const day = ((h + l - 7 * m + 114) % 31) + 1
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}
