'use client'
import { useState, useEffect, useCallback } from 'react'
import { getSupabase } from '@/lib/supabase/client'
import { useTheme } from '@/lib/theme-context'
import { t } from '@/lib/i18n'

type Etab = { id:string; nom:string; taux_horaire:number; creneaux:any[] }
type GCalEvent = {
  id:string; title:string; start:string; end:string; description?:string
  matchedEtabId:string; newEtabName:string; matchedCreneauIdx:number
  isDuplicate:boolean; selected:boolean
}

// ─── Parsing iCal ────────────────────────────────────────────
function parseIcal(text:string): Pick<GCalEvent,'id'|'title'|'start'|'end'|'description'>[] {
  const events: any[] = []
  const lines = text.replace(/\r\n /g,'').replace(/\r\n/g,'\n').split('\n')
  let cur: any = null
  for (const raw of lines) {
    const line = raw.trim()
    if (line==='BEGIN:VEVENT') { cur={} }
    else if (line==='END:VEVENT' && cur) { if(cur.title&&cur.start) events.push(cur); cur=null }
    else if (cur) {
      if (/^SUMMARY/i.test(line)) cur.title = line.replace(/^SUMMARY[^:]*:/i,'')
      if (/^UID/i.test(line)) cur.id = line.replace(/^UID[^:]*:/i,'')
      if (/^DTSTART/i.test(line)) cur.start = line.split(':').slice(1).join(':').replace(/Z$/,'')
      if (/^DTEND/i.test(line)) cur.end = line.split(':').slice(1).join(':').replace(/Z$/,'')
      if (/^DESCRIPTION/i.test(line)) cur.description = line.replace(/^DESCRIPTION[^:]*:/i,'')
    }
  }
  return events.map(e => ({
    id: e.id||`${e.title}-${e.start}`,
    title: e.title, start: e.start, end: e.end||e.start,
    description: e.description
  }))
}

function icalToISO(s:string): string {
  if (!s) return new Date().toISOString()
  // Format: 20240315T080000 ou 20240315
  const y=s.slice(0,4), mo=s.slice(4,6), d=s.slice(6,8)
  const h=s.slice(9,11)||'08', mi=s.slice(11,13)||'00'
  return `${y}-${mo}-${d}T${h}:${mi}:00`
}

function fmtIcalDate(s:string) {
  if (!s) return '—'
  return `${s.slice(6,8)}/${s.slice(4,6)}/${s.slice(0,4)} ${s.slice(9,11)||''}:${s.slice(11,13)||''}`
}

function matchEtab(title:string, etabs:Etab[]): string {
  const tl = title.toLowerCase().replace(/[\W_]+/g,' ')
  for (const e of etabs) {
    const el = e.nom.toLowerCase().replace(/[\W_]+/g,' ')
    if (tl.includes(el) || el.includes(tl.split(' ')[0])) return e.id
  }
  return ''
}

export default function ImportGCalPage() {
  const [etabs, setEtabs] = useState<Etab[]>([])
  const [events, setEvents] = useState<GCalEvent[]>([])
  const [existingIds, setExistingIds] = useState<Set<string>>(new Set())
  const [userId, setUserId] = useState<string|null>(null)
  const [loading, setLoading] = useState(false)
  const [importing, setImporting] = useState(false)
  const [done, setDone] = useState(0)
  const [icalUrl, setIcalUrl] = useState('')
  const [tab, setTab] = useState<'gcal'|'ical'>('gcal')
  const { accent, lang } = useTheme()

  useEffect(() => {
    getSupabase().auth.getSession().then(({ data }) => {
      if (!data.session?.user?.id) return
      const uid = data.session.user.id
      setUserId(uid)
      Promise.all([
        getSupabase().from('etablissements').select('id,nom,taux_horaire,creneaux').eq('user_id',uid).eq('archived',false),
        getSupabase().from('missions').select('google_event_id').eq('user_id',uid).not('google_event_id','is',null)
      ]).then(([e,m]) => {
        setEtabs((e.data||[]) as Etab[])
        setExistingIds(new Set((m.data||[]).map((x:any)=>x.google_event_id).filter(Boolean)))
      })
    })
  }, [])

  const connectGCal = async () => {
    // OAuth Google Agenda via Supabase
    const { error } = await getSupabase().auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/dashboard/import-gcal`,
        scopes: 'https://www.googleapis.com/auth/calendar.readonly',
        queryParams: { access_type: 'offline', prompt: 'consent' }
      }
    })
    if (error) alert('Erreur connexion Google: ' + error.message)
  }

  const fetchGCalEvents = useCallback(async () => {
    setLoading(true)
    try {
      const { data: { session } } = await getSupabase().auth.getSession()
      const providerToken = session?.provider_token
      if (!providerToken) {
        alert('Veuillez vous connecter avec Google d\'abord.')
        setLoading(false)
        return
      }
      const now = new Date()
      const timeMin = new Date(now.getFullYear(), now.getMonth()-1, 1).toISOString()
      const timeMax = new Date(now.getFullYear()+1, 11, 31).toISOString()
      const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}&maxResults=250&singleEvents=true&orderBy=startTime`
      const res = await fetch(url, { headers: { Authorization: `Bearer ${providerToken}` } })
      if (!res.ok) { alert('Erreur API Google Calendar: ' + res.status); setLoading(false); return }
      const data = await res.json()
      processGCalItems(data.items || [])
    } catch(e:any) { alert('Erreur: ' + e.message) }
    setLoading(false)
  }, [etabs, existingIds])

  const processGCalItems = (items: any[]) => {
    const processed: GCalEvent[] = items
      .filter(e => e.summary && e.start)
      .map(e => {
        const start = e.start.dateTime || e.start.date || ''
        const end = e.end?.dateTime || e.end?.date || start
        // Convertir en format ical-like pour parsing unifié
        const startStr = start.replace(/[-:]/g,'').replace('T','T').slice(0,15)
        const endStr = end.replace(/[-:]/g,'').replace('T','T').slice(0,15)
        return {
          id: e.id, title: e.summary,
          start: startStr, end: endStr,
          description: e.description,
          isDuplicate: existingIds.has(e.id),
          selected: !existingIds.has(e.id),
          matchedEtabId: matchEtab(e.summary, etabs),
          newEtabName: '', matchedCreneauIdx: -1
        }
      })
    setEvents(processed)
    setDone(0)
  }

  const handleIcalFile = (file:File) => {
    const reader = new FileReader()
    reader.onload = e => { if(e.target?.result) applyIcal(e.target.result as string) }
    reader.readAsText(file)
  }

  const handleIcalUrl = async () => {
    setLoading(true)
    try {
      const proxy = `https://api.allorigins.win/raw?url=${encodeURIComponent(icalUrl)}`
      const r = await fetch(proxy)
      applyIcal(await r.text())
    } catch { alert('Impossible de charger l\'URL iCal') }
    setLoading(false)
  }

  const applyIcal = (text:string) => {
    const parsed = parseIcal(text)
    setEvents(parsed.map(e => ({
      ...e,
      isDuplicate: existingIds.has(e.id),
      selected: !existingIds.has(e.id),
      matchedEtabId: matchEtab(e.title, etabs),
      newEtabName: '', matchedCreneauIdx: -1
    })))
    setDone(0)
  }

  const updateEvent = (i:number, patch:Partial<GCalEvent>) => {
    setEvents(ev => ev.map((e,j) => j===i ? {...e,...patch} : e))
  }

  const doImport = async () => {
    if (!userId) return
    setImporting(true)
    const sb = getSupabase()
    let count = 0
    const toImport = events.filter(e=>e.selected&&!e.isDuplicate)
    for (const ev of toImport) {
      let etabId = ev.matchedEtabId
      if (!etabId && ev.newEtabName.trim()) {
        const { data } = await sb.from('etablissements').insert({
          user_id:userId, nom:ev.newEtabName.trim(),
          type_etablissement:'Établissement', type:'Établissement',
          taux_horaire:16.32, creneaux:[], archived:false
        }).select('id').single()
        if (data) etabId = data.id
      }
      const etab = etabs.find(e=>e.id===etabId)
      const creneau = ev.matchedCreneauIdx>=0 ? etab?.creneaux?.[ev.matchedCreneauIdx] : null
      // Calculer les horaires
      let debut = icalToISO(ev.start)
      let fin = icalToISO(ev.end)
      if (creneau) {
        const dateStr = debut.slice(0,10)
        debut = `${dateStr}T${creneau.heure_debut}:00`
        fin = `${dateStr}T${creneau.heure_fin}:00`
      }
      const pause = creneau?.pause_minutes ? creneau.pause_minutes/60 : 1
      const heures = Math.max(0, (new Date(fin).getTime()-new Date(debut).getTime())/3600000-pause)
      const taux = etab?.taux_horaire || 16.32
      const salaire = Math.round(heures*taux*100)/100
      await sb.from('missions').upsert({
        user_id:userId, titre:ev.title, etablissement_id:etabId||null,
        date_debut:debut, date_fin:fin, pause_heures:pause, heures,
        salaire_estime:salaire, statut:'a_venir', source:'google_calendar',
        google_event_id:ev.id,
        creneau_label:creneau?.label||null,
        notes:ev.description||null,
      }, { onConflict:'user_id,google_event_id', ignoreDuplicates:true })
      count++
    }
    setDone(count)
    setEvents([])
    setImporting(false)
  }

  const toImport = events.filter(e=>e.selected&&!e.isDuplicate)
  const dupCount = events.filter(e=>e.isDuplicate).length

  const inp: React.CSSProperties = { width:'100%', padding:'7px 10px', borderRadius:7, border:'1px solid var(--border)', background:'var(--bg-input)', color:'var(--text)', fontSize:12, outline:'none' }
  const tabBtn = (active:boolean) => ({ padding:'9px 18px', border:'none', background:active?'var(--bg-hover)':'transparent', color:active?'var(--text)':'var(--text-dim)', cursor:'pointer' as const, fontSize:14, fontWeight:active?700:400, borderBottom:active?`2px solid ${accent}`:'2px solid transparent' })

  return (
    <div>
      <h1 style={{ fontSize:26, fontWeight:800, color:'var(--text)', marginBottom:4 }}>{t(lang,'gcal.title')}</h1>
      <p style={{ fontSize:14, color:'var(--text-dim)', marginBottom:22 }}>Importez vos missions depuis Google Agenda avec déduplication automatique et association aux établissements.</p>

      {done>0 && (
        <div style={{ background:'rgba(16,185,129,.1)', border:'1px solid rgba(16,185,129,.3)', borderRadius:10, padding:'12px 18px', marginBottom:18, fontSize:14, color:'#10b981', fontWeight:600 }}>
          ✅ {done} mission{done>1?'s':''} importée{done>1?'s':''} avec succès !
        </div>
      )}

      {/* Onglets */}
      <div style={{ display:'inline-flex', background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:'10px 10px 0 0', overflow:'hidden', marginBottom:0 }}>
        <button style={tabBtn(tab==='gcal')} onClick={()=>setTab('gcal')}>📅 Google Agenda</button>
        <button style={tabBtn(tab==='ical')} onClick={()=>setTab('ical')}>📂 Fichier .ics / URL</button>
      </div>

      <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderTop:'none', borderRadius:'0 10px 10px 10px', padding:22, marginBottom:18 }}>
        {tab==='gcal' ? (
          <div>
            <p style={{ fontSize:13, color:'var(--text-muted)', marginBottom:16, lineHeight:1.6 }}>
              Connectez votre Google Agenda pour importer automatiquement vos événements.<br/>
              <span style={{ fontSize:12, color:'var(--text-dim)' }}>Les permissions demandées sont en lecture seule sur votre agenda.</span>
            </p>
            <div style={{ display:'flex', gap:12, flexWrap:'wrap' }}>
              <button onClick={connectGCal} style={{ display:'flex', alignItems:'center', gap:10, padding:'11px 20px', borderRadius:10, border:'1px solid #e5e7eb', background:'white', cursor:'pointer', fontSize:14, fontWeight:600, color:'#374151' }}>
                <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                {t(lang,'gcal.connect')}
              </button>
              <button onClick={fetchGCalEvents} disabled={loading} style={{ display:'flex', alignItems:'center', gap:8, padding:'11px 20px', borderRadius:10, border:'none', background:`linear-gradient(135deg,${accent},#a855f7)`, color:'white', cursor:'pointer', fontSize:14, fontWeight:700 }}>
                {loading ? '⏳ Chargement...' : '📥 Charger mes événements'}
              </button>
            </div>
            <div style={{ marginTop:12, padding:'10px 14px', background:'var(--bg-input)', borderRadius:8, fontSize:12, color:'var(--text-dim)', lineHeight:1.7 }}>
              <strong style={{ color:'var(--text)' }}>Comment ça marche :</strong><br/>
              1. Cliquez "Se connecter" → autorisez l'accès lecture à Google Agenda<br/>
              2. Cliquez "Charger mes événements" → les événements apparaissent ci-dessous<br/>
              3. Associez chaque événement à un établissement et un créneau<br/>
              4. Confirmez l'import → les missions sont créées avec le salaire prévisionnel
            </div>
          </div>
        ) : (
          <div>
            <p style={{ fontSize:13, color:'var(--text-muted)', marginBottom:14 }}>
              Exportez votre agenda depuis Google Agenda → Paramètres → Importer et exporter → Exporter
            </p>
            <div style={{ display:'flex', gap:12, alignItems:'center', flexWrap:'wrap' }}>
              <label style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 18px', borderRadius:9, border:`1.5px solid ${accent}`, background:'var(--accent-dim)', color:accent, cursor:'pointer', fontSize:14, fontWeight:600 }}>
                📂 Choisir un fichier .ics
                <input type="file" accept=".ics,.ical" style={{ display:'none' }} onChange={e=>e.target.files?.[0]&&handleIcalFile(e.target.files[0])}/>
              </label>
              <span style={{ color:'var(--text-dim)', fontSize:13 }}>ou</span>
              <div style={{ flex:1, display:'flex', gap:8, minWidth:240 }}>
                <input value={icalUrl} onChange={e=>setIcalUrl(e.target.value)} placeholder="URL iCal publique..." style={{ flex:1, padding:'10px 12px', borderRadius:9, border:'1px solid var(--border)', background:'var(--bg-input)', color:'var(--text)', fontSize:13, outline:'none' }}/>
                <button onClick={handleIcalUrl} disabled={loading||!icalUrl} style={{ padding:'10px 16px', borderRadius:9, border:'none', background:accent, color:'white', cursor:'pointer', fontSize:13, fontWeight:700 }}>
                  {loading?'⏳':'▶'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Liste des événements */}
      {events.length>0 && (
        <div>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14, flexWrap:'wrap', gap:10 }}>
            <div>
              <span style={{ fontWeight:700, color:'var(--text)', fontSize:15 }}>
                {events.length} événements · {toImport.length} à importer
              </span>
              {dupCount>0 && <span style={{ marginLeft:10, fontSize:13, color:'var(--text-dim)' }}>{dupCount} déjà importés</span>}
            </div>
            <div style={{ display:'flex', gap:10 }}>
              <button onClick={()=>setEvents(ev=>ev.map(e=>(!e.isDuplicate?{...e,selected:true}:e)))} style={{ padding:'8px 14px', borderRadius:8, border:'1px solid var(--border)', background:'var(--bg-input)', color:'var(--text-muted)', cursor:'pointer', fontSize:13 }}>Tout sélectionner</button>
              <button onClick={doImport} disabled={importing||toImport.length===0} style={{ padding:'10px 20px', borderRadius:9, border:'none', background:`linear-gradient(135deg,${accent},#a855f7)`, color:'white', cursor:'pointer', fontSize:14, fontWeight:700, opacity:toImport.length===0?.5:1 }}>
                {importing ? t(lang,'gcal.importing') : `${t(lang,'gcal.confirm_import')} (${toImport.length})`}
              </button>
            </div>
          </div>

          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {events.map((ev,i)=>(
              <div key={ev.id} style={{ background:ev.isDuplicate?'var(--bg-input)':'var(--bg-card)', border:`1px solid ${ev.selected&&!ev.isDuplicate?accent+'50':'var(--border)'}`, borderRadius:10, padding:'14px 16px', opacity:ev.isDuplicate?.5:1 }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:ev.isDuplicate?0:12 }}>
                  <div style={{ display:'flex', gap:10, alignItems:'flex-start' }}>
                    {!ev.isDuplicate && (
                      <input type="checkbox" checked={ev.selected} onChange={e=>updateEvent(i,{selected:e.target.checked})} style={{ marginTop:3, accentColor:accent, width:16, height:16, flexShrink:0 }}/>
                    )}
                    <div>
                      <div style={{ fontWeight:700, color:'var(--text)', fontSize:14 }}>{ev.title}</div>
                      <div style={{ fontSize:12, color:'var(--text-dim)', marginTop:2 }}>{fmtIcalDate(ev.start)} → {fmtIcalDate(ev.end)}</div>
                    </div>
                  </div>
                  {ev.isDuplicate && <span style={{ fontSize:11, color:'var(--text-dim)', background:'var(--bg-hover)', borderRadius:100, padding:'2px 8px', flexShrink:0 }}>déjà importé</span>}
                </div>
                {ev.selected && !ev.isDuplicate && (
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginLeft:26 }}>
                    <div>
                      <div style={{ fontSize:11, color:'var(--text-muted)', marginBottom:4 }}>{t(lang,'gcal.match_etab')}</div>
                      <select value={ev.matchedEtabId} onChange={e=>updateEvent(i,{matchedEtabId:e.target.value,matchedCreneauIdx:-1})} style={inp}>
                        <option value="">— Aucun —</option>
                        {etabs.map(e=><option key={e.id} value={e.id}>{e.nom} ({e.taux_horaire}€/h)</option>)}
                        <option value="__new__">+ {t(lang,'gcal.create_etab')}</option>
                      </select>
                      {ev.matchedEtabId==='__new__' && (
                        <input value={ev.newEtabName} onChange={e=>updateEvent(i,{newEtabName:e.target.value})} placeholder="Nom de l'établissement" style={{ ...inp, marginTop:6 }}/>
                      )}
                    </div>
                    {ev.matchedEtabId && ev.matchedEtabId!=='__new__' && (etabs.find(e=>e.id===ev.matchedEtabId)?.creneaux||[]).length>0 ? (
                      <div>
                        <div style={{ fontSize:11, color:'var(--text-muted)', marginBottom:4 }}>{t(lang,'gcal.match_creneau')}</div>
                        <select value={ev.matchedCreneauIdx>=0?String(ev.matchedCreneauIdx):''} onChange={e=>updateEvent(i,{matchedCreneauIdx:e.target.value!==''?Number(e.target.value):-1})} style={inp}>
                          <option value="">— Aucun (heures réelles) —</option>
                          {(etabs.find(e=>e.id===ev.matchedEtabId)?.creneaux||[]).map((c:any,ci:number)=>{
                            const etab = etabs.find(e=>e.id===ev.matchedEtabId)!
                            const [hd,md] = c.heure_debut.split(':').map(Number)
                            const [hf,mf] = c.heure_fin.split(':').map(Number)
                            const h = Math.max(0, (hf*60+mf-hd*60-md)/60 - (c.pause_minutes||0)/60)
                            const sal = (h*etab.taux_horaire).toFixed(2)
                            return <option key={ci} value={ci}>{c.label} ({c.heure_debut}→{c.heure_fin}) · {sal}€</option>
                          })}
                        </select>
                      </div>
                    ) : (
                      <div style={{ display:'flex', alignItems:'center' }}>
                        {ev.matchedEtabId && ev.matchedEtabId!=='__new__' && (
                          <div style={{ fontSize:12, color:'var(--text-dim)', padding:'7px 10px', background:'var(--bg-input)', borderRadius:7, width:'100%' }}>
                            Pas de créneau défini → heures calculées depuis l'événement
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
