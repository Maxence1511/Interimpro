'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [isRegister, setIsRegister] = useState(false)
  const [msg, setMsg] = useState({ text: '', ok: true })

  const supabase = createClient()

  const handleGoogle = async () => {
    setLoading(true)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        // On redirige vers /auth/callback qui fait l'échange serveur proprement
        redirectTo: window.location.origin + '/auth/callback',
        scopes: 'https://www.googleapis.com/auth/calendar',
      }
    })
    if (error) {
      setMsg({ text: error.message, ok: false })
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMsg({ text: '', ok: true })
    try {
      if (isRegister) {
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        setMsg({ text: 'Compte créé ! Vérifiez votre email.', ok: true })
        setLoading(false)
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        window.location.href = '/dashboard'
      }
    } catch (err: any) {
      setMsg({ text: err.message || 'Erreur de connexion', ok: false })
      setLoading(false)
    }
  }

  // Lire l'erreur dans l'URL si présente
  const urlError = typeof window !== 'undefined'
    ? new URLSearchParams(window.location.search).get('error')
    : null

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #fdf2f8 0%, #fce7f3 40%, #ede9fe 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
    }}>
      <div style={{ position: 'fixed', top: '-80px', right: '-80px', width: '300px', height: '300px', borderRadius: '50%', background: 'rgba(232,123,249,0.12)', pointerEvents: 'none' }} />
      <div style={{ position: 'fixed', bottom: '-60px', left: '-60px', width: '250px', height: '250px', borderRadius: '50%', background: 'rgba(167,139,250,0.10)', pointerEvents: 'none' }} />

      <div style={{ width: '100%', maxWidth: '400px', position: 'relative', zIndex: 1 }}>
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '18px', background: 'white', boxShadow: '0 4px 20px rgba(232,123,249,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
            <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="#e87bf9" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6V4a2 2 0 0 0-2-2h-1a.2.2 0 1 0 .3.3"/>
              <path d="M8 15v1a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6v-4"/>
              <circle cx="20" cy="10" r="2"/>
            </svg>
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#581c87', marginBottom: '4px' }}>InterimPro</h1>
          <p style={{ fontSize: '13px', color: '#a855f7' }}>Gestion de missions d'intérim médical</p>
        </div>

        <div style={{ background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(20px)', border: '1px solid rgba(232,123,249,0.15)', borderRadius: '20px', padding: '28px', boxShadow: '0 8px 40px rgba(147,51,234,0.08)' }}>
          <h2 style={{ fontSize: '17px', fontWeight: 700, color: '#3b0764', marginBottom: '20px', textAlign: 'center' }}>
            {isRegister ? 'Créer un compte' : 'Connexion'}
          </h2>

          {(urlError || msg.text) && (
            <div style={{ padding: '10px 14px', borderRadius: '9px', background: (urlError || !msg.ok) ? '#fef2f2' : '#f0fdf4', border: `1px solid ${(urlError || !msg.ok) ? '#fca5a5' : '#86efac'}`, fontSize: '13px', color: (urlError || !msg.ok) ? '#dc2626' : '#166534', marginBottom: '16px' }}>
              {urlError === 'auth_error' ? 'Erreur de connexion Google. Réessayez.' : msg.text}
            </div>
          )}

          <button onClick={handleGoogle} disabled={loading} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', padding: '12px', borderRadius: '12px', background: 'white', border: '1.5px solid #e5e7eb', cursor: loading ? 'not-allowed' : 'pointer', marginBottom: '16px', fontSize: '14px', fontWeight: 600, color: '#374151', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', opacity: loading ? 0.7 : 1 }}>
            <svg style={{ width: '18px', height: '18px', flexShrink: 0 }} viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continuer avec Google
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <div style={{ flex: 1, height: '1px', background: '#f0d9fb' }} />
            <span style={{ fontSize: '12px', color: '#c084fc' }}>ou par email</span>
            <div style={{ flex: 1, height: '1px', background: '#f0d9fb' }} />
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#7c3aed', marginBottom: '5px' }}>Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="vous@exemple.com"
                style={{ width: '100%', padding: '10px 13px', borderRadius: '9px', border: '1.5px solid #e9d5f9', background: 'white', color: '#3b0764', fontSize: '14px', outline: 'none', boxSizing: 'border-box' as const }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#7c3aed', marginBottom: '5px' }}>Mot de passe</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="••••••••"
                style={{ width: '100%', padding: '10px 13px', borderRadius: '9px', border: '1.5px solid #e9d5f9', background: 'white', color: '#3b0764', fontSize: '14px', outline: 'none', boxSizing: 'border-box' as const }} />
            </div>
            <button type="submit" disabled={loading} style={{ padding: '11px', borderRadius: '11px', border: 'none', background: 'linear-gradient(135deg, #e87bf9, #a855f7)', color: 'white', fontSize: '14px', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, boxShadow: '0 4px 12px rgba(168,85,247,0.3)', marginTop: '2px' }}>
              {loading ? 'Chargement...' : isRegister ? 'Créer mon compte' : 'Se connecter'}
            </button>
          </form>

          <button onClick={() => { setIsRegister(!isRegister); setMsg({ text: '', ok: true }) }}
            style={{ width: '100%', marginTop: '14px', fontSize: '13px', color: '#9333ea', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500 }}>
            {isRegister ? 'Déjà un compte ? Se connecter' : "Pas encore de compte ? S'inscrire"}
          </button>
        </div>
      </div>
    </div>
  )
}
