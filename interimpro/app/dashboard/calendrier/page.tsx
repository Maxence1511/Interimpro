'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export default function CalendrierPage() {
  const [missions, setMissions] = useState<any[]>([])
  const [etabs, setEtabs] = useState<any[]>([])
  const [current, setCurrent] = useState(new Date())
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

  const year = current.getFullYear(), month = current.getMonth()
  const firstDay = (new Date(year, month, 1).getDay() + 6) % 7
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const days: (number|null)[] = []
  for (let i = 0; i < firstDay; i++) days.push(null)
  for (let i = 1; i <= daysInMonth; i++) days.push(i)
  while (days.length % 7 !== 0) days.push(null)

  const getDayMissions = (day: number) => {
    const s = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`
    return missions.filter(m => m.date_debut?.startsWith(s))
  }
  const getEtab = (id: string) => etabs.find(e => e.id === id)
  const isToday = (day: number) => { const t = new Date(); return day === t.getDate() && month === t.getMonth() && year === t.getFullYear() }
  const moisMissions = missions.filter(m => { const d = new Date(m.date_debut); return d.getMonth() === month && d.getFullYear() === year })
  const STATUT_COLOR: Record<string,string> = { a_venir:'#e87bf9', passee:'#818cf8', archive:'#94a3b8' }

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px' }}>
        <div>
          <h1 style={{ fontSize:'22px', fontWeight:800, color:'var(--text-primary)', marginBottom:'2px' }}>Calendrier</h1>
          <p style={{ fontSize:'13px', color:'var(--text-secondary)' }}>{moisMissions.length} mission{moisMissions.length>1?'s':''} ce mois</p>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
          <button onClick={() => setCurrent(new Date(year, month-1, 1))} style={{ padding:'7px 12px', borderRadius:'7px', border:'1px solid var(--border)', background:'white', cursor:'pointer', fontSize:'16px' }}>←</button>
          <span style={{ fontSize:'15px', fontWeight:700, color:'var(--text-primary)', minWidth:'160px', textAlign:'center', textTransform:'capitalize' }}>
            {current.toLocaleDateString('fr-FR',{month:'long',year:'numeric'})}
          </span>
          <button onClick={() => setCurrent(new Date(year, month+1, 1))} style={{ padding:'7px 12px', borderRadius:'7px', border:'1px solid var(--border)', background:'white', cursor:'pointer', fontSize:'16px' }}>→</button>
          <button onClick={() => setCurrent(new Date())} style={{ padding:'7px 12px', borderRadius:'7px', border:'1px solid rgba(232,123,249,0.3)', background:'rgba(232,123,249,0.08)', color:'var(--accent)', cursor:'pointer', fontSize:'13px', fontWeight:500, marginLeft:'4px' }}>Aujourd'hui</button>
        </div>
      </div>

      <div style={{ background:'white', border:'1px solid var(--border)', borderRadius:'12px', overflow:'hidden' }}>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(7, 1fr)', borderBottom:'1px solid var(--border)' }}>
          {['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'].map(d => (
            <div key={d} style={{ textAlign:'center', padding:'12px 8px', fontSize:'12px', fontWeight:600, color:'var(--text-secondary)', textTransform:'uppercase', letterSpacing:'0.05em' }}>{d}</div>
          ))}
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(7, 1fr)' }}>
          {days.map((day, i) => {
            if (!day) return <div key={i} style={{ minHeight:'90px', borderRight:'1px solid var(--border)', borderBottom:'1px solid var(--border)', background:'#fafafa' }} />
            const dm = getDayMissions(day)
            const today = isToday(day)
            return (
              <div key={i} style={{ minHeight:'90px', borderRight:'1px solid var(--border)', borderBottom:'1px solid var(--border)', padding:'8px', background: today ? 'rgba(232,123,249,0.04)' : 'white' }}>
                <div style={{ fontSize:'13px', fontWeight: today ? 800 : 500, color: today ? 'var(--accent)' : 'var(--text-secondary)', marginBottom:'4px', width:'24px', height:'24px', display:'flex', alignItems:'center', justifyContent:'center', borderRadius:'50%', background: today ? 'rgba(232,123,249,0.15)' : 'transparent' }}>{day}</div>
                {dm.map(m => {
                  const etab = getEtab(m.etablissement_id)
                  const color = STATUT_COLOR[m.statut] || '#94a3b8'
                  return (
                    <Link key={m.id} href="/dashboard/missions" style={{ display:'block', padding:'3px 6px', borderRadius:'4px', background:color+'18', borderLeft:`2px solid ${color}`, marginBottom:'3px', textDecoration:'none' }}>
                      <div style={{ fontSize:'11px', fontWeight:600, color, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{m.titre}</div>
                      {etab && <div style={{ fontSize:'10px', color:'var(--text-secondary)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{etab.nom}</div>}
                    </Link>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>

      <div style={{ display:'flex', gap:'14px', marginTop:'14px', justifyContent:'center' }}>
        {[{color:'#e87bf9',label:'A venir'},{color:'#818cf8',label:'Passee'},{color:'#94a3b8',label:'Archivee'}].map(l => (
          <div key={l.label} style={{ display:'flex', alignItems:'center', gap:'6px' }}>
            <div style={{ width:'10px', height:'10px', borderRadius:'2px', background:l.color }} />
            <span style={{ fontSize:'12px', color:'var(--text-secondary)' }}>{l.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
