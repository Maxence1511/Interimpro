import { NextResponse, type NextRequest } from 'next/server'

// Cette route n'est plus utilisée pour l'échange PKCE
// Le client Supabase JS gère automatiquement le token depuis le hash
// On redirige simplement vers /dashboard
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  
  // Si erreur OAuth
  const error = searchParams.get('error')
  if (error) {
    return NextResponse.redirect(`${origin}/?error=auth`)
  }
  
  // Rediriger vers la page qui va traiter le hash/token côté client
  return NextResponse.redirect(`${origin}/auth/session`)
}
