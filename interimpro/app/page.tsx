'use client'
import{useState,useEffect}from 'react'
import{useRouter}from 'next/navigation'
import{getSupabase}from '@/lib/supabase/client'

export default function LoginPage(){
  const[email,setEmail]=useState('');const[pwd,setPwd]=useState('')
  const[loading,setLoading]=useState(false);const[err,setErr]=useState('')
  const[mode,setMode]=useState<'in'|'up'>('in')
  const router=useRouter()
  useEffect(()=>{
    document.documentElement.style.setProperty('--accent','#e879f9')
    document.documentElement.removeAttribute('data-theme')
    const p=new URLSearchParams(window.location.search)
    if(p.get('error')) setErr('Connexion échouée. Réessayez.')
    getSupabase().auth.getSession().then(({data})=>{if(data.session)router.replace('/dashboard')})
  },[])
  const handleGoogle=async()=>{
    setLoading(true);setErr('')
    const{error}=await getSupabase().auth.signInWithOAuth({provider:'google',options:{redirectTo:`${window.location.origin}/dashboard`}})
    if(error){setErr(error.message);setLoading(false)}
  }
  const handleEmail=async(e:React.FormEvent)=>{
    e.preventDefault();setLoading(true);setErr('')
    const fn=mode==='in'?getSupabase().auth.signInWithPassword({email,password:pwd}):getSupabase().auth.signUp({email,password:pwd})
    const{error}=await fn
    if(error){setErr(error.message);setLoading(false)}
    else router.replace('/dashboard')
  }
  const inp:React.CSSProperties={width:'100%',padding:'10px 13px',borderRadius:9,border:'1.5px solid #e9d5f9',background:'white',color:'#3b0764',fontSize:14,outline:'none',boxSizing:'border-box'}
  return(
    <div style={{minHeight:'100vh',background:'linear-gradient(135deg,#fdf2f8 0%,#fce7f3 40%,#ede9fe 100%)',display:'flex',alignItems:'center',justifyContent:'center',padding:20}}>
      <div style={{width:'100%',maxWidth:400}}>
        <div style={{textAlign:'center',marginBottom:28}}>
          <div style={{width:64,height:64,borderRadius:18,background:'white',boxShadow:'0 4px 20px rgba(232,123,249,0.2)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 14px'}}>
            <svg viewBox="0 0 100 100" width="40" height="40"><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style={{stopColor:'#e879f9'}}/><stop offset="100%" style={{stopColor:'#a855f7'}}/></linearGradient></defs><rect width="100" height="100" rx="22" fill="url(#g)"/><g stroke="white" fill="none" strokeLinecap="round" strokeLinejoin="round"><line x1="35" y1="28" x2="35" y2="50" strokeWidth="5"/><line x1="65" y1="28" x2="65" y2="50" strokeWidth="5"/><path d="M35 28 Q35 18 50 18 Q65 18 65 28" strokeWidth="5"/><path d="M35 50 Q35 72 50 72 Q65 72 65 56" strokeWidth="5"/><circle cx="65" cy="56" r="8" strokeWidth="4" fill="rgba(255,255,255,0.9)"/></g></svg>
          </div>
          <h1 style={{fontSize:24,fontWeight:800,color:'#581c87',marginBottom:4}}>InterimPro</h1>
          <p style={{fontSize:13,color:'#a855f7'}}>Gestion de missions d'intérim médical</p>
        </div>
        <div style={{background:'rgba(255,255,255,0.92)',backdropFilter:'blur(20px)',border:'1px solid rgba(232,123,249,0.15)',borderRadius:20,padding:28,boxShadow:'0 8px 40px rgba(147,51,234,0.08)'}}>
          <h2 style={{fontSize:17,fontWeight:700,color:'#3b0764',marginBottom:20,textAlign:'center'}}>{mode==='in'?'Connexion':'Inscription'}</h2>
          {err&&<div style={{padding:'9px 13px',borderRadius:9,background:'rgba(239,68,68,.08)',border:'1px solid rgba(239,68,68,.2)',fontSize:13,color:'#dc2626',marginBottom:14}}>⚠️ {err}</div>}
          <button onClick={handleGoogle} disabled={loading} style={{width:'100%',display:'flex',alignItems:'center',justifyContent:'center',gap:10,padding:12,borderRadius:12,background:'white',border:'1.5px solid #e5e7eb',cursor:'pointer',marginBottom:16,fontSize:14,fontWeight:600,color:'#374151',boxShadow:'0 1px 4px rgba(0,0,0,0.06)'}}>
            <svg style={{width:18,height:18,flexShrink:0}} viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
            {loading?'Redirection...':'Continuer avec Google'}
          </button>
          <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:16}}><div style={{flex:1,height:1,background:'#f0d9fb'}}/><span style={{fontSize:12,color:'#c084fc'}}>ou par email</span><div style={{flex:1,height:1,background:'#f0d9fb'}}/></div>
          <form onSubmit={handleEmail} style={{display:'flex',flexDirection:'column',gap:12}}>
            <div><label style={{display:'block',fontSize:12,fontWeight:600,color:'#7c3aed',marginBottom:5}}>Email</label><input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="vous@exemple.com" required style={inp}/></div>
            <div><label style={{display:'block',fontSize:12,fontWeight:600,color:'#7c3aed',marginBottom:5}}>Mot de passe</label><input type="password" value={pwd} onChange={e=>setPwd(e.target.value)} placeholder="••••••••" required style={inp}/></div>
            <button type="submit" disabled={loading} style={{padding:11,borderRadius:11,border:'none',background:'linear-gradient(135deg,#e87bf9,#a855f7)',color:'white',fontSize:14,fontWeight:700,cursor:'pointer',marginTop:2}}>{loading?'...':(mode==='in'?'Se connecter':"S'inscrire")}</button>
          </form>
          <button onClick={()=>setMode(mode==='in'?'up':'in')} style={{width:'100%',marginTop:14,fontSize:13,color:'#9333ea',background:'none',border:'none',cursor:'pointer',fontWeight:500}}>{mode==='in'?"Pas encore de compte ? S'inscrire":'Déjà un compte ? Se connecter'}</button>
        </div>
      </div>
    </div>
  )
}
