import { GoogleCalendarEvent, Etablissement, ImportPreview } from './types'

const GOOGLE_CALENDAR_API = 'https://www.googleapis.com/calendar/v3'

export async function listCalendars(accessToken: string) {
  const res = await fetch(`${GOOGLE_CALENDAR_API}/users/me/calendarList`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  })
  if (!res.ok) throw new Error('Erreur récupération calendriers')
  const data = await res.json()
  return data.items as Array<{ id: string; summary: string; primary?: boolean }>
}

export async function listEvents(
  accessToken: string,
  calendarId: string,
  timeMin?: string,
  pageToken?: string
): Promise<{ events: GoogleCalendarEvent[]; nextPageToken?: string }> {
  const params = new URLSearchParams({
    maxResults: '2500',
    singleEvents: 'true',
    orderBy: 'startTime',
    ...(timeMin && { timeMin }),
    ...(pageToken && { pageToken })
  })

  const res = await fetch(
    `${GOOGLE_CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events?${params}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )
  if (!res.ok) throw new Error('Erreur récupération événements')
  const data = await res.json()
  return { events: data.items || [], nextPageToken: data.nextPageToken }
}

export async function getAllEvents(
  accessToken: string,
  calendarId: string,
  timeMin?: string
): Promise<GoogleCalendarEvent[]> {
  const allEvents: GoogleCalendarEvent[] = []
  let pageToken: string | undefined

  do {
    const { events, nextPageToken } = await listEvents(accessToken, calendarId, timeMin, pageToken)
    allEvents.push(...events)
    pageToken = nextPageToken
  } while (pageToken)

  return allEvents
}

export async function createEvent(
  accessToken: string,
  calendarId: string,
  event: Partial<GoogleCalendarEvent>
): Promise<GoogleCalendarEvent> {
  const res = await fetch(
    `${GOOGLE_CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(event)
    }
  )
  if (!res.ok) throw new Error('Erreur création événement')
  return res.json()
}

// Matching intelligent : extrait le nom de l'établissement depuis un événement Google Calendar
export function extractEtablissementFromEvent(event: GoogleCalendarEvent): string {
  const sources = [
    event.summary || '',
    event.location || '',
    event.description || ''
  ]

  // Patterns communs dans les titres de missions d'infirmière
  const patterns = [
    /(?:mission|vacation|vacation|gardc?e?|remplacement)\s+(?:à|au|chez|pour|dans)?\s*([A-ZÀ-Ÿa-zà-ÿ\s\-']+)/i,
    /([A-ZÀ-Ÿ][A-ZÀ-Ÿa-zà-ÿ\s\-']+(?:EHPAD|Clinique|Hôpital|Centre|Maison|Institut|CHU|CHR|CHRU|Santé)[A-ZÀ-Ÿa-zà-ÿ\s\-']*)/,
    /^([A-ZÀ-Ÿa-zà-ÿ\s\-']+?)(?:\s*[-–|]|\s*\d{1,2}[h:]\d{2})/,
  ]

  for (const src of sources) {
    for (const pattern of patterns) {
      const match = src.match(pattern)
      if (match && match[1] && match[1].trim().length > 3) {
        return match[1].trim()
      }
    }
  }

  // Fallback : prendre le premier mot significatif du titre
  const words = (event.summary || '').split(/\s+/)
  return words.slice(0, 3).join(' ') || 'Établissement inconnu'
}

// Matching avec les établissements existants
export function matchEtablissement(
  nomExtrait: string,
  etablissements: Etablissement[]
): { etablissement?: Etablissement; score: number } {
  if (!nomExtrait || etablissements.length === 0) return { score: 0 }

  const normalize = (s: string) => s.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, '').trim()

  const nomNorm = normalize(nomExtrait)
  let bestMatch: Etablissement | undefined
  let bestScore = 0

  for (const etab of etablissements) {
    const etabNorm = normalize(etab.nom)

    let score = 0

    // Match exact
    if (etabNorm === nomNorm) { score = 100 }
    // L'un contient l'autre
    else if (etabNorm.includes(nomNorm) || nomNorm.includes(etabNorm)) { score = 80 }
    // Mots en commun
    else {
      const wordsNom = nomNorm.split(/\s+/)
      const wordsEtab = etabNorm.split(/\s+/)
      const communs = wordsNom.filter(w => w.length > 2 && wordsEtab.includes(w))
      score = (communs.length / Math.max(wordsNom.length, wordsEtab.length)) * 70
    }

    if (score > bestScore) {
      bestScore = score
      bestMatch = etab
    }
  }

  return bestScore > 40
    ? { etablissement: bestMatch, score: bestScore }
    : { score: 0 }
}

// Analyser les événements pour créer les previews d'import
export function analyzeEvents(
  events: GoogleCalendarEvent[],
  etablissements: Etablissement[]
): ImportPreview[] {
  return events
    .filter(e => e.start?.dateTime) // Exclure les événements journée entière non pertinents
    .map(event => {
      const nomExtrait = extractEtablissementFromEvent(event)
      const { etablissement, score } = matchEtablissement(nomExtrait, etablissements)

      return {
        event,
        matched_etablissement: etablissement,
        match_score: score,
        extracted_titre: event.summary || 'Mission',
        extracted_etablissement_nom: nomExtrait,
        selected: true,
        create_new_etablissement: !etablissement
      }
    })
}

// Construire un événement Google Calendar depuis une mission
export function missionToGCalEvent(
  mission: {
    titre: string
    date_debut: string
    date_fin: string
    heures?: number
    salaire_estime?: number
    notes?: string
    majoration_nuit?: boolean
    majoration_dimanche?: boolean
    majoration_ferie?: boolean
  },
  etablissementNom?: string
): Partial<GoogleCalendarEvent> {
  const majorations = []
  if (mission.majoration_nuit) majorations.push('Nuit +25%')
  if (mission.majoration_dimanche) majorations.push('Dimanche +50%')
  if (mission.majoration_ferie) majorations.push('Férié +100%')

  const description = [
    etablissementNom && `Établissement: ${etablissementNom}`,
    mission.heures && `Heures: ${mission.heures}h`,
    mission.salaire_estime && `Salaire estimé: ${mission.salaire_estime.toFixed(2)}€`,
    majorations.length > 0 && `Majorations: ${majorations.join(', ')}`,
    mission.notes && `Service: ${mission.notes}`,
  ].filter(Boolean).join('\n')

  return {
    summary: etablissementNom ? `${etablissementNom} — ${mission.titre}` : mission.titre,
    description,
    start: { dateTime: mission.date_debut, timeZone: 'Europe/Paris' },
    end: { dateTime: mission.date_fin, timeZone: 'Europe/Paris' }
  }
}
