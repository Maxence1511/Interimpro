'use client'
import{useState,useEffect}from 'react'
import{getSupabase}from '@/lib/supabase/client'
import{useTheme}from '@/lib/theme-context'
import{t}from '@/lib/i18n'
import Link from 'next/link'

type Mission={id:string;titre:string;date_debut:string;date_fin:string;statut:string;salaire_estime:number;etablissement_id:string}
type Etab={id:string;nom:string}

const JOURS_FERIES_FR=(y:number)=>{
  const d=(a:number,m:number,j:number)=>new Date(a,m-1,j).toISOString().slice(0,10)
  const pasques=(a:number)=>{const f=Math.floor,c=a%19,b=f(a/100),e=b-f(b/4)-f((8*b+13)/25)+19*c+15,h=(e-f(e/30)*30)%30,k=h-(f(h/28))*(1-(f(29/(h+1)))*(f(21/(c+11)))),p=(a+f(a/4)+k+2-b+f(b/4))%7,q=k-p;const mois=q<-9?4:3,jour=q+(mois===3?29:1);return{m:mois,j:jour}}
  const{m,j}=pasques(y)
  const pa=new Date(y,m-1,j);const lp=new Date(pa);lp.setDate(pa.getDate()+1);const ap=new Date(pa);ap.setDate(pa.getDate()+39);const pp=new Date(pa);pp.setDate(pa.getDate()+49)
  return[d(y,1,1),d(y,5,1),d(y,5,8),d(y,7,14),d(y,8,15),d(y,11,1),d(y,11,11),d(y,12,25),lp.toISOString().slice(0,10),ap.toISOString().slice(0,10),pp.toISOString().slice(0,10)]
}

export default function CalendrierPage(){
  const[missions,setMissions]=useState<Mission[]>([])
  const[etabs,setEtabs]=useState<Etab[]>([])
  const[date,setDate]=useState(new Date())
  const{accent,lang,userId}=useTheme()
  const y=date.getFullYear(),m=date.getMonth()
  const jf=JOURS_FERIES_FR(y)
  const premiers=new Date(y,m,1).getDay()||7
  const nbjours=new Date(y,m+1,0).getDate()
  const moisLabel=date.toLocaleDateString('fr-FR',{month:'long',year:'numeric'}).replace(/^\w/,c=>c.toUpperCase())

  useEffect(()=>{
    if(!userId) return
    const sb=getSupabase()
    Promise.all([
      sb.from('missions').select('*').eq('user_id',userId),
      sb.from('etablissements').select('id,nom').eq('user_id',userId).eq('archived',false)
    ]).then(([m2,e])=>{setMissions(m2.data||[]);setEtabs(e.data||[])})
  },[userId])

  const missionsJour=(j:number)=>{
    const date2=new Date(y,m,j).toISOString().slice(0,10)
    return missions.filter(mi=>mi.date_debut.slice(0,10)===date2)
  }
  const getEtab=(id:string)=>etabs.find(e=>e.id===id)

  return(
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:22}}>
        <h1 style={{fontSize:26,fontWeight:800,color:'var(--text)'}}>{t(lang,'nav.calendrier')}</h1>
        <div style={{display:'flex',gap:10,alignItems:'center'}}>
          <button onClick={()=>setDate(new Date(y,m-1,1))} style={{width:32,height:32,borderRadius:8,border:'1px solid var(--border)',background:'var(--bg-card)',color:'var(--text-muted)',cursor:'pointer',fontSize:16}}>‹</button>
          <span style={{fontWeight:700,color:'var(--text)',minWidth:150,textAlign:'center'}}>{moisLabel}</span>
          <button onClick={()=>setDate(new Date(y,m+1,1))} style={{width:32,height:32,borderRadius:8,border:'1px solid var(--border)',background:'var(--bg-card)',color:'var(--text-muted)',cursor:'pointer',fontSize:16}}>›</button>
          <button onClick={()=>setDate(new Date())} style={{padding:'6px 12px',borderRadius:7,border:`1px solid ${accent}`,background:'var(--accent-dim)',color:accent,cursor:'pointer',fontSize:12,fontWeight:600}}>Aujourd'hui</button>
        </div>
      </div>
      <div style={{background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:12,overflow:'hidden'}}>
        <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',borderBottom:'1px solid var(--border)'}}>
          {['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'].map(j=><div key={j} style={{padding:'10px 0',textAlign:'center',fontSize:11,fontWeight:700,color:'var(--text-dim)',letterSpacing:'.06em'}}>{j}</div>)}
        </div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)'}}>
          {Array.from({length:premiers-1}).map((_,i)=><div key={`v${i}`} style={{minHeight:90,borderRight:'1px solid var(--border)',borderBottom:'1px solid var(--border)'}}/>)}
          {Array.from({length:nbjours}).map((_,i)=>{
            const j=i+1
            const dateStr=`${y}-${String(m+1).padStart(2,'0')}-${String(j).padStart(2,'0')}`
            const isToday=dateStr===new Date().toISOString().slice(0,10)
            const isFerie=jf.includes(dateStr)
            const isWE=([6,0]).includes(new Date(y,m,j).getDay())
            const ms=missionsJour(j)
            const col=(i+premiers-1)%7
            return(
              <div key={j} style={{minHeight:90,padding:6,borderRight:'1px solid var(--border)',borderBottom:'1px solid var(--border)',background:isToday?`${accent}10`:isFerie?'rgba(245,158,11,.05)':isWE?'rgba(255,255,255,.02)':'transparent',position:'relative'}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:4}}>
                  <span style={{width:22,height:22,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',background:isToday?accent:'transparent',color:isToday?'white':isFerie?'#f59e0b':'var(--text-dim)',fontSize:12,fontWeight:isToday?700:400}}>{j}</span>
                  {isFerie&&<span style={{fontSize:9,color:'#f59e0b'}}>🎉</span>}
                </div>
                {ms.map(mi=>(
                  <Link key={mi.id} href="/dashboard/missions" style={{display:'block',padding:'2px 5px',borderRadius:4,background:`${accent}25`,border:`1px solid ${accent}40`,fontSize:10,color:accent,fontWeight:600,marginBottom:2,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',textDecoration:'none'}}>
                    {mi.titre}
                  </Link>
                ))}
              </div>
            )
          })}
          {Array.from({length:(7-((nbjours+premiers-1)%7||7))%7}).map((_,i)=><div key={`f${i}`} style={{minHeight:90,borderRight:'1px solid var(--border)',borderBottom:'1px solid var(--border)'}}/>)}
        </div>
      </div>
    </div>
  )
}
