import { NextResponse, type NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const { origin, searchParams } = new URL(request.url)
  // Avec implicit flow, on redirige vers /dashboard
  // Supabase JS va détecter le hash #access_token automatiquement
  const error = searchParams.get('error')
  if (error) {
    return NextResponse.redirect(`${origin}/?error=${error}`)
  }
  // Rediriger vers dashboard - Supabase JS récupère le token depuis l'URL
  return NextResponse.redirect(`${origin}/dashboard`)
}
