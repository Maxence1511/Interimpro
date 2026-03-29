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
      options: { redirectTo: window.location.origin + '/auth/exchange' }
    })
    if (error) { setMsg({ text: error.message, ok: false }); setLoading(false) }
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
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        window.location.href = '/dashboard'
      }
    } catch (err: any) {
      setMsg({ text: err.message, ok: false })
    } finally {
      setLoading(false)
    }
  }

  const s = {
    page: { minHeight: '100vh', background: 'linear-gradient(135deg,#fdf4ff 0%,#fae8ff 40%,#f3e8ff 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 } as React.CSSProperties,
    card: { background: 'white', borderRadius: 20, padding: 36, width: '100%', maxWidth: 420, boxShadow: '0 8px 40px rgba(217,70,239,.10)', border: '1px solid rgba(232,121,249,.15)' } as React.CSSProperties,
    inp: { width: '100%', padding: '10px 13px', borderRadius: 9, border: '1.5px solid #e9d5f9', background: 'white', color: '#1f0031', fontSize: 14, outline: 'none', boxSizing: 'border-box' } as React.CSSProperties,
  }

  return (
    <div style={s.page}>
      <div style={{ position: 'fixed', top: -80, right: -80, width: 300, height: 300, borderRadius: '50%', background: 'rgba(232,121,249,.12)', pointerEvents: 'none' }} />
      <div style={{ position: 'fixed', bottom: -60, left: -60, width: 250, height: 250, borderRadius: '50%', background: 'rgba(167,139,250,.10)', pointerEvents: 'none' }} />

      <div style={{ width: '100%', maxWidth: 420, zIndex: 1 }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ width: 68, height: 68, borderRadius: 18, background: 'white', boxShadow: '0 4px 20px rgba(232,121,249,.22)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
            <svg viewBox="0 0 24 24" width="34" height="34" fill="none" stroke="#e879f9" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 6 6a6 6 0 0 0 6-6V4a2 2 0 0 0-2-2h-1a.2.2 0 1 0 .3.3"/>
              <path d="M8 15v1a6 6 0 0 0 6 6a6 6 0 0 0 6-6v-4"/>
              <circle cx="20" cy="10" r="2"/>
            </svg>
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: '#581c87', marginBottom: 4 }}>InterimPro</h1>
          <p style={{ fontSize: 13, color: '#a855f7' }}>Gestion de missions d'intérim médical</p>
        </div>

        <div style={s.card}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#3b0764', marginBottom: 20, textAlign: 'center' }}>
            {isRegister ? 'Créer un compte' : 'Connexion'}
          </h2>

          <button onClick={handleGoogle} disabled={loading} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '11px 16px', borderRadius: 11, background: 'white', border: '1.5px solid #e5e7eb', cursor: 'pointer', marginBottom: 16, fontSize: 14, fontWeight: 600, color: '#374151', boxShadow: '0 1px 4px rgba(0,0,0,.06)', opacity: loading ? .7 : 1 }}>
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continuer avec Google
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <div style={{ flex: 1, height: 1, background: '#f0d9fb' }} />
            <span style={{ fontSize: 12, color: '#c084fc' }}>ou par email</span>
            <div style={{ flex: 1, height: 1, background: '#f0d9fb' }} />
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#7c3aed', marginBottom: 4 }}>Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="vous@exemple.com" style={s.inp} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#7c3aed', marginBottom: 4 }}>Mot de passe</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="••••••••" style={s.inp} />
            </div>
            {msg.text && (
              <div style={{ padding: '9px 12px', borderRadius: 8, background: msg.ok ? '#f0fdf4' : '#fef2f2', border: `1px solid ${msg.ok ? '#86efac' : '#fca5a5'}`, fontSize: 13, color: msg.ok ? '#166534' : '#dc2626' }}>
                {msg.text}
              </div>
            )}
            <button type="submit" disabled={loading} style={{ padding: '11px', borderRadius: 11, border: 'none', background: 'linear-gradient(135deg,#e879f9,#a855f7)', color: 'white', fontSize: 14, fontWeight: 700, cursor: 'pointer', opacity: loading ? .7 : 1, boxShadow: '0 4px 12px rgba(168,85,247,.3)' }}>
              {loading ? 'Chargement...' : isRegister ? 'Créer mon compte' : 'Se connecter'}
            </button>
          </form>

          <button onClick={() => { setIsRegister(!isRegister); setMsg({ text: '', ok: true }) }} style={{ width: '100%', marginTop: 14, fontSize: 13, color: '#9333ea', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500 }}>
            {isRegister ? 'Déjà un compte ? Se connecter' : 'Pas encore de compte ? S\'inscrire'}
          </button>
        </div>
      </div>
    </div>
  )
}
