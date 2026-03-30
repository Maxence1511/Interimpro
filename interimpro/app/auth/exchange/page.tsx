'use client'
import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function AuthExchange() {
  const router = useRouter()
  const params = useSearchParams()
  const supabase = createClient()

  useEffect(() => {
    const handle = async () => {
      const code = new URLSearchParams(window.location.search).get('code')
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
      <div style={{ textAlign:'center', color:'#f1f5f9' }}>
        <div style={{ width:40, height:40, borderRadius:'50%', border:'3px solid rgba(232,121,249,.2)', borderTop:'3px solid #e879f9', animation:'spin .8s linear infinite', margin:'0 auto 16px' }}/>
        <p style={{ fontSize:14, color:'#64748b' }}>Connexion en cours...</p>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    </div>
  )
}
