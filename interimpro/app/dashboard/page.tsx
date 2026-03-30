'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useTheme } from '@/lib/theme-context'
import { t } from '@/lib/i18n'

type Mission = { id:string; titre:string; etablissement_id:string; date_debut:string; statut:string; heures:number; salaire_estime:number; contrat_signe:boolean; fiche_paie_recue:boolean; salaire_recu:boolean }
type Etab = { id:string; nom:string }

export default function DashboardPage() {
  const [missions, setMissions] = useState<Mission[]>([])
  const [etabs, setEtabs] = useState<Etab[]>([])
  const [mois, setMois] = useState(new Date())
  const [loading, setLoading] = useState(true)
  const supabase = createClient()
  const { accent, lang, objectif, userId } = useTheme()

  useEffect(() => {
    if (!userId) return
    const load = async () => {
      const [m, e] = await Promise.all([
        supabase.from('missions').select('*').eq('user_id',userId).order('date_debut',{ascending:false}),
        supabase.from('etablissements').select('id,nom').eq('user_id',userId).eq('archived',false),
      ])
      setMissions((m.data||[]) as Mission[])
      setEtabs((e.data||[]) as Etab[])
      setLoading(false)
    }
    load()
  }, [userId])

  const mD = new Date(mois.getFullYear(), mois.getMonth(), 1).toISOString()
  const mF = new Date(mois.getFullYear(), mois.getMonth()+1, 0, 23,59,59).toISOString()
  const pD = new Date(mois.getFullYear(), mois.getMonth()-1, 1).toISOString()
  const pF = new Date(mois.getFullYear(), mois.getMonth(), 0, 23,59,59).toISOString()
  const moisMs = missions.filter(m=>m.date_debut>=mD&&m.date_debut<=mF)
  const prevMs = missions.filter(m=>m.date_debut>=pD&&m.date_debut<=pF)
  const revenus = moisMs.reduce((a,m)=>a+(m.salaire_estime||0),0)
  const prevRev = prevMs.reduce((a,m)=>a+(m.salaire_estime||0),0)
  const heures = moisMs.reduce((a,m)=>a+(m.heures||0),0)
  const prevH = prevMs.reduce((a,m)=>a+(m.heures||0),0)
  const pct = Math.round((heures/(objectif||152))*100)
  const fmtEur = (n:number) => n.toLocaleString('fr-FR',{style:'currency',currency:'EUR',minimumFractionDigits:2})
  const fmtDate = (d:string) => new Date(d).toLocaleDateString('fr-FR',{day:'numeric',month:'long',year:'numeric'})
  const getEtab = (id:string) => etabs.find(e=>e.id===id)
  const avenir = missions.filter(m=>m.statut==='a_venir').sort((a,b)=>a.date_debut.localeCompare(b.date_debut))
  const passees = missions.filter(m=>m.statut==='passee').sort((a,b)=>b.date_debut.localeCompare(a.date_debut))
  const isThisMonth = mois.getMonth()===new Date().getMonth()&&mois.getFullYear()===new Date().getFullYear()
  const moisLabel = mois.toLocaleDateString('fr-FR',{month:'long',year:'numeric'}).replace(/^\w/,c=>c.toUpperCase())

  if (loading) return <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'50vh' }}><div style={{ width:36, height:36, borderRadius:'50%', border:`3px solid var(--accent-dim)`, borderTop:`3px solid ${accent}`, animation:'spin .8s linear infinite' }}/></div>

  return (
    <div>
      <div style={{ marginBottom:22 }}>
        <h1 style={{ fontSize:24, fontWeight:800, color:'var(--text)', marginBottom:2 }}>{t(lang,'dash.title')}</h1>
        <p style={{ fontSize:13, color:'var(--text-dim)' }}>{t(lang,'dash.subtitle')}</p>
      </div>

      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:22 }}>
        <button onClick={()=>setMois(new Date(mois.getFullYear(),mois.getMonth()-1,1))} style={{ width:28, height:28, borderRadius:7, border:'1px solid var(--border)', background:'var(--bg-card)', color:'var(--text-muted)', cursor:'pointer', fontSize:14, display:'flex', alignItems:'center', justifyContent:'center' }}>‹</button>
        <span style={{ fontSize:14, fontWeight:600, color:'var(--text)', minWidth:120, textAlign:'center' }}>{moisLabel}</span>
        <button onClick={()=>setMois(new Date(mois.getFullYear(),mois.getMonth()+1,1))} style={{ width:28, height:28, borderRadius:7, border:'1px solid var(--border)', background:'var(--bg-card)', color:'var(--text-muted)', cursor:'pointer', fontSize:14, display:'flex', alignItems:'center', justifyContent:'center' }}>›</button>
        {!isThisMonth && <button onClick={()=>setMois(new Date())} style={{ padding:'4px 10px', borderRadius:7, border:`1px solid ${accent}`, background:'var(--accent-dim)', color:accent, cursor:'pointer', fontSize:11, fontWeight:600 }}>{t(lang,'gen.current_month')}</button>}
      </div>

      {/* KPIs */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:14, marginBottom:24 }}>
        {[
          { label:t(lang,'dash.revenues'), value:fmtEur(revenus), sub:`↗ ${fmtEur(Math.abs(revenus-prevRev))} ${t(lang,'dash.vs_prev')}`, color:'#e879f9', border:accent, icon:'€' },
          { label:t(lang,'dash.hours'), value:`${heures.toFixed(1)}h`, sub:`↗ ${Math.abs(heures-prevH).toFixed(1)}h ${t(lang,'dash.vs_prev')}`, color:'#a78bfa', border:'#8b5cf6', icon:'⏱' },
          { label:t(lang,'dash.objective'), value:`${pct}%`, sub:null, color:null, border:'#6366f1', icon:'🎯' },
        ].map(kpi=>(
          <div key={kpi.label} style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderLeft:`3px solid ${kpi.border}`, borderRadius:10, padding:'16px 18px' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:10 }}>
              <span style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'.08em', color:'var(--text-dim)' }}>{kpi.label}</span>
              <div style={{ width:30, height:30, borderRadius:8, background:'var(--bg-input)', border:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14 }}>{kpi.icon}</div>
            </div>
            <div style={{ fontSize:24, fontWeight:800, color:'var(--text)', marginBottom:kpi.sub?4:6 }}>{kpi.value}</div>
            {kpi.sub ? <div style={{ fontSize:12, color:kpi.color||'var(--text-dim)' }}>{kpi.sub}</div> : (
              <div>
                <div style={{ fontSize:11, color:'var(--text-dim)', marginBottom:5 }}>{heures.toFixed(1)}h / {objectif||152}h</div>
                <div style={{ height:4, background:'var(--bg-input)', borderRadius:100, overflow:'hidden' }}>
                  <div style={{ height:'100%', width:`${Math.min(pct,100)}%`, background:`linear-gradient(90deg,${accent},#8b5cf6)`, borderRadius:100, transition:'width .5s' }}/>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Missions */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
        <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:12, padding:20 }}>
          <h3 style={{ fontSize:14, fontWeight:700, color:'var(--text)', marginBottom:14 }}>{t(lang,'dash.upcoming')}</h3>
          {avenir.length===0 ? (
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center', padding:'28px 0', color:'var(--text-dim)' }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ marginBottom:8, opacity:.5 }}><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              <p style={{ fontSize:13 }}>{t(lang,'dash.no_upcoming')}</p>
            </div>
          ) : avenir.slice(0,4).map(m=>{
            const etab = getEtab(m.etablissement_id)
            return <div key={m.id} style={{ padding:'10px 12px', borderRadius:8, background:'var(--bg-input)', marginBottom:6 }}>
              <div style={{ fontSize:13, fontWeight:700, color:'var(--text)', marginBottom:2 }}>{m.titre}</div>
              <div style={{ fontSize:12, color:'var(--text-dim)' }}>{etab?.nom}</div>
              <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:2 }}>📅 {fmtDate(m.date_debut)} · {m.heures}h</div>
            </div>
          })}
        </div>
        <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:12, padding:20 }}>
          <h3 style={{ fontSize:14, fontWeight:700, color:'var(--text)', marginBottom:14 }}>{t(lang,'dash.recent')}</h3>
          {passees.length===0 ? <div style={{ textAlign:'center', padding:'28px 0', color:'var(--text-dim)', fontSize:13 }}>—</div>
          : passees.slice(0,4).map(m=>{
            const etab = getEtab(m.etablissement_id)
            return <div key={m.id} style={{ padding:'10px 12px', borderRadius:8, background:'var(--bg-input)', marginBottom:6 }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:3 }}>
                <div><div style={{ fontSize:13, fontWeight:700, color:'var(--text)' }}>{m.titre}</div><div style={{ fontSize:12, color:'var(--text-dim)' }}>{etab?.nom}</div></div>
                <span style={{ fontSize:13, fontWeight:700, color:accent }}>{fmtEur(m.salaire_estime)}</span>
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <div style={{ fontSize:11, color:'var(--text-muted)' }}>📅 {fmtDate(m.date_debut)} · {m.heures}h</div>
                <div style={{ display:'flex', gap:4 }}>
                  {[m.contrat_signe, m.fiche_paie_recue, m.salaire_recu].map((v,i)=>(
                    <span key={i} style={{ fontSize:13, opacity:v?1:.2 }}>{['📄','💳','✓'][i]}</span>
                  ))}
                </div>
              </div>
            </div>
          })}
          {passees.length>0 && <div style={{ marginTop:8 }}><Link href="/dashboard/missions" style={{ fontSize:13, color:accent, textDecoration:'none', fontWeight:600 }}>{t(lang,'dash.see_all')} →</Link></div>}
        </div>
      </div>
    </div>
  )
}
