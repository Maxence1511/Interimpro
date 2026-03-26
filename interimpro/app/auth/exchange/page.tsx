'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function ExchangePage() {
  const [status, setStatus] = useState('Connexion en cours...')

  useEffect(() => {
    const supabase = createClient()
    const code = new URLSearchParams(window.location.search).get('code')

    if (!code) {
      window.location.href = '/auth/login?error=no_code'
      return
    }

    supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
      if (error) {
        console.error('Exchange error:', error)
        window.location.href = '/auth/login?error=auth_error'
      } else {
        setStatus('Connecte !')
        // Hard redirect pour que les cookies soient bien lus
        window.location.href = '/dashboard'
      }
    })
  }, [])

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #fdf2f8 0%, #fce7f3 30%, #f5d0fe 60%, #ede9fe 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexDirection: 'column', gap: '16px',
    }}>
      <div style={{
        width: '44px', height: '44px', borderRadius: '50%',
        border: '3px solid rgba(232,123,249,0.25)',
        borderTop: '3px solid #e87bf9',
        animation: 'spin 0.8s linear infinite',
      }} />
      <p style={{ color: '#7c3aed', fontSize: '15px', fontWeight: 500 }}>{status}</p>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
