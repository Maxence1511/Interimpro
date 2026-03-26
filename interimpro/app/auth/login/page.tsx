'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [isRegister, setIsRegister] = useState(false)
  const [msg, setMsg] = useState({ text: '', ok: true })
  const supabase = createClient()
  const router = useRouter()

  const handleGoogle = async () => {
    setLoading(true)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        scopes: 'https://www.googleapis.com/auth/calendar',
        redirectTo: window.location.origin + '/auth/callback',
      }
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
        router.push('/dashboard')
        router.refresh()
      }
    } catch (err: any) {
      setMsg({ text: err.message || 'Erreur', ok: false })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0e7490 0%, #0f172a 60%, #0c1220 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Cercles décoratifs en arrière-plan */}
      <div style={{ position: 'absolute', top: '-100px', right: '-100px', width: '400px', height: '400px', borderRadius: '50%', background: 'rgba(6,182,212,0.08)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: '-80px', left: '-80px', width: '300px', height: '300px', borderRadius: '50%', background: 'rgba(6,182,212,0.06)', pointerEvents: 'none' }} />

      <div style={{ width: '100%', maxWidth: '420px', position: 'relative', zIndex: 1 }}>
        {/* Logo + Nom + Slogan */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ width: '72px', height: '72px', borderRadius: '20px', background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <svg viewBox="0 0 64 64" style={{ width: '42px', height: '42px' }} fill="none">
              <circle cx="32" cy="20" r="10" stroke="#67e8f9" strokeWidth="3" fill="none"/>
              <path d="M12 54 C12 38 52 38 52 54" stroke="#67e8f9" strokeWidth="3" fill="none" strokeLinecap="round"/>
              <circle cx="48" cy="44" r="6" stroke="#06b6d4" strokeWidth="2.5" fill="none"/>
              <path d="M48 40 L48 34 M44 44 L40 44" stroke="#06b6d4" strokeWidth="2.5" strokeLinecap="round"/>
            </svg>
          </div>
          <h1 style={{ fontSize: '28px', fontWeight: 800, color: 'white', marginBottom: '8px', letterSpacing: '-0.5px' }}>
            InterimPro
          </h1>
          <p style={{ fontSize: '15px', color: 'rgba(255,255,255,0.6)', fontWeight: 400 }}>
            Votre carrière d&apos;infirmier·ère simplifiée
          </p>
        </div>

        {/* Card de connexion */}
        <div style={{ background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '20px', padding: '32px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'white', marginBottom: '6px' }}>
            {isRegister ? 'Créer un compte' : 'Connexion'}
          </h2>
          <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)', marginBottom: '24px' }}>
            {isRegister ? 'Rejoignez InterimPro gratuitement' : 'Bienvenue ! Connectez-vous pour continuer'}
          </p>

          {/* Bouton Google */}
          <button onClick={handleGoogle} disabled={loading} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', padding: '13px', borderRadius: '12px', background: 'white', border: 'none', cursor: loading ? 'not-allowed' : 'pointer', marginBottom: '20px', fontSize: '15px', fontWeight: 600, color: '#1f2937', opacity: loading ? 0.7 : 1, transition: 'opacity 0.2s' }}>
            <svg style={{ width: '20px', height: '20px', flexShrink: 0 }} viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continuer avec Google
          </button>

          {/* Séparateur */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
            <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.12)' }} />
            <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)' }}>ou par email</span>
            <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.12)' }} />
          </div>

          {/* Formulaire */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', color: 'rgba(255,255,255,0.6)', marginBottom: '6px', fontWeight: 500 }}>Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="vous@exemple.com"
                style={{ width: '100%', padding: '12px 14px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.08)', color: 'white', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', color: 'rgba(255,255,255,0.6)', marginBottom: '6px', fontWeight: 500 }}>Mot de passe</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="••••••••"
                style={{ width: '100%', padding: '12px 14px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.08)', color: 'white', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }} />
            </div>

            {msg.text && (
              <div style={{ padding: '10px 14px', borderRadius: '8px', background: msg.ok ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)', border: '1px solid ' + (msg.ok ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'), fontSize: '13px', color: msg.ok ? '#6ee7b7' : '#fca5a5' }}>
                {msg.text}
              </div>
            )}

            <button type="submit" disabled={loading} style={{ padding: '13px', borderRadius: '12px', border: 'none', background: '#06b6d4', color: 'white', fontSize: '15px', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, marginTop: '4px' }}>
              {loading ? 'Chargement...' : isRegister ? 'Créer mon compte' : 'Se connecter'}
            </button>
          </form>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '16px' }}>
            <button style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>Mot de passe oublié ?</button>
            <button onClick={() => setIsRegister(!isRegister)} style={{ fontSize: '13px', color: '#67e8f9', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, padding: 0 }}>
              {isRegister ? 'Déjà un compte ?' : 'Créer un compte'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
