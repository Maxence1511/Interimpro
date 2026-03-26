'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [isRegister, setIsRegister] = useState(false)
  const [msg, setMsg] = useState({ text: '', ok: true })

  const handleGoogle = async () => {
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin + '/auth/exchange',
        scopes: 'https://www.googleapis.com/auth/calendar',
      }
    })
    if (error) { setMsg({ text: error.message, ok: false }); setLoading(false) }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMsg({ text: '', ok: true })
    const supabase = createClient()
    try {
      if (isRegister) {
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        setMsg({ text: 'Compte cree ! Verifiez votre email.', ok: true })
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        window.location.href = '/dashboard'
      }
    } catch (err: any) {
      setMsg({ text: err.message || 'Erreur', ok: false })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #fdf2f8 0%, #fce7f3 30%, #f5d0fe 60%, #ede9fe 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: '-60px', right: '-60px', width: '280px', height: '280px', borderRadius: '50%', background: 'rgba(232,123,249,0.15)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: '-80px', left: '-40px', width: '240px', height: '240px', borderRadius: '50%', background: 'rgba(167,139,250,0.12)', pointerEvents: 'none' }} />

      <div style={{ width: '100%', maxWidth: '400px', position: 'relative', zIndex: 1 }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ width: '72px', height: '72px', borderRadius: '20px', background: 'white', boxShadow: '0 4px 24px rgba(232,123,249,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <svg viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="#e87bf9" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6V4a2 2 0 0 0-2-2h-1a.2.2 0 1 0 .3.3"/>
              <path d="M8 15v1a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6v-4"/>
              <circle cx="20" cy="10" r="2"/>
            </svg>
          </div>
          <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#581c87', marginBottom: '6px', letterSpacing: '-0.5px' }}>InterimPro</h1>
          <p style={{ fontSize: '14px', color: '#9333ea', fontWeight: 500 }}>Votre carriere d'infirmier·ere simplifiee</p>
        </div>

        <div style={{ background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(20px)', border: '1px solid rgba(232,123,249,0.2)', borderRadius: '20px', padding: '32px', boxShadow: '0 8px 40px rgba(147,51,234,0.10)' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#3b0764', marginBottom: '4px' }}>{isRegister ? 'Creer un compte' : 'Connexion'}</h2>
          <p style={{ fontSize: '13px', color: '#a855f7', marginBottom: '24px' }}>{isRegister ? 'Rejoignez InterimPro gratuitement' : 'Bienvenue ! Connectez-vous pour continuer'}</p>

          <button onClick={handleGoogle} disabled={loading} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', padding: '12px', borderRadius: '12px', background: 'white', border: '1.5px solid rgba(232,123,249,0.3)', cursor: loading ? 'not-allowed' : 'pointer', marginBottom: '20px', fontSize: '14px', fontWeight: 600, color: '#3b0764', boxShadow: '0 2px 8px rgba(232,123,249,0.12)', opacity: loading ? 0.7 : 1 }}>
            <svg style={{ width: '18px', height: '18px', flexShrink: 0 }} viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continuer avec Google
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
            <div style={{ flex: 1, height: '1px', background: 'rgba(232,123,249,0.2)' }} />
            <span style={{ fontSize: '12px', color: '#c084fc' }}>ou par email</span>
            <div style={{ flex: 1, height: '1px', background: 'rgba(232,123,249,0.2)' }} />
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#7c3aed', marginBottom: '6px' }}>Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="vous@exemple.com" style={{ width: '100%', padding: '11px 14px', borderRadius: '10px', border: '1.5px solid rgba(232,123,249,0.25)', background: 'rgba(255,255,255,0.8)', color: '#3b0764', fontSize: '14px', outline: 'none', boxSizing: 'border-box' as const }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#7c3aed', marginBottom: '6px' }}>Mot de passe</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="••••••••" style={{ width: '100%', padding: '11px 14px', borderRadius: '10px', border: '1.5px solid rgba(232,123,249,0.25)', background: 'rgba(255,255,255,0.8)', color: '#3b0764', fontSize: '14px', outline: 'none', boxSizing: 'border-box' as const }} />
            </div>
            {msg.text && (
              <div style={{ padding: '10px 14px', borderRadius: '8px', background: msg.ok ? '#f0fdf4' : '#fef2f2', border: '1px solid ' + (msg.ok ? '#86efac' : '#fca5a5'), fontSize: '13px', color: msg.ok ? '#166534' : '#dc2626' }}>{msg.text}</div>
            )}
            <button type="submit" disabled={loading} style={{ padding: '12px', borderRadius: '12px', border: 'none', background: 'linear-gradient(135deg, #e87bf9 0%, #a855f7 100%)', color: 'white', fontSize: '14px', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, boxShadow: '0 4px 14px rgba(168,85,247,0.35)' }}>
              {loading ? 'Chargement...' : isRegister ? 'Creer mon compte' : 'Se connecter'}
            </button>
          </form>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
            <button onClick={() => setIsRegister(!isRegister)} style={{ fontSize: '13px', color: '#9333ea', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, padding: 0 }}>
              {isRegister ? 'Deja un compte ?' : 'Creer un compte'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
