'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Suspense } from 'react'

// Composant interne qui utilise useSearchParams via window.location directement
// pour éviter le problème Suspense boundary de Next.js 14
function ExchangeInner() {
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const handle = async () => {
      const params = new URLSearchParams(window.location.search)
      const code = params.get('code')
      const next = params.get('next') || '/dashboard'
      if (code) {
        await supabase.auth.exchangeCodeForSession(code)
      }
      router.push(next)
    }
    handle()
  }, [])

  return (
    <div style={{ minHeight:'100vh', background:'#0f172a', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ textAlign:'center' }}>
        <div style={{ width:40, height:40, borderRadius:'50%', border:'3px solid rgba(232,121,249,.2)', borderTop:'3px solid #e879f9', animation:'spin .8s linear infinite', margin:'0 auto 16px' }}/>
        <p style={{ fontSize:14, color:'#64748b' }}>Connexion en cours...</p>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    </div>
  )
}

export default function AuthExchange() {
  return (
    <Suspense fallback={
      <div style={{ minHeight:'100vh', background:'#0f172a', display:'flex', alignItems:'center', justifyContent:'center' }}>
        <div style={{ width:40, height:40, borderRadius:'50%', border:'3px solid rgba(232,121,249,.2)', borderTop:'3px solid #e879f9', animation:'spin .8s linear infinite' }}/>
      </div>
    }>
      <ExchangeInner />
    </Suspense>
  )
}
