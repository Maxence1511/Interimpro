'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

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
    if (error) { setMsg({ text: 'Erreur connexion Google: ' + error.message, ok: false }); setLoading(false) }
  }

  const handleEmailAuth = async (e: React.FormEvent) => {
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
      setMsg({ text: err.message || 'Erreur de connexion', ok: false })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: 'var(--bg-primary)' }}>
      
      {/* LEFT PANEL */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '60px', background: 'linear-gradient(135deg, #0e7490 0%, #0f172a 100%)', position: 'relative', overflow: 'hidden' }} className="hidden-mobile">
        <div style={{ position: 'absolute', top: '40px', left: '40px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg viewBox="0 0 24 24" style={{ width: '20px', height: '20px', fill: 'white' }}>
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14v-4H7l5-8v4h4l-5 8z"/>
            </svg>
          </div>
          <span style={{ fontWeight: 700, fontSize: '18px', color: 'white' }}>InterimPro</span>
        </div>
        <div>
          <h2 style={{ fontSize: '40px', fontWeight: 800, color: 'white', marginBottom: '20px', lineHeight: 1.2 }}>
            Votre carrière<br />d&apos;intérimaire<br />simplifiée
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '16px', lineHeight: 1.8, marginBottom: '48px' }}>
            Gérez vos missions, suivez vos revenus et synchronisez votre Google Agenda en un seul endroit.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {[
              'Import automatique Google Agenda',
              'Suivi des revenus et objectifs',
              'Alertes contrats et fiches de paie',
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg viewBox="0 0 20 20" style={{ width: '12px', height: '12px', fill: 'white' }}>
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"/>
                  </svg>
                </div>
                <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: '15px' }}>{item}</span>
              </div>
            ))}
          </div>
        </div>
        <div style={{ position: 'absolute', bottom: '40px', left: '40px' }}>
          <Link href="/" style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px', textDecoration: 'none' }}>← Retour à l&apos;accueil</Link>
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div style={{ width: '480px', minWidth: '320px', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '60px 48px', background: 'var(--bg-primary)' }}>
        <div style={{ marginBottom: '40px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '32px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg viewBox="0 0 24 24" style={{ width: '20px', height: '20px', fill: 'white' }}>
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14v-4H7l5-8v4h4l-5 8z"/>
              </svg>
            </div>
            <span style={{ fontWeight: 700, fontSize: '18px', color: 'var(--text-primary)' }}>InterimPro</span>
          </div>
          <h1 style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '8px' }}>
            {isRegister ? 'Créer un compte' : 'Bon retour !'}
          </h1>
          <p style={{ fontSize: '15px', color: 'var(--text-secondary)' }}>
            {isRegister ? 'Rejoignez InterimPro gratuitement' : 'Connectez-vous à votre espace'}
          </p>
        </div>

        <button onClick={handleGoogle} disabled={loading} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', padding: '13px', borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', cursor: 'pointer', marginBottom: '24px', fontSize: '15px', fontWeight: 500, transition: 'opacity 0.2s', opacity: loading ? 0.6 : 1 }}>
          <svg style={{ width: '20px', height: '20px', flexShrink: 0 }} viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Continuer avec Google
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
          <div style={{ flex: 1, height: '1px', background: 'var(--border)' }}></div>
          <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>ou par email</span>
          <div style={{ flex: 1, height: '1px', background: 'var(--border)' }}></div>
        </div>

        <form onSubmit={handleEmailAuth} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '6px' }}>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="vous@exemple.com"
              style={{ width: '100%', padding: '12px 16px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '15px', outline: 'none', boxSizing: 'border-box' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '6px' }}>Mot de passe</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="••••••••"
              style={{ width: '100%', padding: '12px 16px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '15px', outline: 'none', boxSizing: 'border-box' }} />
          </div>
          {msg.text && (
            <p style={{ fontSize: '13px', color: msg.ok ? '#10b981' : '#ef4444', padding: '10px 14px', borderRadius: '8px', background: msg.ok ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', border: '1px solid ' + (msg.ok ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)') }}>
              {msg.text}
            </p>
          )}
          <button type="submit" disabled={loading}
            style={{ padding: '13px', borderRadius: '12px', border: 'none', background: 'var(--accent)', color: 'white', fontSize: '15px', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1, marginTop: '4px' }}>
            {loading ? 'Chargement...' : isRegister ? 'Créer mon compte' : 'Se connecter'}
          </button>
        </form>

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px', fontSize: '13px' }}>
          <button style={{ color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
            Mot de passe oublié ?
          </button>
          <button onClick={() => setIsRegister(!isRegister)} style={{ color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, padding: 0 }}>
            {isRegister ? 'Déjà un compte ?' : 'Créer un compte'}
          </button>
        </div>
      </div>
    </div>
  )
}
