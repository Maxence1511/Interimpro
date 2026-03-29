'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function ExchangePage() {
  const router = useRouter()
  const [status, setStatus] = useState('Connexion en cours...')

  useEffect(() => {
    const supabase = createClient()
    const code = new URLSearchParams(window.location.search).get('code')

    if (!code) {
      router.push('/auth/login?error=no_code')
      return
    }

    supabase.auth.exchangeCodeForSession(code).then(({ data, error }) => {
      if (error) {
        console.error('Exchange error:', error)
        setStatus('Erreur de connexion...')
        setTimeout(() => router.push('/auth/login?error=auth_error'), 1500)
      } else {
        setStatus('Connecté ! Redirection...')
        router.push('/dashboard')
        router.refresh()
      }
    })
  }, [])

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #fdf2f8 0%, #fce7f3 30%, #f5d0fe 60%, #ede9fe 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'column',
      gap: '16px',
    }}>
      <div style={{
        width: '48px', height: '48px', borderRadius: '50%',
        border: '3px solid rgba(232,123,249,0.3)',
        borderTop: '3px solid #e87bf9',
        animation: 'spin 0.8s linear infinite',
      }} />
      <p style={{ color: '#7c3aed', fontSize: '16px', fontWeight: 500 }}>{status}</p>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
