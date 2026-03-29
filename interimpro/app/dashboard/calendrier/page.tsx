'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

type Mission = { id: string; titre: string; date_debut: string; etablissement_id: string; statut: string; heures: number }
type Etab = { id: string; nom: string }

const STATUT_COLOR: Record<string, string> = { a_venir: '#7c3aed', passee: '#0891b2', archive: '#9ca3af' }

export default function CalendrierPage() {
  const [missions, setMissions] = useState<Mission[]>([])
  const [etabs, setEtabs] = useState<Etab[]>([])
  const [cur, setCur] = useState(new Date())
  const supabase = createClient()

  useEffect(() => {
    const load = async () => {
      const [m, e] = await Promise.all([
        supabase.from('missions').select('*').order('date_debut'),
        supabase.from('etablissements').select('*'),
      ])
      setMissions((m.data || []) as Mission[])
      setEtabs((e.data || []) as Etab[])
    }
    load()
  }, [])

  const y = cur.getFullYear(), mo = cur.getMonth()
  const firstDay = (new Date(y, mo, 1).getDay() + 6) % 7
  const daysInMonth = new Date(y, mo + 1, 0).getDate()
  const days: (number | null)[] = []
  for (let i = 0; i < firstDay; i++) days.push(null)
  for (let i = 1; i <= daysInMonth; i++) days.push(i)
  while (days.length % 7 !== 0) days.push(null)

  const getMissions = (day: number) => {
    const s = `${y}-${String(mo + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    return missions.filter(m => m.date_debut?.startsWith(s))
  }
  const getEtab = (id: string) => etabs.find(e => e.id === id)
  const today = new Date()
  const isToday = (d: number) => d === today.getDate() && mo === today.getMonth() && y === today.getFullYear()
  const moisMissions = missions.filter(m => { const d = new Date(m.date_debut); return d.getMonth() === mo && d.getFullYear() === y })

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)' }}>Calendrier</h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>{moisMissions.length} mission(s) ce mois</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={() => setCur(new Date(y, mo - 1, 1))} style={{ padding: '7px 12px', borderRadius: 7, border: '1px solid var(--border)', background: 'white', cursor: 'pointer', fontSize: 16 }}>←</button>
          <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', minWidth: 160, textAlign: 'center', textTransform: 'capitalize' }}>
            {cur.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
          </span>
          <button onClick={() => setCur(new Date(y, mo + 1, 1))} style={{ padding: '7px 12px', borderRadius: 7, border: '1px solid var(--border)', background: 'white', cursor: 'pointer', fontSize: 16 }}>→</button>
          <button onClick={() => setCur(new Date())} style={{ padding: '7px 12px', borderRadius: 7, border: '1px solid var(--accent-border)', background: 'var(--accent-light)', color: 'var(--accent)', cursor: 'pointer', fontSize: 13, fontWeight: 600, marginLeft: 4 }}>Aujourd'hui</button>
        </div>
      </div>

      <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
        {/* En-têtes */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '1px solid var(--border)', background: 'var(--bg-primary)' }}>
          {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map(d => (
            <div key={d} style={{ textAlign: 'center', padding: '10px 4px', fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '.05em' }}>{d}</div>
          ))}
        </div>
        {/* Grille */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
          {days.map((day, i) => {
            if (!day) return <div key={i} style={{ minHeight: 90, borderRight: '1px solid var(--border)', borderBottom: '1px solid var(--border)', background: '#fafafa' }} />
            const dm = getMissions(day)
            const tday = isToday(day)
            return (
              <div key={i} style={{ minHeight: 90, borderRight: '1px solid var(--border)', borderBottom: '1px solid var(--border)', padding: 6, background: tday ? '#fdf4ff' : 'white' }}>
                <div style={{ width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', background: tday ? 'var(--accent)' : 'transparent', color: tday ? 'white' : 'var(--text-secondary)', fontSize: 12, fontWeight: tday ? 800 : 500, marginBottom: 4 }}>
                  {day}
                </div>
                {dm.map(m => {
                  const etab = getEtab(m.etablissement_id)
                  const color = STATUT_COLOR[m.statut] || '#9ca3af'
                  return (
                    <Link key={m.id} href="/dashboard/missions" style={{ display: 'block', padding: '2px 5px', borderRadius: 4, background: color + '15', borderLeft: `2px solid ${color}`, marginBottom: 2, textDecoration: 'none' }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.titre}</div>
                      {etab && <div style={{ fontSize: 9, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{etab.nom}</div>}
                    </Link>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>

      {/* Légende */}
      <div style={{ display: 'flex', gap: 16, marginTop: 12, justifyContent: 'center' }}>
        {[{ color: '#7c3aed', label: 'À venir' }, { color: '#0891b2', label: 'Passée' }, { color: '#9ca3af', label: 'Archivée' }].map(l => (
          <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: l.color }} />
            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{l.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
