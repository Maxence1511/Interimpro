'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

type Etab = { id: string; nom: string; taux_horaire: number }

export default function ImportGCalPage() {
  const [etabs, setEtabs] = useState<Etab[]>([])
  const [lastSync, setLastSync] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      const [e, sync] = await Promise.all([
        supabase.from('etablissements').select('*').eq('archived', false).order('nom'),
        supabase.from('google_calendar_sync').select('*').eq('user_id', user?.id).single(),
      ])
      setEtabs((e.data || []) as Etab[])
      if (sync.data?.last_sync_at) setLastSync(sync.data.last_sync_at)
    }
    load()
  }, [])

  return (
    <div style={{ maxWidth: 800 }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#111827' }}>Import Google Agenda</h1>
        <p style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>Importez vos missions depuis Google Calendar avec matching automatique</p>
      </div>

      <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 12, padding: 24, marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>📅</div>
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: '#111827', marginBottom: 2 }}>Google Calendar</h2>
            <p style={{ fontSize: 13, color: '#6b7280' }}>
              {lastSync ? `Dernière sync : ${new Date(lastSync).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}` : 'Jamais synchronisé'}
            </p>
          </div>
        </div>

        <div style={{ background: '#f9fafb', borderRadius: 10, padding: 16, marginBottom: 16, border: '1px solid #f3f4f6' }}>
          <h3 style={{ fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 8 }}>Comment ça fonctionne</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {['1. Connectez-vous avec Google (déjà fait ✓)', "2. L'app analyse vos événements Google Agenda", '3. Les établissements sont détectés automatiquement par le titre', '4. Les missions sont créées avec les heures calculées'].map((t, i) => (
              <div key={i} style={{ fontSize: 13, color: '#4b5563', display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                <span style={{ color: '#e879f9', fontWeight: 600 }}>{i === 0 ? '✓' : '→'}</span>
                {t}
              </div>
            ))}
          </div>
        </div>

        <div style={{ background: '#fef3c7', borderRadius: 10, padding: 14, marginBottom: 16, border: '1px solid #fde68a' }}>
          <p style={{ fontSize: 13, color: '#92400e' }}>
            ⚠️ <strong>Fonctionnalité en développement</strong> — Pour l'instant, ajoutez vos missions manuellement depuis la page Missions.
          </p>
        </div>

        <Link href="/dashboard/missions" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 18px', borderRadius: 9, background: '#e879f9', color: 'white', textDecoration: 'none', fontSize: 14, fontWeight: 700 }}>
          + Ajouter une mission manuellement
        </Link>
      </div>

      {etabs.length > 0 && (
        <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 12, padding: 24 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: '#111827', marginBottom: 4 }}>Établissements pour matching</h2>
          <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 14 }}>Ces établissements seront utilisés pour matcher automatiquement vos événements :</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {etabs.map(e => (
              <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', borderRadius: 8, background: '#f9fafb', border: '1px solid #f3f4f6' }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>🏥 {e.nom}</span>
                <span style={{ fontSize: 12, color: '#9ca3af' }}>{e.taux_horaire}€/h</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
