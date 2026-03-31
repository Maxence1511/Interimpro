'use client'
import { useEffect } from 'react'
// Cette page redirige vers /dashboard - Supabase détecte le token dans l'URL
export default function AuthExchange() {
  useEffect(() => {
    window.location.replace('/dashboard' + window.location.hash)
  }, [])
  return (
    <div style={{ minHeight:'100vh', background:'#0f172a', display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:14 }}>
      <div style={{ width:38, height:38, borderRadius:'50%', border:'3px solid rgba(232,121,249,.2)', borderTop:'3px solid #e879f9', animation:'spin .8s linear infinite' }}/>
      <p style={{ color:'#64748b', fontSize:13, fontFamily:'system-ui' }}>Connexion...</p>
      <style>{'@keyframes spin{to{transform:rotate(360deg)}}'}</style>
    </div>
  )
}
