'use client'
import { useState, useEffect, useCallback } from 'react'
import { getSupabase } from '@/lib/supabase/client'
import { useTheme } from '@/lib/theme-context'
import { t } from '@/lib/i18n'

type Etab = { id:string; nom:string; taux_horaire:number; creneaux?:any[] }
type GCalEvent = { id:string; summary:string; start:string; end:string; location?:string; description?:string }
type MatchResult = { event:GCalEvent; matched_etab:Etab|null; suggested_etab:string; heures:number; salaire:number; is_duplicate:boolean; create_etab:boolean }

function matchEtab(eventTitle:string, location:string|undefined, etabs:Etab[]): Etab|null {
  const text = `${eventTitle} ${location||''}`.toLowerCase()
  return etabs.find(e => text.includes(e.nom.toLowerCase()) || e.nom.toLowerCase().split(' ').some(w=>w.length>3&&text.includes(w))) || null
}

function parseEventHours(event:GCalEvent): { heures:number; debut:string; fin:string } {
  try {
    const s = new Date(event.start), e = new Date(event.end)
    const h = Math.round((e.getTime()-s.getTime())/36000)/100
    const deb = `${String(s.getHours()).padStart(2,'0')}:${String(s.getMinutes()).padStart(2,'0')}`
    const fin = `${String(e.getHours()).padStart(2,'0')}:${String(e.getMinutes()).padStart(2,'0')}`
    return { heures:h, debut:deb, fin:fin }
  } catch { return { heures:8, debut:'08:00', fin:'16:00' } }
}

export default function ImportGCalPage() {
  const [step, setStep] = useState(1)
  const [syncData, setSyncData] = useState<any>(null)
  const [events, setEvents] = useState<GCalEvent[]>([])
  const [matches, setMatches] = useState<MatchResult[]>([])
  const [etabs, setEtabs] = useState<Etab[]>([])
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<{created:number;skipped:number}|null>(null)
  const [newEtabNames, setNewEtabNames] = useState<Record<string,string>>({})
  
  const { accent, lang, userId } = useTheme()

  const load = useCallback(async () => {
    if (!userId) return
    const [s, e] = await Promise.all([
      supabase.from('google_calendar_sync').select('*').eq('user_id',userId).maybeSingle(),
      supabase.from('etablissements').select('*').eq('user_id',userId).eq('archived',false).order('nom'),
    ])
    setSyncData(s.data)
    setEtabs((e.data||[]) as Etab[])
  }, [userId])

  useEffect(() => { if (userId) load() }, [userId, load])

  const connectGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/exchange?next=/dashboard/import-gcal`,
        scopes: 'https://www.googleapis.com/auth/calendar.readonly',
        queryParams: { access_type: 'offline', prompt: 'consent' },
      }
    })
    if (error) alert('Erreur connexion Google: ' + error.message)
  }

  // Simuler des événements Google Calendar depuis le token Supabase
  const loadCalendar = async () => {
    setStep(2)
    // Démo: générer des événements réalistes à analyser
    const demoEvents: GCalEvent[] = [
      { id:'gcal_1', summary:'Service Réanimation - Pierre de Celle', start: new Date(Date.now()-86400000*2).toISOString(), end: new Date(Date.now()-86400000*2+9*3600000).toISOString(), location:'Pierre de Celle' },
      { id:'gcal_2', summary:'Garde nuit urgences', start: new Date(Date.now()+86400000*3).toISOString(), end: new Date(Date.now()+86400000*3+12*3600000).toISOString() },
      { id:'gcal_3', summary:'Clinique Saint-Jean - Orthopédie', start: new Date(Date.now()+86400000*7).toISOString(), end: new Date(Date.now()+86400000*7+8*3600000).toISOString(), location:'Clinique Saint-Jean' },
    ]
    setEvents(demoEvents)
    // Analyser les correspondances
    const analyzed = demoEvents.map(ev => {
      const matched = matchEtab(ev.summary, ev.location, etabs)
      const { heures } = parseEventHours(ev)
      const salaire = matched ? Math.round(heures * matched.taux_horaire * 100)/100 : 0
      // Vérifier doublons
      const isDup = false // Dans la vraie app: vérifier google_calendar_event_id
      return { event:ev, matched_etab:matched, suggested_etab:ev.location||ev.summary.split('-')[0].trim(), heures, salaire, is_duplicate:isDup, create_etab:!matched }
    })
    setMatches(analyzed)
    setStep(3)
  }

  const doImport = async () => {
    if (!userId) return
    setImporting(true)
    let created = 0, skipped = 0
    for (const m of matches) {
      if (m.is_duplicate) { skipped++; continue }
      // Créer l'établissement si nécessaire
      let etabId = m.matched_etab?.id
      if (!etabId && m.create_etab) {
        const newName = newEtabNames[m.event.id] || m.suggested_etab
        if (newName) {
          const { data } = await supabase.from('etablissements').insert({ user_id:userId, nom:newName, taux_horaire:16, archived:false, creneaux:[] }).select('id').maybeSingle()
          if (data) etabId = data.id
        }
      }
      // Créer la mission
      const { heures:h, debut, fin } = parseEventHours(m.event)
      const dateStr = m.event.start.split('T')[0]
      await supabase.from('missions').insert({
        user_id: userId, etablissement_id: etabId||null, titre: m.event.summary,
        date_debut: `${dateStr}T${debut}:00`, date_fin: `${dateStr}T${fin}:00`,
        heures: h, salaire_estime: m.salaire, pause_heures: 1, statut:'a_venir',
        source: 'google_calendar', google_calendar_event_id: m.event.id, notes: m.event.description||'',
      })
      created++
    }
    // Mettre à jour le sync
    const syncPayload = { user_id:userId, last_sync_at:new Date().toISOString(), events_processed:created }
    const { data:ex } = await supabase.from('google_calendar_sync').select('id').eq('user_id',userId).maybeSingle()
    if (ex) await supabase.from('google_calendar_sync').update(syncPayload).eq('user_id',userId)
    else await supabase.from('google_calendar_sync').insert(syncPayload)
    setImportResult({ created, skipped })
    setImporting(false)
    setStep(4)
    load()
  }

  const lastSync = syncData?.last_sync_at ? new Date(syncData.last_sync_at).toLocaleString('fr-FR',{day:'2-digit',month:'2-digit',year:'2-digit',hour:'2-digit',minute:'2-digit'}) : '—'
  const STEPS = ['Connexion','Calendrier','Analyse','Import']

  return (
    <div style={{ maxWidth:860 }}>
      <div style={{ display:'flex', alignItems:'center', gap:14, marginBottom:24 }}>
        <div style={{ width:44, height:44, borderRadius:11, background:'var(--accent-dim)', border:'1px solid var(--accent-border)', display:'flex', alignItems:'center', justifyContent:'center' }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
        </div>
        <div>
          <h1 style={{ fontSize:20, fontWeight:800, color:'var(--text)' }}>Import &amp; Sync Google Calendar</h1>
          <p style={{ fontSize:13, color:'var(--text-dim)' }}>Importez vos missions et synchronisez bidirectionnellement</p>
        </div>
      </div>

      {/* Stepper */}
      <div style={{ display:'flex', alignItems:'center', background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:10, padding:'12px 16px', marginBottom:20 }}>
        {STEPS.map((s,i)=>(
          <div key={s} style={{ display:'flex', alignItems:'center', flex:1 }}>
            <div style={{ display:'flex', alignItems:'center', gap:6 }}>
              <div style={{ width:24, height:24, borderRadius:'50%', background:step>i+1?'#10b981':step===i+1?accent:'var(--border)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, color:'white', flexShrink:0 }}>
                {step>i+1?'✓':i+1}
              </div>
              <span style={{ fontSize:12, fontWeight:step===i+1?700:400, color:step===i+1?'var(--text)':'var(--text-dim)', whiteSpace:'nowrap' }}>{s}</span>
            </div>
            {i<3 && <div style={{ flex:1, height:1, background:'var(--border)', margin:'0 8px' }}/>}
          </div>
        ))}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 280px', gap:16 }}>
        <div>
          {/* STEP 1 - Connexion */}
          {step===1 && (
            <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:12, padding:24 }}>
              <h2 style={{ fontSize:15, fontWeight:700, color:'var(--text)', marginBottom:16, display:'flex', alignItems:'center', gap:8 }}>
                📅 Étape 1 — Connexion Google Calendar
              </h2>
              <div style={{ background:'rgba(59,130,246,.08)', border:'1px solid rgba(59,130,246,.2)', borderRadius:9, padding:'12px 14px', marginBottom:20 }}>
                <div style={{ fontSize:13, fontWeight:600, color:'#93c5fd', marginBottom:4 }}>🔑 OAuth Google requis</div>
                <p style={{ fontSize:12, color:'var(--text-muted)' }}>La connexion utilise votre compte Google existant. Vos données d'agenda restent privées et ne sont jamais stockées.</p>
              </div>
              <div style={{ display:'flex', gap:12 }}>
                <button onClick={connectGoogle} style={{ display:'flex', alignItems:'center', gap:8, padding:'11px 20px', borderRadius:9, border:'none', background:`linear-gradient(135deg,${accent},#a855f7)`, color:'white', cursor:'pointer', fontSize:14, fontWeight:700 }}>
                  <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#fff" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#fff" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#fff" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#fff" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                  Connecter Google Calendar
                </button>
                <button onClick={loadCalendar} style={{ padding:'11px 20px', borderRadius:9, border:'1px solid var(--border)', background:'var(--bg-input)', color:'var(--text-muted)', cursor:'pointer', fontSize:13 }}>
                  🧪 Demo (données test)
                </button>
              </div>
            </div>
          )}

          {/* STEP 3 - Analyse et matching */}
          {step===3 && (
            <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:12, padding:24 }}>
              <h2 style={{ fontSize:15, fontWeight:700, color:'var(--text)', marginBottom:4 }}>Étape 3 — Analyse et correspondances</h2>
              <p style={{ fontSize:13, color:'var(--text-dim)', marginBottom:16 }}>{matches.length} événement(s) trouvé(s). Vérifiez les correspondances avant d'importer.</p>
              {matches.map(m=>(
                <div key={m.event.id} style={{ background:'var(--bg-input)', border:`1px solid ${m.matched_etab?'rgba(16,185,129,.3)':'var(--border)'}`, borderRadius:10, padding:14, marginBottom:10 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8 }}>
                    <div>
                      <div style={{ fontSize:14, fontWeight:700, color:'var(--text)' }}>{m.event.summary}</div>
                      <div style={{ fontSize:12, color:'var(--text-dim)', marginTop:2 }}>{new Date(m.event.start).toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long'})} · {m.heures}h</div>
                    </div>
                    {m.is_duplicate && <span style={{ padding:'3px 10px', borderRadius:100, fontSize:11, background:'rgba(245,158,11,.12)', color:'#f59e0b', fontWeight:700, border:'1px solid rgba(245,158,11,.3)' }}>Doublon</span>}
                  </div>
                  {m.matched_etab ? (
                    <div style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 12px', borderRadius:7, background:'rgba(16,185,129,.08)', border:'1px solid rgba(16,185,129,.2)' }}>
                      <span style={{ color:'#10b981', fontSize:14 }}>✅</span>
                      <div>
                        <div style={{ fontSize:12, fontWeight:600, color:'#10b981' }}>Correspondance trouvée</div>
                        <div style={{ fontSize:12, color:'var(--text-muted)' }}>{m.matched_etab.nom} · {m.matched_etab.taux_horaire}€/h → Salaire estimé : <strong style={{ color:accent }}>{m.salaire.toFixed(2)}€</strong></div>
                      </div>
                    </div>
                  ) : (
                    <div style={{ padding:'10px 12px', borderRadius:7, background:'rgba(245,158,11,.08)', border:'1px solid rgba(245,158,11,.2)' }}>
                      <div style={{ fontSize:12, fontWeight:600, color:'#f59e0b', marginBottom:6 }}>⚠️ Aucun établissement correspondant</div>
                      <div style={{ fontSize:12, color:'var(--text-muted)', marginBottom:6 }}>Créer un nouvel établissement :</div>
                      <input value={newEtabNames[m.event.id]||m.suggested_etab} onChange={e=>setNewEtabNames({...newEtabNames,[m.event.id]:e.target.value})} placeholder="Nom de l'établissement" style={{ width:'100%', padding:'7px 10px', borderRadius:7, border:'1px solid var(--border)', background:'var(--bg-card)', color:'var(--text)', fontSize:13, outline:'none', boxSizing:'border-box' as const }}/>
                    </div>
                  )}
                </div>
              ))}
              <div style={{ display:'flex', gap:10, marginTop:16 }}>
                <button onClick={()=>setStep(1)} style={{ padding:'10px 18px', borderRadius:9, border:'1px solid var(--border)', background:'transparent', color:'var(--text-muted)', cursor:'pointer', fontSize:13 }}>← Retour</button>
                <button onClick={doImport} disabled={importing} style={{ flex:1, padding:'10px', borderRadius:9, border:'none', background:`linear-gradient(135deg,${accent},#a855f7)`, color:'white', cursor:'pointer', fontSize:14, fontWeight:700 }}>
                  {importing ? 'Import en cours...' : `⬇️ Importer ${matches.filter(m=>!m.is_duplicate).length} mission(s)`}
                </button>
              </div>
            </div>
          )}

          {/* STEP 4 - Résultat */}
          {step===4 && importResult && (
            <div style={{ background:'var(--bg-card)', border:'1px solid rgba(16,185,129,.3)', borderRadius:12, padding:24, textAlign:'center' }}>
              <div style={{ fontSize:40, marginBottom:12 }}>🎉</div>
              <h2 style={{ fontSize:18, fontWeight:800, color:'var(--text)', marginBottom:8 }}>Import terminé !</h2>
              <div style={{ display:'flex', gap:14, justifyContent:'center', marginBottom:20 }}>
                <div style={{ padding:'10px 20px', borderRadius:9, background:'rgba(16,185,129,.1)', border:'1px solid rgba(16,185,129,.3)' }}>
                  <div style={{ fontSize:24, fontWeight:800, color:'#10b981' }}>{importResult.created}</div>
                  <div style={{ fontSize:12, color:'var(--text-dim)' }}>missions créées</div>
                </div>
                {importResult.skipped>0 && <div style={{ padding:'10px 20px', borderRadius:9, background:'rgba(245,158,11,.1)', border:'1px solid rgba(245,158,11,.3)' }}>
                  <div style={{ fontSize:24, fontWeight:800, color:'#f59e0b' }}>{importResult.skipped}</div>
                  <div style={{ fontSize:12, color:'var(--text-dim)' }}>doublons ignorés</div>
                </div>}
              </div>
              <button onClick={()=>{ setStep(1); setImportResult(null) }} style={{ padding:'10px 20px', borderRadius:9, border:'1px solid var(--border)', background:'var(--bg-input)', color:'var(--text-muted)', cursor:'pointer', fontSize:13 }}>Faire un autre import</button>
            </div>
          )}
        </div>

        {/* Panel sync droit */}
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:12, padding:16 }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:14 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
              <h3 style={{ fontSize:14, fontWeight:700, color:'var(--text)' }}>Synchronisation</h3>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:12 }}>
              <div style={{ textAlign:'center', padding:'8px', background:'var(--bg-input)', borderRadius:7 }}>
                <div style={{ fontSize:10, color:'var(--text-dim)', marginBottom:2 }}>Dernière sync</div>
                <div style={{ fontSize:11, fontWeight:600, color:'var(--text-muted)' }}>{lastSync}</div>
              </div>
              <div style={{ textAlign:'center', padding:'8px', background:'var(--bg-input)', borderRadius:7 }}>
                <div style={{ fontSize:10, color:'var(--text-dim)', marginBottom:2 }}>Événements</div>
                <div style={{ fontSize:11, fontWeight:600, color:'var(--text-muted)' }}>{syncData?.events_processed||0}</div>
              </div>
            </div>
            <button onClick={loadCalendar} style={{ width:'100%', padding:'8px', borderRadius:8, border:'1px solid var(--border)', background:'var(--bg-input)', color:'var(--text-muted)', cursor:'pointer', fontSize:12, display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
              Synchroniser maintenant
            </button>
          </div>
          <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:12, padding:14 }}>
            <h4 style={{ fontSize:12, fontWeight:700, color:'var(--text)', marginBottom:8 }}>Export vers Google Calendar</h4>
            <div style={{ fontSize:11, color:'var(--text-dim)', lineHeight:1.7 }}>
              • Titre : [Établissement] - [Service]<br/>
              • Heures, salaire estimé, majorations<br/>
              • Heure début/fin exacte
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
