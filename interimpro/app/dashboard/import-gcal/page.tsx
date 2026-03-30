'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function ImportGcalPage() {
  const [lastSync, setLastSync] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [autoSync, setAutoSync] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase.from('google_calendar_sync').select('*').eq('user_id', user.id).single()
      if (data) { setLastSync(data); setAutoSync(data.auto_sync_enabled || false) }
    }
    load()
  }, [])

  const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }).replace(',', '') : '—'
  const STEPS = ['Connexion', 'Calendrier', 'Analyse', 'Import']

  return (
    <div style={{ maxWidth: 900 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24 }}>
        <div style={{ width: 42, height: 42, borderRadius: 10, background: 'rgba(232,121,249,.15)', border: '1px solid rgba(232,121,249,.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#e879f9" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><path d="M8 14l4 4 4-4"/></svg>
        </div>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: '#f1f5f9' }}>Import & Sync Google Calendar</h1>
          <p style={{ fontSize: 13, color: '#64748b' }}>Importez vos missions depuis Google Calendar et synchronisez automatiquement</p>
        </div>
      </div>

      <div style={{ background: 'rgba(245,158,11,.1)', border: '1px solid rgba(245,158,11,.3)', borderRadius: 10, padding: '12px 16px', marginBottom: 20, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" style={{ marginTop: 1, flexShrink: 0 }}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#f59e0b', marginBottom: 3 }}>Mode démonstration — OAuth simulé</div>
          <div style={{ fontSize: 12, color: '#94a3b8' }}>L'OAuth Google réel et la synchronisation automatique nécessitent un abonnement <strong>Builder+</strong>. Toute la logique d'import, matching et déduplication est fonctionnelle et prête à brancher.</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 16 }}>
        {/* Gauche */}
        <div>
          {/* Stepper */}
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 20 }}>
            {STEPS.map((s, i) => (
              <div key={s} style={{ display: 'flex', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 20, background: i === 0 ? '#e879f9' : '#1e293b', border: `1px solid ${i === 0 ? '#e879f9' : '#334155'}` }}>
                  <div style={{ width: 18, height: 18, borderRadius: '50%', background: i === 0 ? 'white' : '#334155', color: i === 0 ? '#e879f9' : '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700 }}>{i + 1}</div>
                  <span style={{ fontSize: 12, fontWeight: 600, color: i === 0 ? 'white' : '#64748b' }}>{s}</span>
                </div>
                {i < 3 && <div style={{ width: 20, height: 1, background: '#334155', margin: '0 4px' }} />}
              </div>
            ))}
          </div>

          <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 12, padding: 22 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#e879f9" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: '#f1f5f9' }}>Étape 1 — Connexion Google Calendar</h2>
            </div>
            <div style={{ background: 'rgba(59,130,246,.1)', border: '1px solid rgba(59,130,246,.3)', borderRadius: 8, padding: '12px 14px', marginBottom: 16, display: 'flex', gap: 10 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" style={{ marginTop: 1, flexShrink: 0 }}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#3b82f6', marginBottom: 3 }}>Mode démonstration</div>
                <div style={{ fontSize: 12, color: '#94a3b8' }}>L'OAuth Google réel nécessite un abonnement Builder+. Cette démo simule le flux complet avec des données réalistes.</div>
              </div>
            </div>
            <button disabled style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 20px', borderRadius: 10, background: '#e879f9', border: 'none', color: 'white', cursor: 'pointer', fontSize: 14, fontWeight: 700, opacity: loading ? .7 : 1 }}>
              <svg width="16" height="16" viewBox="0 0 24 24"><path fill="#fff" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#fff" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#fff" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#fff" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
              Connecter Google Calendar
            </button>
          </div>
        </div>

        {/* Droite - Synchronisation */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 12, padding: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#e879f9" strokeWidth="2"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
              <h3 style={{ fontSize: 13, fontWeight: 700, color: '#f1f5f9' }}>Synchronisation</h3>
            </div>
            <div style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#f1f5f9' }}>Synchronisation automatique</div>
                  <div style={{ fontSize: 11, color: '#64748b' }}>Vérification toutes les 15 minutes</div>
                </div>
                <div onClick={() => setAutoSync(!autoSync)} style={{ width: 36, height: 20, borderRadius: 10, background: autoSync ? '#e879f9' : '#334155', cursor: 'pointer', position: 'relative', transition: 'background .2s' }}>
                  <div style={{ position: 'absolute', top: 2, left: autoSync ? 18 : 2, width: 16, height: 16, borderRadius: '50%', background: 'white', transition: 'left .2s' }} />
                </div>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
              {[{ label: 'Dernière sync', value: lastSync?.last_sync_at ? fmtDate(lastSync.last_sync_at) : '19/03 11:09' }, { label: 'Événements traités', value: String(lastSync?.events_processed || 0) }].map((s, i) => (
                <div key={i} style={{ textAlign: 'center' }}>
                  <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 3 }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                  </div>
                  <div style={{ fontSize: 11, color: '#64748b', marginBottom: 2 }}>{s.label}</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8' }}>{s.value}</div>
                </div>
              ))}
            </div>
            <button style={{ width: '100%', padding: '9px', borderRadius: 8, border: '1px solid #334155', background: '#0f172a', color: '#94a3b8', cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
              Synchroniser maintenant
            </button>
            {lastSync?.sync_history && (
              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: '#64748b', marginBottom: 6 }}>HISTORIQUE</div>
                {(lastSync.sync_history || []).slice(-3).reverse().map((h: any, i: number) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0', borderBottom: '1px solid #334155', fontSize: 11 }}>
                    <span style={{ color: '#64748b' }}>{fmtDate(h.date)}</span>
                    <span style={{ padding: '1px 6px', borderRadius: 4, background: 'rgba(16,185,129,.15)', color: '#10b981', fontWeight: 700 }}>+{h.imported || 0}</span>
                  </div>
                ))}
                {!(lastSync?.sync_history?.length) && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0', fontSize: 11 }}>
                    <span style={{ color: '#64748b' }}>19/03/26 11:09</span>
                    <span style={{ padding: '1px 6px', borderRadius: 4, background: 'rgba(16,185,129,.15)', color: '#10b981', fontWeight: 700 }}>+1</span>
                  </div>
                )}
              </div>
            )}
          </div>

          <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 12, padding: 18 }}>
            <h3 style={{ fontSize: 13, fontWeight: 700, color: '#f1f5f9', marginBottom: 10 }}>Export vers Google Calendar</h3>
            <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.6 }}>
              Après import Builder+, chaque nouvelle mission créée dans l'app peut être automatiquement ajoutée à votre Google Calendar avec :
              <ul style={{ marginTop: 6, paddingLeft: 14, display: 'flex', flexDirection: 'column', gap: 2 }}>
                <li>Titre : [Établissement] - [Service]</li>
                <li>Description : Heures, salaire estimé, majorations</li>
                <li>Heure début/fin exacte</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
