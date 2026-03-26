'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function AnalysesPage() {
  const [missions, setMissions] = useState<any[]>([])
  const [etabs, setEtabs] = useState<any[]>([])
  const [periode, setPeriode] = useState('6m')
  const supabase = createClient()

  useEffect(() => {
    const load = async () => {
      const [m, e] = await Promise.all([
        supabase.from('missions').select('*').order('date_debut'),
        supabase.from('etablissements').select('*')
      ])
      setMissions(m.data || []); setEtabs(e.data || [])
    }
    load()
  }, [])

  const now = new Date()
  const nb = periode === '3m' ? 3 : periode === '6m' ? 6 : 12
  const moisLabels: string[] = [], moisData: any[] = []
  for (let i = nb-1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth()-i, 1)
    moisLabels.push(d.toLocaleDateString('fr-FR',{month:'short',year:'2-digit'}))
    const debut = new Date(d.getFullYear(),d.getMonth(),1).toISOString()
    const fin = new Date(d.getFullYear(),d.getMonth()+1,0).toISOString()
    const ms = missions.filter(x => x.date_debut >= debut && x.date_debut <= fin)
    moisData.push({ revenus: ms.reduce((a,x)=>a+(x.salaire_estime||0),0), heures: ms.reduce((a,x)=>a+(x.heures||0),0), count: ms.length })
  }

  const maxRev = Math.max(...moisData.map(m=>m.revenus), 1)
  const maxH = Math.max(...moisData.map(m=>m.heures), 1)
  const fmtEur = (n: number) => n.toLocaleString('fr-FR',{style:'currency',currency:'EUR',maximumFractionDigits:0})
  const totalRev = missions.reduce((a,m)=>a+(m.salaire_estime||0),0)
  const totalH = missions.reduce((a,m)=>a+(m.heures||0),0)
  const txContrat = missions.length > 0 ? (missions.filter(m=>m.contrat_signe).length/missions.length*100).toFixed(0) : 0
  const passees = missions.filter(m=>m.statut==='passee')
  const txFiche = passees.length > 0 ? (missions.filter(m=>m.fiche_paie_recue).length/passees.length*100).toFixed(0) : 0

  const topEtabs = etabs.map(e => {
    const ms = missions.filter(x=>x.etablissement_id===e.id)
    return { ...e, count:ms.length, heures:ms.reduce((a,x)=>a+(x.heures||0),0), revenus:ms.reduce((a,x)=>a+(x.salaire_estime||0),0) }
  }).sort((a,b)=>b.revenus-a.revenus).slice(0,5)

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px' }}>
        <div>
          <h1 style={{ fontSize:'22px', fontWeight:800, color:'var(--text-primary)', marginBottom:'2px' }}>Analyses</h1>
          <p style={{ fontSize:'13px', color:'var(--text-secondary)' }}>Vue d'ensemble de votre activite</p>
        </div>
        <div style={{ display:'flex', gap:'6px' }}>
          {['3m','6m','12m'].map(p => (
            <button key={p} onClick={() => setPeriode(p)} style={{ padding:'7px 12px', borderRadius:'7px', border:'1px solid var(--border)', background:periode===p?'var(--accent)':'white', color:periode===p?'white':'var(--text-secondary)', cursor:'pointer', fontSize:'13px', fontWeight:periode===p?600:400 }}>{p}</button>
          ))}
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(180px, 1fr))', gap:'12px', marginBottom:'20px' }}>
        {[
          {label:'Revenus totaux',value:fmtEur(totalRev),color:'#e87bf9'},
          {label:'Heures totales',value:totalH.toFixed(0)+'h',color:'#818cf8'},
          {label:'Taux contrats',value:txContrat+'%',color:'#34d399'},
          {label:'Taux fiches paie',value:txFiche+'%',color:'#fb923c'},
        ].map((k,i) => (
          <div key={i} style={{ background:'white', border:'1px solid var(--border)', borderLeft:`3px solid ${k.color}`, borderRadius:'10px', padding:'16px' }}>
            <div style={{ fontSize:'11px', color:'var(--text-secondary)', textTransform:'uppercase', letterSpacing:'0.06em', fontWeight:600, marginBottom:'8px' }}>{k.label}</div>
            <div style={{ fontSize:'22px', fontWeight:800, color:'var(--text-primary)' }}>{k.value}</div>
          </div>
        ))}
      </div>

      <div style={{ background:'white', border:'1px solid var(--border)', borderRadius:'12px', padding:'20px', marginBottom:'16px' }}>
        <h3 style={{ fontSize:'14px', fontWeight:700, color:'var(--text-primary)', marginBottom:'16px' }}>Revenus par mois</h3>
        <div style={{ display:'flex', alignItems:'flex-end', gap:'6px', height:'140px' }}>
          {moisData.map((m,i) => (
            <div key={i} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:'4px', height:'100%', justifyContent:'flex-end' }}>
              {m.revenus > 0 && <span style={{ fontSize:'9px', color:'var(--text-secondary)', fontWeight:600 }}>{fmtEur(m.revenus).replace(' €','')}</span>}
              <div style={{ width:'100%', borderRadius:'4px 4px 0 0', background:'linear-gradient(180deg,#e87bf9,#a855f7)', height:`${Math.max((m.revenus/maxRev)*110, m.revenus>0?4:0)}px`, transition:'height 0.4s' }} />
              <span style={{ fontSize:'9px', color:'var(--text-secondary)' }}>{moisLabels[i]}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ background:'white', border:'1px solid var(--border)', borderRadius:'12px', padding:'20px', marginBottom:'16px' }}>
        <h3 style={{ fontSize:'14px', fontWeight:700, color:'var(--text-primary)', marginBottom:'16px' }}>Heures par mois</h3>
        <div style={{ display:'flex', alignItems:'flex-end', gap:'6px', height:'100px' }}>
          {moisData.map((m,i) => (
            <div key={i} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:'4px', height:'100%', justifyContent:'flex-end' }}>
              {m.heures > 0 && <span style={{ fontSize:'9px', color:'var(--text-secondary)' }}>{m.heures.toFixed(0)}h</span>}
              <div style={{ width:'100%', borderRadius:'4px 4px 0 0', background:'#818cf8', height:`${Math.max((m.heures/maxH)*80, m.heures>0?4:0)}px` }} />
              <span style={{ fontSize:'9px', color:'var(--text-secondary)' }}>{moisLabels[i]}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ background:'white', border:'1px solid var(--border)', borderRadius:'12px', padding:'20px' }}>
        <h3 style={{ fontSize:'14px', fontWeight:700, color:'var(--text-primary)', marginBottom:'14px' }}>Top etablissements</h3>
        {topEtabs.length === 0 ? <p style={{ color:'var(--text-secondary)', fontSize:'14px' }}>Aucune donnee</p> : (
          <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
            {topEtabs.map((e,i) => (
              <div key={e.id} style={{ display:'flex', alignItems:'center', gap:'12px', padding:'10px 12px', borderRadius:'8px', background:'var(--bg-primary)' }}>
                <span style={{ fontSize:'16px', fontWeight:800, color:'var(--text-secondary)', minWidth:'24px' }}>#{i+1}</span>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:'13px', fontWeight:600, color:'var(--text-primary)' }}>{e.nom}</div>
                  <div style={{ fontSize:'11px', color:'var(--text-secondary)' }}>{e.count} mission{e.count>1?'s':''} · {e.heures.toFixed(0)}h</div>
                </div>
                <div style={{ fontSize:'13px', fontWeight:700, color:'#16a34a' }}>{fmtEur(e.revenus)}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
