'use client'
import { useState, useEffect } from 'react'
import { getSupabase } from '@/lib/supabase/client'
import { useTheme } from '@/lib/theme-context'
import { t } from '@/lib/i18n'

type Mission = { id:string; date_debut:string; heures:number; salaire_estime:number; etablissement_id:string; statut:string }
type Etab = { id:string; nom:string }

function BarChart({ data, color, unit='€', maxVal }: { data:{label:string;value:number}[]; color:string; unit?:string; maxVal?:number }) {
  const max = maxVal || Math.max(...data.map(d=>d.value), 1)
  const fmt = (v:number) => unit==='€' ? v.toLocaleString('fr-FR',{style:'currency',currency:'EUR',maximumFractionDigits:0}) : v.toFixed(1)+'h'
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
      {data.map((d,i)=>(
        <div key={i} style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:72, fontSize:11, color:'var(--text-dim)', textAlign:'right', flexShrink:0 }}>{d.label}</div>
          <div style={{ flex:1, height:22, background:'var(--bg-input)', borderRadius:100, overflow:'hidden' }}>
            <div style={{ height:'100%', width:`${Math.max((d.value/max)*100,d.value>0?2:0)}%`, background:`linear-gradient(90deg,${color},${color}cc)`, borderRadius:100, transition:'width .6s ease' }}/>
          </div>
          <div style={{ width:80, fontSize:12, fontWeight:700, color:'var(--text)', textAlign:'right', flexShrink:0 }}>{fmt(d.value)}</div>
        </div>
      ))}
    </div>
  )
}

export default function AnalysesPage() {
  const [missions, setMissions] = useState<Mission[]>([])
  const [etabs, setEtabs] = useState<Etab[]>([])
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string|null>(null)
  const { accent, lang, objectif } = useTheme()
  const fmtEur = (n:number) => n.toLocaleString('fr-FR',{style:'currency',currency:'EUR',minimumFractionDigits:0})

  useEffect(() => {
    getSupabase().auth.getSession().then(({ data }) => {
      if (data.session?.user?.id) setUserId(data.session.user.id)
    })
  }, [])

  useEffect(() => {
    if (!userId) return
    Promise.all([
      getSupabase().from('missions').select('*').eq('user_id',userId).neq('statut','archive'),
      getSupabase().from('etablissements').select('id,nom').eq('user_id',userId).eq('archived',false),
    ]).then(([m,e]) => {
      setMissions((m.data||[]) as Mission[])
      setEtabs((e.data||[]) as Etab[])
      setLoading(false)
    })
  }, [userId])

  const now = new Date()
  const months = Array.from({length:12},(_,i)=>{
    const d = new Date(now.getFullYear(), now.getMonth()-11+i, 1)
    return { label:d.toLocaleDateString('fr-FR',{month:'short',year:'2-digit'}), year:d.getFullYear(), month:d.getMonth() }
  })

  const revenueByMonth = months.map(m => ({
    label: m.label,
    value: missions.filter(mi => { const d=new Date(mi.date_debut); return d.getFullYear()===m.year&&d.getMonth()===m.month }).reduce((a,mi)=>a+(Number(mi.salaire_estime)||0),0)
  }))

  const hoursByEtab = etabs.map(e => ({
    label: e.nom.length>18 ? e.nom.slice(0,18)+'…' : e.nom,
    value: missions.filter(m=>m.etablissement_id===e.id).reduce((a,m)=>a+(Number(m.heures)||0),0)
  })).filter(e=>e.value>0).sort((a,b)=>b.value-a.value).slice(0,8)

  const currentMonthRevenue = revenueByMonth[11]?.value||0
  const prevMonthRevenue = revenueByMonth[10]?.value||0
  const currentMonthHours = months[11] ? missions.filter(mi=>{ const d=new Date(mi.date_debut); return d.getFullYear()===months[11].year&&d.getMonth()===months[11].month }).reduce((a,m)=>a+(Number(m.heures)||0),0) : 0
  const totalRevenue = missions.reduce((a,m)=>a+(Number(m.salaire_estime)||0),0)
  const totalHours = missions.reduce((a,m)=>a+(Number(m.heures)||0),0)
  const avgRate = totalHours>0 ? totalRevenue/totalHours : 0
  const bestMonth = [...revenueByMonth].sort((a,b)=>b.value-a.value)[0]
  const diff = currentMonthRevenue-prevMonthRevenue
  const pctObj = objectif>0 ? Math.round((currentMonthHours/objectif)*100) : 0

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'50vh' }}>
      <div style={{ width:32, height:32, borderRadius:'50%', border:`3px solid ${accent}30`, borderTop:`3px solid ${accent}`, animation:'spin .8s linear infinite' }}/>
      <style>{'@keyframes spin{to{transform:rotate(360deg)}}'}</style>
    </div>
  )

  if (missions.length===0) return (
    <div>
      <h1 style={{ fontSize:26, fontWeight:800, color:'var(--text)', marginBottom:22 }}>{t(lang,'analyses.title')}</h1>
      <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:12, padding:56, textAlign:'center', color:'var(--text-dim)' }}>
        <div style={{ fontSize:48, marginBottom:12 }}>📊</div>
        <div style={{ fontSize:15 }}>{t(lang,'analyses.no_data')}</div>
      </div>
    </div>
  )

  const C: React.CSSProperties = { background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:12, padding:22 }
  return (
    <div>
      <h1 style={{ fontSize:26, fontWeight:800, color:'var(--text)', marginBottom:22 }}>{t(lang,'analyses.title')}</h1>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, marginBottom:22 }}>
        {[
          { label:t(lang,'analyses.total_revenue'), value:fmtEur(totalRevenue), color:accent, icon:'💶' },
          { label:t(lang,'analyses.total_hours'), value:`${totalHours.toFixed(1)}h`, color:'#8b5cf6', icon:'⏱' },
          { label:t(lang,'analyses.avg_rate'), value:`${avgRate.toFixed(2)}€/h`, color:'#14b8a6', icon:'📈' },
          { label:t(lang,'analyses.total_missions'), value:String(missions.length), color:'#f59e0b', icon:'✅' },
        ].map(k=>(
          <div key={k.label} style={{ ...C, borderLeft:`3px solid ${k.color}` }}>
            <div style={{ fontSize:22, marginBottom:4 }}>{k.icon}</div>
            <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase' as const, letterSpacing:'.06em', color:'var(--text-dim)', marginBottom:6 }}>{k.label}</div>
            <div style={{ fontSize:22, fontWeight:800, color:'var(--text)' }}>{k.value}</div>
          </div>
        ))}
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:14, marginBottom:22 }}>
        <div style={C}>
          <div style={{ fontSize:12, fontWeight:700, color:'var(--text-muted)', marginBottom:8 }}>Mois actuel</div>
          <div style={{ fontSize:26, fontWeight:800, color:'var(--text)', marginBottom:4 }}>{fmtEur(currentMonthRevenue)}</div>
          <div style={{ fontSize:12, color:diff>=0?'#10b981':'#ef4444', fontWeight:600 }}>{diff>=0?'↑':'↓'} {fmtEur(Math.abs(diff))} {t(lang,'analyses.vs_prev')}</div>
        </div>
        <div style={C}>
          <div style={{ fontSize:12, fontWeight:700, color:'var(--text-muted)', marginBottom:8 }}>{t(lang,'analyses.best_month')}</div>
          <div style={{ fontSize:22, fontWeight:800, color:'var(--text)', marginBottom:2 }}>{fmtEur(bestMonth?.value||0)}</div>
          <div style={{ fontSize:12, color:'var(--text-dim)' }}>{bestMonth?.label||'—'}</div>
        </div>
        <div style={C}>
          <div style={{ fontSize:12, fontWeight:700, color:'var(--text-muted)', marginBottom:8 }}>{t(lang,'dashboard.objective')} ({objectif}h)</div>
          <div style={{ fontSize:22, fontWeight:800, color:'var(--text)', marginBottom:6 }}>{pctObj}%</div>
          <div style={{ height:7, background:'var(--bg-input)', borderRadius:100, overflow:'hidden' }}>
            <div style={{ height:'100%', width:`${Math.min(pctObj,100)}%`, background:`linear-gradient(90deg,${accent},#8b5cf6)`, borderRadius:100 }}/>
          </div>
          <div style={{ fontSize:11, color:'var(--text-dim)', marginTop:4 }}>{currentMonthHours.toFixed(1)}h / {objectif}h</div>
        </div>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
        <div style={C}>
          <h3 style={{ fontSize:14, fontWeight:700, color:'var(--text)', marginBottom:16 }}>{t(lang,'analyses.revenue_month')}</h3>
          <BarChart data={revenueByMonth} color={accent} unit="€"/>
        </div>
        <div style={C}>
          <h3 style={{ fontSize:14, fontWeight:700, color:'var(--text)', marginBottom:16 }}>{t(lang,'analyses.by_etab')} — heures</h3>
          {hoursByEtab.length>0 ? <BarChart data={hoursByEtab} color="#8b5cf6" unit="h"/> : <div style={{ color:'var(--text-dim)', fontSize:13 }}>{t(lang,'analyses.no_data')}</div>}
        </div>
      </div>
      <style>{'@keyframes spin{to{transform:rotate(360deg)}}'}</style>
    </div>
  )
}
