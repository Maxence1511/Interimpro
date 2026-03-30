'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabase } from '@/lib/supabase/client'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [pwd, setPwd] = useState('')
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')
  const [mode, setMode] = useState<'in'|'up'>('in')
  const router = useRouter()

  useEffect(() => {
    const d = document.documentElement
    d.style.setProperty('--accent', '#e879f9')
    d.removeAttribute('data-theme')
    // Vérifier si déjà connecté
    getSupabase().auth.getSession().then(({ data }) => {
      if (data.session) router.replace('/dashboard')
    })
  }, [])

  const handleGoogle = async () => {
    setLoading(true); setErr('')
    // redirectTo = /auth/exchange qui redirige vers /auth/callback (route serveur)
    const { error } = await getSupabase().auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin + '/auth/exchange',
        queryParams: { access_type: 'offline', prompt: 'consent' }
      }
    })
    if (error) { setErr(error.message); setLoading(false) }
  }

  const handleEmail = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); setErr('')
    const sb = getSupabase()
    const { error } = mode === 'in'
      ? await sb.auth.signInWithPassword({ email, password: pwd })
      : await sb.auth.signUp({ email, password: pwd })
    if (error) { setErr(error.message); setLoading(false) }
    else router.replace('/dashboard')
  }

  const inp: React.CSSProperties = { width:'100%', padding:'10px 13px', borderRadius:9, border:'1.5px solid #e9d5f9', background:'white', color:'#3b0764', fontSize:14, outline:'none', boxSizing:'border-box' }

  return (
    <div style={{ minHeight:'100vh', background:'linear-gradient(135deg,#fdf2f8 0%,#fce7f3 40%,#ede9fe 100%)', display:'flex', alignItems:'center', justifyContent:'center', padding:20, position:'relative', overflow:'hidden' }}>
      <div style={{ position:'fixed', top:-80, right:-80, width:300, height:300, borderRadius:'50%', background:'rgba(232,123,249,0.12)', pointerEvents:'none' }}/>
      <div style={{ position:'fixed', bottom:-60, left:-60, width:250, height:250, borderRadius:'50%', background:'rgba(167,139,250,0.10)', pointerEvents:'none' }}/>
      <div style={{ width:'100%', maxWidth:400, position:'relative', zIndex:1 }}>
        <div style={{ textAlign:'center', marginBottom:28 }}>
          <div style={{ width:64, height:64, borderRadius:18, background:'white', boxShadow:'0 4px 20px rgba(232,123,249,0.2)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 14px' }}>
            <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="#e87bf9" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 6 6a6 6 0 0 0 6-6V4a2 2 0 0 0-2-2h-1a.2.2 0 1 0 .3.3"/>
              <path d="M8 15v1a6 6 0 0 0 6 6a6 6 0 0 0 6-6v-4"/><circle cx="20" cy="10" r="2"/>
            </svg>
          </div>
          <h1 style={{ fontSize:24, fontWeight:800, color:'#581c87', marginBottom:4 }}>InterimPro</h1>
          <p style={{ fontSize:13, color:'#a855f7' }}>Gestion de missions d'intérim médical</p>
        </div>
        <div style={{ background:'rgba(255,255,255,0.92)', backdropFilter:'blur(20px)', border:'1px solid rgba(232,123,249,0.15)', borderRadius:20, padding:28, boxShadow:'0 8px 40px rgba(147,51,234,0.08)' }}>
          <h2 style={{ fontSize:17, fontWeight:700, color:'#3b0764', marginBottom:20, textAlign:'center' }}>{mode==='in'?'Connexion':'Inscription'}</h2>
          {err && <div style={{ padding:'9px 13px', borderRadius:9, background:'rgba(239,68,68,.08)', border:'1px solid rgba(239,68,68,.2)', fontSize:13, color:'#dc2626', marginBottom:14 }}>⚠️ {err}</div>}
          <button onClick={handleGoogle} disabled={loading} style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:'center', gap:10, padding:12, borderRadius:12, background:'white', border:'1.5px solid #e5e7eb', cursor:'pointer', marginBottom:16, fontSize:14, fontWeight:600, color:'#374151', boxShadow:'0 1px 4px rgba(0,0,0,0.06)' }}>
            <svg style={{ width:18, height:18, flexShrink:0 }} viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            {loading ? 'Connexion...' : 'Continuer avec Google'}
          </button>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16 }}>
            <div style={{ flex:1, height:1, background:'#f0d9fb' }}/><span style={{ fontSize:12, color:'#c084fc' }}>ou par email</span><div style={{ flex:1, height:1, background:'#f0d9fb' }}/>
          </div>
          <form onSubmit={handleEmail} style={{ display:'flex', flexDirection:'column', gap:12 }}>
            <div><label style={{ display:'block', fontSize:12, fontWeight:600, color:'#7c3aed', marginBottom:5 }}>Email</label><input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="vous@exemple.com" required style={inp}/></div>
            <div><label style={{ display:'block', fontSize:12, fontWeight:600, color:'#7c3aed', marginBottom:5 }}>Mot de passe</label><input type="password" value={pwd} onChange={e=>setPwd(e.target.value)} placeholder="••••••••" required style={inp}/></div>
            <button type="submit" disabled={loading} style={{ padding:11, borderRadius:11, border:'none', background:'linear-gradient(135deg,#e87bf9,#a855f7)', color:'white', fontSize:14, fontWeight:700, cursor:'pointer', boxShadow:'0 4px 12px rgba(168,85,247,0.3)', marginTop:2 }}>
              {loading ? '...' : mode==='in' ? 'Se connecter' : "S'inscrire"}
            </button>
          </form>
          <button onClick={()=>setMode(mode==='in'?'up':'in')} style={{ width:'100%', marginTop:14, fontSize:13, color:'#9333ea', background:'none', border:'none', cursor:'pointer', fontWeight:500 }}>
            {mode==='in' ? "Pas encore de compte ? S'inscrire" : 'Déjà un compte ? Se connecter'}
          </button>
        </div>
      </div>
    </div>
  )
}
