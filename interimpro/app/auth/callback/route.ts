import{NextResponse,type NextRequest}from 'next/server'
export async function GET(req:NextRequest){
  const{origin,searchParams}=new URL(req.url)
  const error=searchParams.get('error')
  if(error) return NextResponse.redirect(`${origin}/?error=${error}`)
  return NextResponse.redirect(`${origin}/dashboard`)
}
