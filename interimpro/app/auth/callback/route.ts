import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')

  if (error) {
    return NextResponse.redirect(`${origin}/auth/login?error=${error}`)
  }

  if (code) {
    return NextResponse.redirect(`${origin}/auth/exchange?code=${code}`)
  }

  return NextResponse.redirect(`${origin}/auth/login?error=no_code`)
}
