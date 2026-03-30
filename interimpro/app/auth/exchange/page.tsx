'use client'
import { useEffect, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabase } from '@/lib/supabase/client'

function ExchangeInner() {
  const router = useRouter()

  useEffect(() => {
    const run = async () => {
      const supabase = getSupabase()
      // Lire les params depuis window.location (pas useSearchParams)
      const hash = window.location.hash
      const search = window.location.search
      const params = new URLSearchParams(search || hash.replace('#', '?').replace('#', '&'))
      const code = params.get('code')
      const next = params.get('next') || '/dashboard'

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        if (error) {
          console.error('Exchange error:', error.message)
          router.replace('/?error=' + encodeURIComponent(error.message))
          return
        }
      }
      router.replace(next)
    }
    run()
  }, [])

  return (
    <div style={{ minHeight:'100vh', background:'#0f172a', display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:16 }}>
      <div style={{ width:40, height:40, borderRadius:'50%', border:'3px solid rgba(232,121,249,.2)', borderTop:'3px solid #e879f9', animation:'spin .8s linear infinite' }}/>
      <p style={{ fontSize:14, color:'#64748b' }}>Connexion en cours...</p>
      <style>{'@keyframes spin{to{transform:rotate(360deg)}}'}</style>
    </div>
  )
}

export default function AuthExchange() {
  return (
    <Suspense fallback={
      <div style={{ minHeight:'100vh', background:'#0f172a', display:'flex', alignItems:'center', justifyContent:'center' }}>
        <div style={{ width:36, height:36, borderRadius:'50%', border:'3px solid rgba(232,121,249,.15)', borderTop:'3px solid #e879f9', animation:'spin .8s linear infinite' }}/>
        <style>{'@keyframes spin{to{transform:rotate(360deg)}}'}</style>
      </div>
    }>
      <ExchangeInner />
    </Suspense>
  )
}
