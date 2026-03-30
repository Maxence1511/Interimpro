'use client'
import { useState, useEffect } from 'react'
import { getSupabase } from '@/lib/supabase/client'
import { useTheme } from '@/lib/theme-context'
import { t } from '@/lib/i18n'

type Mission = { id:string; date_debut:string; heures:number; salaire_estime:number; etablissement_id:string }
type Etab = { id:string; nom:string }

export default function AnalysesPage() {
  const [missions, setMissions] = useState<Mission[]>([])
  const [etabs, setEtabs] = useState<Etab[]>([])
  const [moisSel, setMoisSel] = useState(new Date())
  const [anneeSel, setAnneeSel] = useState(new Date().getFullYear())
  
  const { accent, lang, userId } = useTheme()

  useEffect(() => {
    if (!userId) return
    Promise.all([
      supabase.from('missions').select('*').eq('user_id',userId).order('date_debut'),
      supabase.from('etablissements').select('id,nom').eq('user_id',userId),
    ]).then(([m,e])=>{ setMissions((m.data||[]) as Mission[]); setEtabs((e.data||[]) as Etab[]) })
  }, [userId])

  const fmtEur = (n:number) => n.toLocaleString('fr-FR',{style:'currency',currency:'EUR',minimumFractionDigits:2})
  const mD = new Date(moisSel.getFullYear(),moisSel.getMonth(),1).toISOString()
  const mF = new Date(moisSel.getFullYear(),moisSel.getMonth()+1,0,23,59,59).toISOString()
  const moisMs = missions.filter(m=>m.date_debut>=mD&&m.date_debut<=mF)
  const moisLabel = moisSel.toLocaleDateString('fr-FR',{month:'long',year:'numeric'}).replace(/^\w/,c=>c.toUpperCase())
  const MOIS = ['janv.','févr.','mars','avr.','mai','juin','juil.','août','sept.','oct.','nov.','déc.']
  const evol = Array.from({length:12},(_,i)=>{
    const d=new Date(moisSel.getFullYear(),i,1).toISOString(), f=new Date(moisSel.getFullYear(),i+1,0,23,59,59).toISOString()
    const ms=missions.filter(m=>m.date_debut>=d&&m.date_debut<=f)
    return { label:MOIS[i], revenus:ms.reduce((a,m)=>a+(m.salaire_estime||0),0) }
  })
  const maxRev = Math.max(...evol.map(d=>d.revenus),1)
  const etabStats = etabs.map(e=>({ ...e, rev:missions.filter(m=>m.etablissement_id===e.id).reduce((a,m)=>a+(m.salaire_estime||0),0) })).filter(e=>e.rev>0)
  const totalRev = etabStats.reduce((a,e)=>a+e.rev,0)
  const anneeMs = missions.filter(m=>new Date(m.date_debut).getFullYear()===anneeSel)
  const evolAnnee = Array.from({length:12},(_,i)=>{
    const d=new Date(anneeSel,i,1).toISOString(), f=new Date(anneeSel,i+1,0,23,59,59).toISOString()
    const ms=missions.filter(m=>m.date_debut>=d&&m.date_debut<=f)
    return { label:MOIS[i], revenus:ms.reduce((a,m)=>a+(m.salaire_estime||0),0) }
  })
  const maxAnnee = Math.max(...evolAnnee.map(d=>d.revenus),1)
  const CYANS = ['#22d3ee','#06b6d4','#0891b2','#0e7490']
  const isThisMonth = moisSel.getMonth()===new Date().getMonth()&&moisSel.getFullYear()===new Date().getFullYear()
  const isThisYear = anneeSel===new Date().getFullYear()

  const KPI = ({ label, value, icon }:{ label:string; value:string; icon:string }) => (
    <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:10, padding:'16px 18px', flex:1 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:10 }}>
        <span style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'.08em', color:'var(--text-dim)' }}>{label}</span>
        <div style={{ width:30, height:30, borderRadius:8, background:'var(--bg-input)', border:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14 }}>{icon}</div>
      </div>
      <div style={{ fontSize:24, fontWeight:800, color:'var(--text)' }}>{value}</div>
    </div>
  )

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
        <h1 style={{ fontSize:22, fontWeight:800, color:'var(--text)' }}>{t(lang,'ana.title')}</h1>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <button onClick={()=>setMoisSel(new Date(moisSel.getFullYear(),moisSel.getMonth()-1,1))} style={{ width:28, height:28, borderRadius:7, border:'1px solid var(--border)', background:'var(--bg-card)', color:'var(--text-muted)', cursor:'pointer', fontSize:14, display:'flex', alignItems:'center', justifyContent:'center' }}>‹</button>
          <span style={{ fontSize:13, fontWeight:600, color:'var(--text)', minWidth:120, textAlign:'center' }}>{moisLabel}</span>
          <button onClick={()=>setMoisSel(new Date(moisSel.getFullYear(),moisSel.getMonth()+1,1))} style={{ width:28, height:28, borderRadius:7, border:'1px solid var(--border)', background:'var(--bg-card)', color:'var(--text-muted)', cursor:'pointer', fontSize:14, display:'flex', alignItems:'center', justifyContent:'center' }}>›</button>
          {!isThisMonth && <button onClick={()=>setMoisSel(new Date())} style={{ padding:'4px 10px', borderRadius:7, border:`1px solid ${accent}`, background:'var(--accent-dim)', color:accent, cursor:'pointer', fontSize:11, fontWeight:600 }}>{t(lang,'gen.current_month')}</button>}
        </div>
      </div>
      <div style={{ display:'flex', gap:14, marginBottom:18 }}>
        <KPI label={t(lang,'ana.revenues_month')} value={fmtEur(moisMs.reduce((a,m)=>a+(m.salaire_estime||0),0))} icon="€"/>
        <KPI label={t(lang,'ana.hours_month')} value={`${moisMs.reduce((a,m)=>a+(m.heures||0),0).toFixed(1)}h`} icon="⏱"/>
        <KPI label={t(lang,'ana.missions_month')} value={String(moisMs.length)} icon="📋"/>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:18 }}>
        <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:12, padding:20 }}>
          <h3 style={{ fontSize:14, fontWeight:700, color:'var(--text)', marginBottom:16 }}>{t(lang,'ana.monthly_evolution')}</h3>
          <div style={{ display:'flex', alignItems:'flex-end', gap:3, height:130, paddingBottom:18 }}>
            {evol.map((d,i)=>(
              <div key={i} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', height:'100%', justifyContent:'flex-end', gap:2 }}>
                <div style={{ width:'100%', borderRadius:'2px 2px 0 0', background:'#22d3ee', height:`${Math.max((d.revenus/maxRev)*110,d.revenus>0?3:0)}px`, minWidth:4, transition:'height .3s' }}/>
                <span style={{ fontSize:7, color:'var(--text-dim)', transform:'rotate(-45deg)', whiteSpace:'nowrap' }}>{d.label}</span>
              </div>
            ))}
          </div>
        </div>
        <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:12, padding:20 }}>
          <h3 style={{ fontSize:14, fontWeight:700, color:'var(--text)', marginBottom:16 }}>{t(lang,'ana.by_etab')}</h3>
          {etabStats.length===0 ? <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:120, color:'var(--text-dim)', fontSize:13 }}>—</div> : (
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center' }}>
              <svg width="130" height="130" viewBox="0 0 130 130">
                {(()=>{
                  let off=0; const circ=2*Math.PI*50
                  return etabStats.map((e,i)=>{
                    const pct=e.rev/totalRev, dash=pct*circ
                    const el=<circle key={e.id} cx="65" cy="65" r="50" fill="none" stroke={CYANS[i%CYANS.length]} strokeWidth="22" strokeDasharray={`${dash} ${circ-dash}`} strokeDashoffset={-off} transform="rotate(-90 65 65)"/>
                    off+=dash; return el
                  })
                })()}
                <circle cx="65" cy="65" r="39" fill="var(--bg-card)"/>
              </svg>
              <div style={{ width:'100%', marginTop:8 }}>
                {etabStats.map((e,i)=>(
                  <div key={e.id} style={{ display:'flex', alignItems:'center', gap:8, fontSize:12, marginBottom:3 }}>
                    <div style={{ width:10, height:10, borderRadius:2, background:CYANS[i%CYANS.length], flexShrink:0 }}/>
                    <span style={{ color:'var(--text-muted)' }}>{e.nom}</span>
                    <span style={{ marginLeft:'auto', color:'var(--text-dim)', fontSize:11 }}>{fmtEur(e.rev)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:12, padding:20 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
          <h3 style={{ fontSize:14, fontWeight:700, color:'var(--text)' }}>{t(lang,'ana.annual')}</h3>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <button onClick={()=>setAnneeSel(anneeSel-1)} style={{ width:24, height:24, borderRadius:6, border:'1px solid var(--border)', background:'transparent', color:'var(--text-muted)', cursor:'pointer', fontSize:12, display:'flex', alignItems:'center', justifyContent:'center' }}>‹</button>
            <span style={{ fontSize:13, fontWeight:600, color:'var(--text)' }}>{anneeSel}</span>
            <button onClick={()=>setAnneeSel(anneeSel+1)} style={{ width:24, height:24, borderRadius:6, border:'1px solid var(--border)', background:'transparent', color:'var(--text-muted)', cursor:'pointer', fontSize:12, display:'flex', alignItems:'center', justifyContent:'center' }}>›</button>
            {!isThisYear && <button onClick={()=>setAnneeSel(new Date().getFullYear())} style={{ padding:'3px 8px', borderRadius:6, border:`1px solid ${accent}`, background:'var(--accent-dim)', color:accent, cursor:'pointer', fontSize:10, fontWeight:600 }}>{t(lang,'gen.current_year')}</button>}
          </div>
        </div>
        <div style={{ display:'flex', gap:14, marginBottom:16 }}>
          <KPI label={t(lang,'ana.revenues_year')} value={fmtEur(anneeMs.reduce((a,m)=>a+(m.salaire_estime||0),0))} icon="€"/>
          <KPI label={t(lang,'ana.hours_year')} value={`${anneeMs.reduce((a,m)=>a+(m.heures||0),0).toFixed(1)}h`} icon="⏱"/>
          <KPI label={t(lang,'ana.missions_year')} value={String(anneeMs.length)} icon="📋"/>
        </div>
        <h4 style={{ fontSize:12, fontWeight:600, color:'var(--text-muted)', marginBottom:10 }}>Évolution mensuelle — {anneeSel}</h4>
        <div style={{ display:'flex', alignItems:'flex-end', gap:3, height:100, paddingBottom:18 }}>
          {evolAnnee.map((d,i)=>(
            <div key={i} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', height:'100%', justifyContent:'flex-end', gap:2 }}>
              <div style={{ width:'100%', borderRadius:'2px 2px 0 0', background:`linear-gradient(180deg,${accent},#7c3aed)`, height:`${Math.max((d.revenus/maxAnnee)*80,d.revenus>0?3:0)}px`, minWidth:4, transition:'height .3s' }}/>
              <span style={{ fontSize:7, color:'var(--text-dim)', transform:'rotate(-45deg)', whiteSpace:'nowrap' }}>{d.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
