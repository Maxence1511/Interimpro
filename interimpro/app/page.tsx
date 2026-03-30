'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { applyTheme } from '@/lib/theme-context'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [mode, setMode] = useState<'login'|'signup'>('login')
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    applyTheme('#e879f9', true)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session) router.push('/dashboard')
    })
    return () => subscription.unsubscribe()
  }, [])

  const handleGoogleLogin = async () => {
    setLoading(true); setError('')
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/exchange` }
    })
    if (error) { setError(error.message); setLoading(false) }
  }

  const handleEmail = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); setError('')
    const fn = mode === 'login'
      ? supabase.auth.signInWithPassword({ email, password })
      : supabase.auth.signUp({ email, password })
    const { error: err } = await fn
    if (err) { setError(err.message); setLoading(false) }
  }

  const accent = '#e879f9'
  const inp: React.CSSProperties = { width:'100%', padding:'11px 14px', borderRadius:9, border:'1px solid #2a3447', background:'#1e293b', color:'#f1f5f9', fontSize:14, outline:'none', boxSizing:'border-box' }

  return (
    <div style={{ minHeight:'100vh', background:'#0f172a', display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
      <div style={{ background:'#1e2433', border:'1px solid #2a3447', borderRadius:18, padding:40, width:'100%', maxWidth:400, boxShadow:'0 24px 80px rgba(0,0,0,.7)' }}>
        <div style={{ textAlign:'center', marginBottom:32 }}>
          <div style={{ width:64, height:64, borderRadius:16, background:'rgba(232,121,249,.12)', border:'1px solid rgba(232,121,249,.28)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 14px' }}>
            <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke={accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 6 6a6 6 0 0 0 6-6V4a2 2 0 0 0-2-2h-1a.2.2 0 1 0 .3.3"/>
              <path d="M8 15v1a6 6 0 0 0 6 6a6 6 0 0 0 6-6v-4"/>
              <circle cx="20" cy="10" r="2"/>
            </svg>
          </div>
          <h1 style={{ fontSize:26, fontWeight:800, color:'#f1f5f9', marginBottom:4 }}>InterimPro</h1>
          <p style={{ fontSize:13, color:'#64748b' }}>Gérez vos missions infirmières</p>
        </div>
        {error && <div style={{ padding:'10px 14px', borderRadius:8, background:'rgba(239,68,68,.1)', border:'1px solid rgba(239,68,68,.25)', fontSize:13, color:'#f87171', marginBottom:16 }}>❌ {error}</div>}
        <button onClick={handleGoogleLogin} disabled={loading} style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:'center', gap:10, padding:'12px', borderRadius:10, border:'1px solid #2a3447', background:'#252d3d', color:'#f1f5f9', cursor:'pointer', fontSize:14, fontWeight:600, marginBottom:20, boxSizing:'border-box' }}>
          <svg width="18" height="18" viewBox="0 0 24 24"><path fill={accent} d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#a78bfa" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#818cf8" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#e879f9" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
          Continuer avec Google
        </button>
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:20 }}>
          <div style={{ flex:1, height:1, background:'#2a3447' }}/>
          <span style={{ fontSize:12, color:'#475569' }}>ou</span>
          <div style={{ flex:1, height:1, background:'#2a3447' }}/>
        </div>
        <form onSubmit={handleEmail} style={{ display:'flex', flexDirection:'column', gap:12 }}>
          <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="Votre email" required style={inp}/>
          <input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Mot de passe" required style={inp}/>
          <button type="submit" disabled={loading} style={{ width:'100%', padding:'12px', borderRadius:10, border:'none', background:`linear-gradient(135deg,${accent},#a855f7)`, color:'white', cursor:'pointer', fontSize:15, fontWeight:700, boxShadow:`0 4px 20px ${accent}40` }}>
            {loading ? 'Connexion...' : mode==='login' ? 'Se connecter' : "S'inscrire"}
          </button>
        </form>
        <button onClick={()=>setMode(mode==='login'?'signup':'login')} style={{ width:'100%', marginTop:12, padding:'10px', background:'transparent', border:'none', color:'#64748b', cursor:'pointer', fontSize:13 }}>
          {mode==='login' ? "Pas de compte ? S'inscrire" : 'Déjà un compte ? Se connecter'}
        </button>
      </div>
    </div>
  )
}
