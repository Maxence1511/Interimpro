'use client'
import { useEffect, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabase } from '@/lib/supabase/client'

function SessionHandler() {
  const router = useRouter()

  useEffect(() => {
    const sb = getSupabase()
    
    // Supabase JS détecte automatiquement le token dans le hash ou les params
    // et établit la session
    const { data: { subscription } } = sb.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        subscription.unsubscribe()
        router.replace('/dashboard')
      } else if (event === 'SIGNED_OUT') {
        subscription.unsubscribe()
        router.replace('/?error=auth')
      }
    })

    // Vérifier si une session existe déjà (ex: refresh token)
    sb.auth.getSession().then(({ data }) => {
      if (data.session) {
        subscription.unsubscribe()
        router.replace('/dashboard')
      }
    })

    // Timeout de sécurité : si rien après 5s, retour au login
    const timeout = setTimeout(() => {
      subscription.unsubscribe()
      router.replace('/?error=timeout')
    }, 5000)

    return () => {
      subscription.unsubscribe()
      clearTimeout(timeout)
    }
  }, [])

  return (
    <div style={{ minHeight:'100vh', background:'#0f172a', display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:16 }}>
      <div style={{ width:40, height:40, borderRadius:'50%', border:'3px solid rgba(232,121,249,.2)', borderTop:'3px solid #e879f9', animation:'spin .8s linear infinite' }}/>
      <p style={{ fontSize:14, color:'#64748b', fontFamily:'system-ui,sans-serif' }}>Connexion en cours...</p>
      <style>{'@keyframes spin{to{transform:rotate(360deg)}}'}</style>
    </div>
  )
}

export default function SessionPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight:'100vh', background:'#0f172a', display:'flex', alignItems:'center', justifyContent:'center' }}>
        <div style={{ width:36, height:36, borderRadius:'50%', border:'3px solid rgba(232,121,249,.15)', borderTop:'3px solid #e879f9', animation:'spin .8s linear infinite' }}/>
        <style>{'@keyframes spin{to{transform:rotate(360deg)}}'}</style>
      </div>
    }>
      <SessionHandler />
    </Suspense>
  )
}
