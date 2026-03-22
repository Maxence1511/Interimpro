import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { calculerHeures, calculerTauxMajoration, calculerSalaire } from '@/lib/utils'
import { ImportPreview } from '@/lib/types'

export async function POST(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { previews }: { previews: ImportPreview[] } = await request.json()
  const selected = previews.filter(p => p.selected)

  let imported = 0
  let errors = 0
  const errorDetails: string[] = []

  for (const preview of selected) {
    try {
      // Vérifier si déjà importé (anti-doublon)
      const { data: existing } = await supabase
        .from('missions')
        .select('id')
        .eq('google_calendar_event_id', preview.event.id)
        .eq('user_id', user.id)
        .single()

      if (existing) continue // Déjà importé, on skip

      let etablissementId = preview.matched_etablissement?.id

      // Créer l'établissement si nécessaire
      if (!etablissementId && preview.create_new_etablissement) {
        const { data: newEtab, error: etabErr } = await supabase
          .from('etablissements')
          .insert({
            user_id: user.id,
            nom: preview.extracted_etablissement_nom || 'Établissement importé',
            taux_horaire: 14.00,
            type: 'Autre',
          })
          .select()
          .single()

        if (etabErr) throw etabErr
        etablissementId = newEtab.id
      }

      if (!etablissementId) continue

      // Calculer les heures
      const dateDebut = preview.event.start.dateTime || ''
      const dateFin = preview.event.end.dateTime || ''
      const heures = dateDebut && dateFin ? calculerHeures(dateDebut, dateFin, 0.5) : 0

      // Récupérer le taux horaire de l'établissement
      const { data: etab } = await supabase
        .from('etablissements')
        .select('taux_horaire')
        .eq('id', etablissementId)
        .single()

      const tauxHoraire = etab?.taux_horaire || 14
      const salaire = calculerSalaire(heures, tauxHoraire, 0)

      // Déterminer le statut
      const statut = dateFin && new Date(dateFin) < new Date() ? 'passee' : 'a_venir'

      // Créer la mission
      const { error: missionErr } = await supabase
        .from('missions')
        .insert({
          user_id: user.id,
          etablissement_id: etablissementId,
          titre: preview.extracted_titre,
          date_debut: dateDebut,
          date_fin: dateFin,
          heures,
          pause_heures: 0.5,
          statut,
          salaire_estime: salaire,
          notes: preview.event.description || '',
          source: 'google_calendar',
          google_calendar_event_id: preview.event.id,
          google_calendar_synced_at: new Date().toISOString(),
        })

      if (missionErr) throw missionErr
      imported++
    } catch (err: any) {
      errors++
      errorDetails.push(err.message)
    }
  }

  // Mettre à jour le statut de sync
  await supabase
    .from('google_calendar_sync')
    .upsert({
      user_id: user.id,
      last_sync_at: new Date().toISOString(),
      events_processed: imported,
    }, { onConflict: 'user_id' })

  return NextResponse.json({ imported, errors, errorDetails })
}
