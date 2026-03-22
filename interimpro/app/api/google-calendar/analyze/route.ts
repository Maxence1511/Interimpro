import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { getAllEvents, analyzeEvents } from '@/lib/google-calendar'

export async function POST(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { calendar_id, time_min } = await request.json()

  // Récupérer le token Google depuis Supabase
  const { data: { session } } = await supabase.auth.getSession()
  const accessToken = session?.provider_token

  if (!accessToken) {
    return NextResponse.json({ error: 'Token Google manquant. Reconnectez-vous via Google.' }, { status: 401 })
  }

  try {
    // Récupérer tous les événements
    const events = await getAllEvents(accessToken, calendar_id, time_min)

    // Récupérer les établissements existants
    const { data: etablissements } = await supabase
      .from('etablissements')
      .select('*')
      .eq('user_id', user.id)
      .eq('archived', false)

    // Analyser et matcher
    const previews = analyzeEvents(events, etablissements || [])

    return NextResponse.json({ previews, total: events.length })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
