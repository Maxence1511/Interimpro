'use client'
import{useState,useEffect}from 'react'
import Link from 'next/link'
import{getSupabase}from '@/lib/supabase/client'
import{useTheme}from '@/lib/theme-context'
import{t}from '@/lib/i18n'
type Mission={id:string;titre:string;etablissement_id:string;date_debut:string;statut:string;heures:number;salaire_estime:number}
type Etab={id:string;nom:string}
export default function DashboardPage(){
  const[missions,setMissions]=useState<Mission[]>([])
  const[etabs,setEtabs]=useState<Etab[]>([])
  const[mois,setMois]=useState(new Date())
  const[loading,setLoading]=useState(true)
  const{accent,lang,objectif,userId}=useTheme()
  useEffect(()=>{
    if(!userId) return
    Promise.all([
      getSupabase().from('missions').select('*').eq('user_id',userId).order('date_debut',{ascending:false}),
      getSupabase().from('etablissements').select('id,nom').eq('user_id',userId).eq('archived',false),
    ]).then(([m,e])=>{setMissions(m.data||[]);setEtabs(e.data||[]);setLoading(false)})
  },[userId])
  const y=mois.getFullYear(),mo=mois.getMonth()
  const mD=new Date(y,mo,1).toISOString(),mF=new Date(y,mo+1,0,23,59,59).toISOString()
  const pD=new Date(y,mo-1,1).toISOString(),pF=new Date(y,mo,0,23,59,59).toISOString()
  const moisMs=missions.filter(m=>m.date_debut>=mD&&m.date_debut<=mF)
  const prevMs=missions.filter(m=>m.date_debut>=pD&&m.date_debut<=pF)
  const rev=moisMs.reduce((a,m)=>a+(Number(m.salaire_estime)||0),0)
  const prevRev=prevMs.reduce((a,m)=>a+(Number(m.salaire_estime)||0),0)
  const heurs=moisMs.reduce((a,m)=>a+(Number(m.heures)||0),0)
  const pct=Math.round((heurs/(objectif||152))*100)
  const fmtEur=(n:number)=>n.toLocaleString('fr-FR',{style:'currency',currency:'EUR',minimumFractionDigits:0})
  const fmtDate=(d:string)=>new Date(d).toLocaleDateString('fr-FR',{day:'numeric',month:'short'})
  const getEtab=(id:string)=>etabs.find(e=>e.id===id)
  const avenir=missions.filter(m=>m.statut==='a_venir').sort((a,b)=>a.date_debut.localeCompare(b.date_debut))
  const passees=missions.filter(m=>m.statut==='passee').sort((a,b)=>b.date_debut.localeCompare(a.date_debut))
  const isNow=mo===new Date().getMonth()&&y===new Date().getFullYear()
  const moisLabel=mois.toLocaleDateString('fr-FR',{month:'long',year:'numeric'}).replace(/^\w/,c=>c.toUpperCase())
  const diff=rev-prevRev
  return(
    <div>
      <div style={{marginBottom:20}}><h1 style={{fontSize:26,fontWeight:800,color:'var(--text)',marginBottom:4}}>{t(lang,'dashboard.title')}</h1><p style={{fontSize:14,color:'var(--text-dim)'}}>{t(lang,'dashboard.subtitle')}</p></div>
      <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:20}}>
        <button onClick={()=>setMois(new Date(y,mo-1,1))} style={{width:30,height:30,borderRadius:8,border:'1px solid var(--border)',background:'var(--bg-card)',color:'var(--text-muted)',cursor:'pointer',fontSize:16}}>‹</button>
        <span style={{fontSize:14,fontWeight:600,color:'var(--text)',minWidth:140,textAlign:'center'}}>{moisLabel}</span>
        <button onClick={()=>setMois(new Date(y,mo+1,1))} style={{width:30,height:30,borderRadius:8,border:'1px solid var(--border)',background:'var(--bg-card)',color:'var(--text-muted)',cursor:'pointer',fontSize:16}}>›</button>
        {!isNow&&<button onClick={()=>setMois(new Date())} style={{padding:'5px 12px',borderRadius:7,border:`1px solid ${accent}`,background:'var(--accent-dim)',color:accent,cursor:'pointer',fontSize:12,fontWeight:600}}>Mois actuel</button>}
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:14,marginBottom:22}}>
        {[
          {label:t(lang,'dashboard.revenues'),value:fmtEur(rev),sub:`${diff>=0?'↑':'↓'} ${fmtEur(Math.abs(diff))} vs préc.`,color:accent,icon:'💶'},
          {label:t(lang,'dashboard.hours'),value:`${heurs.toFixed(1)}h`,sub:`${moisMs.length} mission${moisMs.length>1?'s':''}`,color:'#8b5cf6',icon:'⏱'},
          {label:t(lang,'dashboard.objective'),value:`${pct}%`,sub:`${heurs.toFixed(1)}h / ${objectif||152}h`,color:'#14b8a6',icon:'🎯',bar:pct},
        ].map(k=>(
          <div key={k.label} style={{background:'var(--bg-card)',border:'1px solid var(--border)',borderLeft:`3px solid ${k.color}`,borderRadius:10,padding:'16px 18px'}}>
            <div style={{fontSize:11,fontWeight:700,textTransform:'uppercase',letterSpacing:'.06em',color:'var(--text-dim)',marginBottom:8}}>{k.label}</div>
            <div style={{fontSize:26,fontWeight:800,color:'var(--text)',marginBottom:6}}>{k.value}</div>
            {(k as any).bar!==undefined?(
              <div><div style={{fontSize:11,color:'var(--text-dim)',marginBottom:4}}>{k.sub}</div><div style={{height:4,background:'var(--bg-input)',borderRadius:100,overflow:'hidden'}}><div style={{height:'100%',width:`${Math.min((k as any).bar,100)}%`,background:`linear-gradient(90deg,${accent},#8b5cf6)`,borderRadius:100}}/></div></div>
            ):<div style={{fontSize:12,color:k.color}}>{k.sub}</div>}
          </div>
        ))}
      </div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
        <div style={{background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:12,padding:20}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
            <h3 style={{fontSize:14,fontWeight:700,color:'var(--text)'}}>{t(lang,'dashboard.upcoming')}</h3>
            <span style={{fontSize:12,color:'var(--text-dim)'}}>{avenir.length} à venir</span>
          </div>
          {avenir.length===0?(<div style={{padding:'28px 0',textAlign:'center'}}><div style={{fontSize:36,marginBottom:8}}>📅</div><p style={{fontSize:13,color:'var(--text-dim)',marginBottom:10}}>{t(lang,'dashboard.no_upcoming')}</p><Link href="/dashboard/missions" style={{color:accent,fontSize:13,fontWeight:600,textDecoration:'none'}}>{t(lang,'dashboard.add_mission')}</Link></div>)
          :avenir.slice(0,5).map(m=>(
            <div key={m.id} style={{padding:'10px 14px',borderRadius:9,background:'var(--bg-input)',marginBottom:6,borderLeft:`3px solid ${accent}`}}>
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:2}}><span style={{fontSize:13,fontWeight:700,color:'var(--text)'}}>{m.titre}</span><span style={{fontSize:12,color:accent,fontWeight:600}}>{m.heures}h</span></div>
              <div style={{fontSize:12,color:'var(--text-muted)'}}>{getEtab(m.etablissement_id)?.nom}</div>
              <div style={{fontSize:11,color:'var(--text-dim)',marginTop:2}}>📅 {fmtDate(m.date_debut)}</div>
            </div>
          ))}
        </div>
        <div style={{background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:12,padding:20}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
            <h3 style={{fontSize:14,fontWeight:700,color:'var(--text)'}}>{t(lang,'dashboard.recent')}</h3>
            <Link href="/dashboard/missions" style={{fontSize:12,color:accent,textDecoration:'none',fontWeight:600}}>Voir tout →</Link>
          </div>
          {passees.length===0?<div style={{padding:'28px 0',textAlign:'center',color:'var(--text-dim)',fontSize:13}}>Aucune mission réalisée</div>
          :passees.slice(0,5).map(m=>(
            <div key={m.id} style={{padding:'10px 14px',borderRadius:9,background:'var(--bg-input)',marginBottom:6}}>
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:2}}><span style={{fontSize:13,fontWeight:700,color:'var(--text)'}}>{m.titre}</span><span style={{fontSize:13,fontWeight:700,color:accent}}>{fmtEur(m.salaire_estime)}</span></div>
              <div style={{fontSize:12,color:'var(--text-muted)'}}>{getEtab(m.etablissement_id)?.nom} · {fmtDate(m.date_debut)}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
