'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useTheme } from '@/lib/theme-context'
import { t } from '@/lib/i18n'

type Mission = { id:string; titre:string; etablissement_id:string; date_debut:string; date_fin:string; statut:string; heures:number; salaire_estime:number; contrat_signe:boolean; fiche_paie_recue:boolean; salaire_recu:boolean }
type Etab = { id:string; nom:string }

function KpiCard({ label, value, icon, sub, color, bar }:{ label:string; value:string; icon:string; sub?:string; color?:string; bar?:number }) {
  const { accent } = useTheme()
  return (
    <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:12, padding:'18px 20px', borderLeft:`3px solid ${color||accent}` }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:12 }}>
        <span style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'.1em', color:'var(--text-dim)' }}>{label}</span>
        <span style={{ fontSize:20 }}>{icon}</span>
      </div>
      <div style={{ fontSize:26, fontWeight:800, color:'var(--text)', marginBottom:sub||bar!==undefined?6:0 }}>{value}</div>
      {sub && <div style={{ fontSize:12, color:color||accent }}>{sub}</div>}
      {bar!==undefined && (
        <div>
          <div style={{ fontSize:11, color:'var(--text-dim)', marginBottom:4 }}>{bar}% de l'objectif</div>
          <div style={{ height:4, background:'var(--bg-input)', borderRadius:100, overflow:'hidden' }}>
            <div style={{ height:'100%', width:`${Math.min(bar,100)}%`, background:`linear-gradient(90deg,${accent},#8b5cf6)`, borderRadius:100, transition:'width .5s' }}/>
          </div>
        </div>
      )}
    </div>
  )
}

export default function DashboardPage() {
  const [missions, setMissions] = useState<Mission[]>([])
  const [etabs, setEtabs] = useState<Etab[]>([])
  const [mois, setMois] = useState(new Date())
  const [loading, setLoading] = useState(true)
  const supabase = createClient()
  const { accent, lang, objectif, userId } = useTheme()

  useEffect(() => {
    if (!userId) return
    Promise.all([
      supabase.from('missions').select('*').eq('user_id',userId).order('date_debut',{ascending:false}),
      supabase.from('etablissements').select('id,nom').eq('user_id',userId).eq('archived',false),
    ]).then(([m,e]) => {
      setMissions((m.data||[]) as Mission[])
      setEtabs((e.data||[]) as Etab[])
      setLoading(false)
    })
  }, [userId])

  const y=mois.getFullYear(), mo=mois.getMonth()
  const mD = new Date(y,mo,1).toISOString()
  const mF = new Date(y,mo+1,0,23,59,59).toISOString()
  const pD = new Date(y,mo-1,1).toISOString()
  const pF = new Date(y,mo,0,23,59,59).toISOString()
  const moisMs = missions.filter(m=>m.date_debut>=mD&&m.date_debut<=mF)
  const prevMs = missions.filter(m=>m.date_debut>=pD&&m.date_debut<=pF)
  const revenus = moisMs.reduce((a,m)=>a+(m.salaire_estime||0),0)
  const prevRev = prevMs.reduce((a,m)=>a+(m.salaire_estime||0),0)
  const heures = moisMs.reduce((a,m)=>a+(m.heures||0),0)
  const pct = Math.round((heures/(objectif||152))*100)
  const fmtEur = (n:number) => n.toLocaleString('fr-FR',{style:'currency',currency:'EUR',minimumFractionDigits:2})
  const fmtDate = (d:string) => new Date(d).toLocaleDateString('fr-FR',{day:'numeric',month:'short'})
  const getEtab = (id:string) => etabs.find(e=>e.id===id)
  const avenir = missions.filter(m=>m.statut==='a_venir').sort((a,b)=>a.date_debut.localeCompare(b.date_debut))
  const passees = missions.filter(m=>m.statut==='passee').sort((a,b)=>b.date_debut.localeCompare(a.date_debut))
  const isThisMonth = mo===new Date().getMonth()&&y===new Date().getFullYear()
  const moisLabel = mois.toLocaleDateString('fr-FR',{month:'long',year:'numeric'}).replace(/^\w/,c=>c.toUpperCase())

  if (loading) return <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'50vh' }}><div style={{ width:36, height:36, borderRadius:'50%', border:`3px solid var(--accent-dim)`, borderTop:`3px solid ${accent}`, animation:'spin .8s linear infinite' }}/></div>

  return (
    <div>
      <div style={{ marginBottom:22 }}>
        <h1 style={{ fontSize:24, fontWeight:800, color:'var(--text)', marginBottom:4 }}>Tableau de bord</h1>
        <p style={{ fontSize:13, color:'var(--text-dim)' }}>Votre activité d'intérimaire médical en un coup d'œil</p>
      </div>

      {/* Sélecteur de mois */}
      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:22 }}>
        <button onClick={()=>setMois(new Date(y,mo-1,1))} style={{ width:30, height:30, borderRadius:8, border:'1px solid var(--border)', background:'var(--bg-card)', color:'var(--text-muted)', cursor:'pointer', fontSize:16, display:'flex', alignItems:'center', justifyContent:'center' }}>‹</button>
        <span style={{ fontSize:14, fontWeight:600, color:'var(--text)', minWidth:130, textAlign:'center' }}>{moisLabel}</span>
        <button onClick={()=>setMois(new Date(y,mo+1,1))} style={{ width:30, height:30, borderRadius:8, border:'1px solid var(--border)', background:'var(--bg-card)', color:'var(--text-muted)', cursor:'pointer', fontSize:16, display:'flex', alignItems:'center', justifyContent:'center' }}>›</button>
        {!isThisMonth && <button onClick={()=>setMois(new Date())} style={{ padding:'5px 12px', borderRadius:7, border:`1px solid ${accent}`, background:'var(--accent-dim)', color:accent, cursor:'pointer', fontSize:12, fontWeight:600 }}>Mois actuel</button>}
      </div>

      {/* KPIs */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:14, marginBottom:24 }}>
        <KpiCard label="Revenus du mois" value={fmtEur(revenus)} icon="💰" color={accent} sub={`${revenus>=prevRev?'↑':'↓'} ${fmtEur(Math.abs(revenus-prevRev))} vs mois préc.`}/>
        <KpiCard label="Heures du mois" value={`${heures.toFixed(1)}h`} icon="⏱️" color="#8b5cf6" sub={`${moisMs.length} mission${moisMs.length>1?'s':''} ce mois`}/>
        <KpiCard label="Objectif mensuel" value={`${pct}%`} icon="🎯" color="#14b8a6" bar={pct}/>
      </div>

      {/* Listes missions */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
        {/* À venir */}
        <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:12, padding:20 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
            <h3 style={{ fontSize:14, fontWeight:700, color:'var(--text)' }}>🗓️ Prochaines missions</h3>
            <span style={{ fontSize:12, color:'var(--text-dim)' }}>{avenir.length} à venir</span>
          </div>
          {avenir.length===0 ? (
            <div style={{ padding:'28px 0', textAlign:'center' }}>
              <div style={{ fontSize:36, marginBottom:8 }}>📅</div>
              <p style={{ fontSize:13, color:'var(--text-dim)' }}>Aucune mission à venir</p>
              <Link href="/dashboard/missions" style={{ color:accent, fontSize:13, fontWeight:600, textDecoration:'none' }}>+ Ajouter une mission</Link>
            </div>
          ) : avenir.slice(0,5).map(m=>{
            const etab = getEtab(m.etablissement_id)
            const debut = m.date_debut?.split('T')[1]?.slice(0,5)||''
            const fin = m.date_fin?.split('T')[1]?.slice(0,5)||''
            return (
              <div key={m.id} style={{ padding:'11px 14px', borderRadius:9, background:'var(--bg-input)', marginBottom:6, borderLeft:`3px solid ${accent}` }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:3 }}>
                  <span style={{ fontSize:13, fontWeight:700, color:'var(--text)' }}>{m.titre}</span>
                  <span style={{ fontSize:12, color:accent, fontWeight:600 }}>{m.heures}h</span>
                </div>
                <div style={{ fontSize:12, color:'var(--text-muted)' }}>{etab?.nom}</div>
                <div style={{ fontSize:11, color:'var(--text-dim)', marginTop:2 }}>📅 {fmtDate(m.date_debut)} {debut&&fin?`· ${debut}–${fin}`:''}</div>
              </div>
            )
          })}
          {avenir.length>5 && <Link href="/dashboard/missions" style={{ display:'block', textAlign:'center', fontSize:12, color:accent, textDecoration:'none', marginTop:8, fontWeight:600 }}>Voir toutes →</Link>}
        </div>

        {/* Récentes */}
        <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:12, padding:20 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
            <h3 style={{ fontSize:14, fontWeight:700, color:'var(--text)' }}>✅ Dernières missions</h3>
            <Link href="/dashboard/missions" style={{ fontSize:12, color:accent, textDecoration:'none', fontWeight:600 }}>Voir tout →</Link>
          </div>
          {passees.length===0 ? (
            <div style={{ padding:'28px 0', textAlign:'center' }}>
              <div style={{ fontSize:36, marginBottom:8 }}>📋</div>
              <p style={{ fontSize:13, color:'var(--text-dim)' }}>Aucune mission réalisée</p>
            </div>
          ) : passees.slice(0,5).map(m=>{
            const etab = getEtab(m.etablissement_id)
            const docs = [
              { f:m.contrat_signe, l:'📄', t:'Contrat' },
              { f:m.fiche_paie_recue, l:'💳', t:'Fiche de paie' },
              { f:m.salaire_recu, l:'✓', t:'Salaire' },
            ]
            return (
              <div key={m.id} style={{ padding:'11px 14px', borderRadius:9, background:'var(--bg-input)', marginBottom:6 }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:2 }}>
                  <span style={{ fontSize:13, fontWeight:700, color:'var(--text)' }}>{m.titre}</span>
                  <span style={{ fontSize:13, fontWeight:700, color:accent }}>{fmtEur(m.salaire_estime)}</span>
                </div>
                <div style={{ fontSize:12, color:'var(--text-muted)', marginBottom:4 }}>{etab?.nom} · {fmtDate(m.date_debut)}</div>
                <div style={{ display:'flex', gap:6 }}>
                  {docs.map(d=>(
                    <span key={d.t} title={d.t} style={{ padding:'1px 8px', borderRadius:100, fontSize:10, background:d.f?'var(--accent-dim)':'var(--bg-hover)', color:d.f?accent:'var(--text-dim)', border:`1px solid ${d.f?'var(--accent-border)':'var(--border)'}`, fontWeight:600 }}>{d.l} {d.t}</span>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
