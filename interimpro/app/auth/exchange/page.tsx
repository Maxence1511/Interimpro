'use client'
import { useEffect, Suspense } from 'react'

// Cette page n'est plus utilisée — le flux OAuth pointe directement vers /auth/callback
// Mais on la garde au cas où des anciens liens y atterrissent
function Redirector() {
  useEffect(() => {
    window.location.replace('/auth/callback' + window.location.search)
  }, [])
  return (
    <div style={{ minHeight:'100vh', background:'#0f172a', display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:16 }}>
      <div style={{ width:36, height:36, borderRadius:'50%', border:'3px solid rgba(232,121,249,.2)', borderTop:'3px solid #e879f9', animation:'spin .8s linear infinite' }}/>
      <style>{'@keyframes spin{to{transform:rotate(360deg)}}'}</style>
    </div>
  )
}
export default function AuthExchange() {
  return <Suspense fallback={null}><Redirector /></Suspense>
}
