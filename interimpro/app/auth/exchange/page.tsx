'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function ExchangePage() {
  const [status, setStatus] = useState('Connexion en cours...')

  useEffect(() => {
    const supabase = createClient()

    // createBrowserClient détecte ?code= automatiquement et fait l'échange
    // On attend juste l'événement SIGNED_IN sans appeler exchangeCodeForSession
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        setStatus('Connecté !')
        window.location.replace('/dashboard')
      }
    })

    // Timeout de sécurité si rien ne se passe
    const timeout = setTimeout(() => {
      window.location.href = '/?error=timeout'
    }, 8000)

    return () => {
      subscription.unsubscribe()
      clearTimeout(timeout)
    }
  }, [])

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #fdf2f8, #fce7f3, #ede9fe)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '16px' }}>
      <div style={{ width: '44px', height: '44px', borderRadius: '50%', border: '3px solid rgba(232,123,249,0.25)', borderTop: '3px solid #e87bf9', animation: 'spin 0.8s linear infinite' }} />
      <p style={{ color: '#7c3aed', fontSize: '15px', fontWeight: 500 }}>{status}</p>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
