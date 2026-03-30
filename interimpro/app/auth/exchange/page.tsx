'use client'
import { useEffect, Suspense } from 'react'

function Redirector() {
  useEffect(() => {
    // Rediriger vers la route serveur qui gère l'échange PKCE
    const params = window.location.search
    window.location.replace('/auth/callback' + params)
  }, [])

  return (
    <div style={{ minHeight:'100vh', background:'#0f172a', display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:16 }}>
      <div style={{ width:40, height:40, borderRadius:'50%', border:'3px solid rgba(232,121,249,.2)', borderTop:'3px solid #e879f9', animation:'spin .8s linear infinite' }}/>
      <p style={{ fontSize:14, color:'#64748b', fontFamily:'system-ui,sans-serif' }}>Connexion en cours...</p>
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
      <Redirector />
    </Suspense>
  )
}
