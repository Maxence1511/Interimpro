'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
export default function ExchangePage() {
  const [status, setStatus] = useState('Connexion en cours...')
  useEffect(() => {
    const run = async () => {
      const code = new URLSearchParams(window.location.search).get('code')
      if (!code) { window.location.href = '/?error=no_code'; return }
      const supabase = createClient()
      const { data, error } = await supabase.auth.exchangeCodeForSession(code)
      if (error || !data.session) { window.location.href = '/?error=auth_error'; return }
      setStatus('Connecté !')
      setTimeout(() => window.location.replace('/dashboard'), 200)
    }
    run()
  }, [])
  return (
    <div style={{ minHeight: '100vh', background: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
      <div style={{ width: 44, height: 44, borderRadius: '50%', border: '3px solid rgba(232,121,249,.15)', borderTop: '3px solid #e879f9', animation: 'spin .8s linear infinite' }} />
      <p style={{ color: '#94a3b8', fontSize: 14 }}>{status}</p>
      <style>{\`@keyframes spin{to{transform:rotate(360deg)}}\`}</style>
    </div>
  )
}
