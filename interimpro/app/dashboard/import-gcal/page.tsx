'use client'
import { useState, useEffect, useCallback } from 'react'
import { getSupabase } from '@/lib/supabase/client'
import { useTheme } from '@/lib/theme-context'
import { t } from '@/lib/i18n'

type Etab = { id:string; nom:string; taux_horaire:number; creneaux:any[] }
type GCalEvent = {
  id:string; title:string; start:string; end:string; description?:string
  calendarId:string; calendarName:string
  matchedEtabId:string; newEtabName:string; matchedCreneauIdx:number
  isDuplicate:boolean; selected:boolean
}
type GCalendar = { id:string; summary:string; backgroundColor:string; primary?:boolean }

// ─── Parsing iCal ───────────────────────────────────────────
function parseIcal(text:string): Pick<GCalEvent,'id'|'title'|'start'|'end'|'description'>[] {
  const events: any[] = []
  const lines = text.replace(/\r\n /g,'').replace(/\r\n/g,'\n').split('\n')
  let cur: any = null
  for (const raw of lines) {
    const line = raw.trim()
    if (line==='BEGIN:VEVENT') { cur = {} }
    else if (line==='END:VEVENT' && cur) { if(cur.title&&cur.start) events.push(cur); cur = null }
    else if (cur) {
      if (/^SUMMARY/i.test(line)) cur.title = line.replace(/^SUMMARY[^:]*:/i,'').replace(/\\,/g,',').trim()
      if (/^UID/i.test(line)) cur.id = line.replace(/^UID[^:]*:/i,'').trim()
      if (/^DTSTART/i.test(line)) cur.start = line.split(':').slice(1).join(':').replace(/Z$/,'')
      if (/^DTEND/i.test(line)) cur.end = line.split(':').slice(1).join(':').replace(/Z$/,'')
      if (/^DESCRIPTION/i.test(line)) cur.description = line.replace(/^DESCRIPTION[^:]*:/i,'').replace(/\\n/g,' ').trim()
    }
  }
  return events.map(e=>({ id:e.id||`${e.title}-${e.start}`, title:e.title, start:e.start, end:e.end||e.start, description:e.description }))
}

function icalToISO(s:string): string {
  if (!s) return new Date().toISOString()
  const y=s.slice(0,4), mo=s.slice(4,6), d=s.slice(6,8)
  const hasTime = s.length > 8
  const h = hasTime ? s.slice(9,11)||'08' : '08'
  const mi = hasTime ? s.slice(11,13)||'00' : '00'
  return `${y}-${mo}-${d}T${h}:${mi}:00`
}

function fmtIcalDate(s:string) {
  if (!s) return '—'
  try {
    return `${s.slice(6,8)}/${s.slice(4,6)}/${s.slice(0,4)}${s.length>8?' '+s.slice(9,11)+':'+s.slice(11,13):''}`
  } catch { return s }
}

function matchEtab(title:string, etabs:Etab[]): string {
  const tl = title.toLowerCase()
  for (const e of etabs) {
    const el = e.nom.toLowerCase()
    if (tl.includes(el) || el.split(' ').some(w=>w.length>3&&tl.includes(w))) return e.id
  }
  return ''
}

export default function ImportGCalPage() {
  const [etabs, setEtabs] = useState<Etab[]>([])
  const [events, setEvents] = useState<GCalEvent[]>([])
  const [calendars, setCalendars] = useState<GCalendar[]>([])
  const [selectedCals, setSelectedCals] = useState<Set<string>>(new Set())
  const [existingIds, setExistingIds] = useState<Set<string>>(new Set())
  const [userId, setUserId] = useState<string|null>(null)
  const [loading, setLoading] = useState(false)
  const [importing, setImporting] = useState(false)
  const [done, setDone] = useState(0)
  const [icalUrl, setIcalUrl] = useState('')
  const [tab, setTab] = useState<'gcal'|'ical'>('gcal')
  const [providerToken, setProviderToken] = useState<string|null>(null)
  const { accent, lang } = useTheme()

  useEffect(() => {
    getSupabase().auth.getSession().then(({ data }) => {
      if (!data.session?.user?.id) return
      const uid = data.session.user.id
      setUserId(uid)
      setProviderToken(data.session.provider_token || null)
      Promise.all([
        getSupabase().from('etablissements').select('id,nom,taux_horaire,creneaux').eq('user_id',uid).eq('archived',false),
        getSupabase().from('missions').select('google_event_id').eq('user_id',uid).not('google_event_id','is',null)
      ]).then(([e,m]) => {
        setEtabs((e.data||[]) as Etab[])
        setExistingIds(new Set((m.data||[]).map((x:any)=>x.google_event_id).filter(Boolean)))
      })
    })
  }, [])

  // Connecter Google et récupérer la liste des calendriers
  const connectGCal = async () => {
    const { error } = await getSupabase().auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/dashboard/import-gcal`,
        scopes: 'https://www.googleapis.com/auth/calendar.readonly',
        queryParams: { access_type: 'offline', prompt: 'consent' }
      }
    })
    if (error) alert('Erreur: ' + error.message)
  }

  // Récupérer la liste de tous les calendriers Google
  const fetchCalendars = async () => {
    if (!providerToken) { alert('Connectez-vous d\'abord avec Google'); return }
    setLoading(true)
    try {
      const r = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList', {
        headers: { Authorization: `Bearer ${providerToken}` }
      })
      if (!r.ok) { alert('Erreur API Google: ' + r.status); setLoading(false); return }
      const data = await r.json()
      const cals: GCalendar[] = (data.items||[]).map((c:any) => ({
        id: c.id, summary: c.summary, backgroundColor: c.backgroundColor||'#4285F4', primary: c.primary
      }))
      setCalendars(cals)
      // Sélectionner le calendrier principal par défaut
      setSelectedCals(new Set(cals.filter(c=>c.primary).map(c=>c.id)))
    } catch(e:any) { alert('Erreur: ' + e.message) }
    setLoading(false)
  }

  // Charger les événements des calendriers sélectionnés
  const fetchEvents = async () => {
    if (!providerToken || selectedCals.size===0) { alert('Sélectionnez au moins un calendrier'); return }
    setLoading(true)
    const now = new Date()
    const timeMin = new Date(now.getFullYear(), now.getMonth()-1, 1).toISOString()
    const timeMax = new Date(now.getFullYear()+1, 11, 31).toISOString()
    const allEvents: GCalEvent[] = []

    for (const calId of selectedCals) {
      const cal = calendars.find(c=>c.id===calId)
      try {
        const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calId)}/events?timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}&maxResults=500&singleEvents=true&orderBy=startTime`
        const r = await fetch(url, { headers: { Authorization: `Bearer ${providerToken}` } })
        if (!r.ok) continue
        const data = await r.json()
        for (const e of (data.items||[])) {
          if (!e.summary) continue
          const start = (e.start?.dateTime||e.start?.date||'').replace(/[-:]/g,'').replace('T','T').slice(0,15)
          const end = (e.end?.dateTime||e.end?.date||start).replace(/[-:]/g,'').replace('T','T').slice(0,15)
          allEvents.push({
            id: e.id, title: e.summary, start, end, description: e.description,
            calendarId: calId, calendarName: cal?.summary||calId,
            isDuplicate: existingIds.has(e.id), selected: !existingIds.has(e.id),
            matchedEtabId: matchEtab(e.summary, etabs), newEtabName: '', matchedCreneauIdx: -1
          })
        }
      } catch {}
    }
    setEvents(allEvents)
    setDone(0)
    setLoading(false)
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
    } catch { alert('Impossible de charger cette URL') }
    setLoading(false)
  }

  const applyIcal = (text:string) => {
    const parsed = parseIcal(text)
    setEvents(parsed.map(e => ({
      ...e, calendarId:'ical', calendarName:'Fichier iCal',
      isDuplicate: existingIds.has(e.id), selected: !existingIds.has(e.id),
      matchedEtabId: matchEtab(e.title, etabs), newEtabName: '', matchedCreneauIdx: -1
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
      let etabId = ev.matchedEtabId === '__new__' ? '' : ev.matchedEtabId

      // Créer le nouvel établissement si demandé
      if ((!etabId || ev.matchedEtabId==='__new__') && ev.newEtabName.trim()) {
        const { data, error } = await sb.from('etablissements').insert({
          user_id: userId,
          nom: ev.newEtabName.trim(),
          type_etablissement: 'Établissement',
          type: 'Établissement',
          taux_horaire: 16.32,
          creneaux: [],
          archived: false,
          adresse: '',
          telephone: '',
          email_contact: '',
          email: '',
          contact_nom: '',
          notes: '',
        }).select('id').single()

        if (error) { console.error('Erreur création étab:', error.message); continue }
        if (data) {
          etabId = data.id
          // Rafraîchir la liste des étabs localement
          setEtabs(prev => [...prev, { id:data.id, nom:ev.newEtabName.trim(), taux_horaire:16.32, creneaux:[] }])
        }
      }

      const etab = etabs.find(e=>e.id===etabId) || (etabId ? { taux_horaire:16.32, creneaux:[] } as any : null)
      const creneau = ev.matchedCreneauIdx>=0 && etab?.creneaux?.[ev.matchedCreneauIdx]
        ? etab.creneaux[ev.matchedCreneauIdx] : null

      const debut = creneau
        ? `${ev.start.slice(0,4)}-${ev.start.slice(4,6)}-${ev.start.slice(6,8)}T${creneau.heure_debut}:00`
        : icalToISO(ev.start)
      const fin = creneau
        ? `${ev.start.slice(0,4)}-${ev.start.slice(4,6)}-${ev.start.slice(6,8)}T${creneau.heure_fin}:00`
        : icalToISO(ev.end)

      const pause = creneau?.pause_minutes ? creneau.pause_minutes/60 : 1
      const heures = Math.max(0, (new Date(fin).getTime()-new Date(debut).getTime())/3600000-pause)
      const taux = (etab as any)?.taux_horaire || 16.32
      const salaire = Math.round(heures*taux*100)/100

      const { error: mErr } = await sb.from('missions').insert({
        user_id: userId,
        titre: ev.title,
        etablissement_id: etabId || null,
        date_debut: debut,
        date_fin: fin,
        pause_heures: pause,
        heures,
        salaire_estime: salaire,
        statut: 'a_venir',
        source: 'google_calendar',
        google_event_id: ev.id,
        creneau_label: creneau?.label || null,
        notes: ev.description || null,
      })

      if (mErr) { console.error('Erreur import mission:', mErr.message); continue }
      count++
    }

    setDone(count)
    setEvents([])
    setImporting(false)
  }

  const toImport = events.filter(e=>e.selected&&!e.isDuplicate)
  const dupCount = events.filter(e=>e.isDuplicate).length
  const inp: React.CSSProperties = { width:'100%', padding:'7px 10px', borderRadius:7, border:'1px solid var(--border)', background:'var(--bg-input)', color:'var(--text)', fontSize:12, outline:'none' }
  const tabBtn = (active:boolean): React.CSSProperties => ({
    padding:'9px 18px', border:'none', background:active?'var(--bg-hover)':'transparent',
    color:active?'var(--text)':'var(--text-dim)', cursor:'pointer', fontSize:14,
    fontWeight:active?700:400, borderBottom:active?`2px solid ${accent}`:'2px solid transparent'
  })

  // Grouper les événements par calendrier
  const eventsByCalendar = events.reduce((acc, ev) => {
    if (!acc[ev.calendarId]) acc[ev.calendarId] = { name:ev.calendarName, events:[] }
    acc[ev.calendarId].events.push(ev)
    return acc
  }, {} as Record<string,{name:string;events:GCalEvent[]}>)

  return (
    <div>
      <h1 style={{ fontSize:26, fontWeight:800, color:'var(--text)', marginBottom:4 }}>{t(lang,'gcal.title')}</h1>
      <p style={{ fontSize:14, color:'var(--text-dim)', marginBottom:22 }}>Importez vos missions avec sélection des calendriers, déduplication automatique et association aux établissements.</p>

      {done>0 && (
        <div style={{ background:'rgba(16,185,129,.1)', border:'1px solid rgba(16,185,129,.3)', borderRadius:10, padding:'12px 18px', marginBottom:18, fontSize:14, color:'#10b981', fontWeight:600 }}>
          ✅ {done} mission{done>1?'s':''} importée{done>1?'s':''} avec succès !
        </div>
      )}

      {/* Onglets */}
      <div style={{ display:'inline-flex', background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:'10px 10px 0 0', overflow:'hidden' }}>
        <button style={tabBtn(tab==='gcal')} onClick={()=>setTab('gcal')}>📅 Google Agenda</button>
        <button style={tabBtn(tab==='ical')} onClick={()=>setTab('ical')}>📂 Fichier .ics / URL</button>
      </div>

      <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderTop:'none', borderRadius:'0 10px 10px 10px', padding:22, marginBottom:18 }}>
        {tab==='gcal' ? (
          <div>
            {/* Étape 1 : connexion */}
            <div style={{ background:'var(--bg-input)', borderRadius:10, padding:'14px 16px', marginBottom:16 }}>
              <div style={{ fontSize:13, fontWeight:700, color:'var(--text)', marginBottom:8 }}>Étape 1 — Connexion Google</div>
              <div style={{ display:'flex', gap:10, flexWrap:'wrap', alignItems:'center' }}>
                <button onClick={connectGCal} style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 18px', borderRadius:9, border:'1.5px solid #e5e7eb', background:'white', cursor:'pointer', fontSize:14, fontWeight:600, color:'#374151' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                  Se connecter avec Google
                </button>
                {providerToken && <button onClick={fetchCalendars} disabled={loading} style={{ padding:'10px 18px', borderRadius:9, border:'none', background:`${accent}20`, color:accent, cursor:'pointer', fontSize:14, fontWeight:600 }}>{loading?'⏳':'📋 Voir mes calendriers'}</button>}
                {providerToken && <span style={{ fontSize:12, color:'#10b981' }}>✅ Connecté</span>}
              </div>
            </div>

            {/* Étape 2 : sélection des calendriers */}
            {calendars.length>0 && (
              <div style={{ background:'var(--bg-input)', borderRadius:10, padding:'14px 16px', marginBottom:16 }}>
                <div style={{ fontSize:13, fontWeight:700, color:'var(--text)', marginBottom:10 }}>Étape 2 — Choisir les calendriers à importer</div>
                <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginBottom:12 }}>
                  {calendars.map(cal=>(
                    <label key={cal.id} style={{ display:'flex', alignItems:'center', gap:7, padding:'7px 12px', borderRadius:8, border:`1.5px solid ${selectedCals.has(cal.id)?cal.backgroundColor:'var(--border)'}`, background:selectedCals.has(cal.id)?cal.backgroundColor+'20':'var(--bg-card)', cursor:'pointer', fontSize:13, fontWeight:selectedCals.has(cal.id)?700:400, color:selectedCals.has(cal.id)?cal.backgroundColor:'var(--text-muted)' }}>
                      <input type="checkbox" checked={selectedCals.has(cal.id)} onChange={e=>{
                        const s = new Set(selectedCals)
                        if (e.target.checked) s.add(cal.id); else s.delete(cal.id)
                        setSelectedCals(s)
                      }} style={{ accentColor:cal.backgroundColor, flexShrink:0 }}/>
                      <span style={{ width:10, height:10, borderRadius:'50%', background:cal.backgroundColor, flexShrink:0 }}/>
                      {cal.summary}{cal.primary?' (principal)':''}
                    </label>
                  ))}
                </div>
                <button onClick={fetchEvents} disabled={loading||selectedCals.size===0} style={{ padding:'10px 20px', borderRadius:9, border:'none', background:`linear-gradient(135deg,${accent},#a855f7)`, color:'white', cursor:'pointer', fontSize:14, fontWeight:700, opacity:selectedCals.size===0?.5:1 }}>
                  {loading?'⏳ Chargement...':'📥 Charger les événements'}
                </button>
              </div>
            )}

            {calendars.length===0 && providerToken && (
              <div style={{ fontSize:12, color:'var(--text-dim)', padding:'8px 12px', background:'var(--bg-input)', borderRadius:8 }}>
                Cliquez sur "Voir mes calendriers" pour charger la liste de vos agendas Google.
              </div>
            )}
            {!providerToken && (
              <div style={{ fontSize:12, color:'var(--text-dim)', padding:'8px 12px', background:'var(--bg-input)', borderRadius:8, lineHeight:1.7 }}>
                <strong style={{ color:'var(--text)' }}>Comment ça marche :</strong><br/>
                1. Cliquez "Se connecter" → autorisez l'accès lecture à Google Agenda<br/>
                2. Cliquez "Voir mes calendriers" → sélectionnez les agendas à importer<br/>
                3. Chargez les événements → associez les établissements → importez
              </div>
            )}
          </div>
        ) : (
          <div>
            <p style={{ fontSize:13, color:'var(--text-muted)', marginBottom:14 }}>Exportez votre agenda depuis Google Agenda → ⚙️ Paramètres → Importer et exporter → Exporter</p>
            <div style={{ display:'flex', gap:12, alignItems:'center', flexWrap:'wrap' }}>
              <label style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 18px', borderRadius:9, border:`1.5px solid ${accent}`, background:'var(--accent-dim)', color:accent, cursor:'pointer', fontSize:14, fontWeight:600 }}>
                📂 Choisir un fichier .ics
                <input type="file" accept=".ics,.ical" style={{ display:'none' }} onChange={e=>e.target.files?.[0]&&handleIcalFile(e.target.files[0])}/>
              </label>
              <span style={{ color:'var(--text-dim)', fontSize:13 }}>ou</span>
              <div style={{ flex:1, display:'flex', gap:8, minWidth:240 }}>
                <input value={icalUrl} onChange={e=>setIcalUrl(e.target.value)} placeholder="URL iCal publique..." style={{ flex:1, padding:'10px 12px', borderRadius:9, border:'1px solid var(--border)', background:'var(--bg-input)', color:'var(--text)', fontSize:13, outline:'none' }}/>
                <button onClick={handleIcalUrl} disabled={loading||!icalUrl} style={{ padding:'10px 16px', borderRadius:9, border:'none', background:accent, color:'white', cursor:'pointer', fontSize:13, fontWeight:700 }}>{loading?'⏳':'▶'}</button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Liste des événements groupés par calendrier */}
      {events.length>0 && (
        <div>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14, flexWrap:'wrap', gap:10 }}>
            <div>
              <span style={{ fontWeight:700, color:'var(--text)', fontSize:15 }}>{events.length} événements · {toImport.length} à importer</span>
              {dupCount>0 && <span style={{ marginLeft:10, fontSize:13, color:'var(--text-dim)' }}>{dupCount} déjà importés</span>}
            </div>
            <div style={{ display:'flex', gap:10 }}>
              <button onClick={()=>setEvents(ev=>ev.map(e=>!e.isDuplicate?{...e,selected:true}:e))} style={{ padding:'7px 14px', borderRadius:8, border:'1px solid var(--border)', background:'var(--bg-input)', color:'var(--text-muted)', cursor:'pointer', fontSize:13 }}>Tout sélectionner</button>
              <button onClick={doImport} disabled={importing||toImport.length===0} style={{ padding:'10px 20px', borderRadius:9, border:'none', background:`linear-gradient(135deg,${accent},#a855f7)`, color:'white', cursor:'pointer', fontSize:14, fontWeight:700, opacity:toImport.length===0?.5:1 }}>
                {importing ? t(lang,'gcal.importing') : `${t(lang,'gcal.confirm_import')} (${toImport.length})`}
              </button>
            </div>
          </div>

          {Object.entries(eventsByCalendar).map(([calId, { name, events: calEvents }]) => (
            <div key={calId} style={{ marginBottom:20 }}>
              {Object.keys(eventsByCalendar).length>1 && (
                <div style={{ fontSize:12, fontWeight:700, color:'var(--text-muted)', marginBottom:8, display:'flex', alignItems:'center', gap:6 }}>
                  📅 {name} <span style={{ fontSize:11, opacity:.7 }}>({calEvents.filter(e=>!e.isDuplicate).length} à importer)</span>
                </div>
              )}
              <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
                {calEvents.map((ev,i) => {
                  const globalIdx = events.findIndex(e=>e.id===ev.id)
                  return (
                    <div key={ev.id} style={{ background:ev.isDuplicate?'var(--bg-input)':'var(--bg-card)', border:`1px solid ${ev.selected&&!ev.isDuplicate?accent+'40':'var(--border)'}`, borderRadius:10, padding:'12px 14px', opacity:ev.isDuplicate?.5:1 }}>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:ev.isDuplicate?0:10 }}>
                        <div style={{ display:'flex', gap:9, alignItems:'flex-start' }}>
                          {!ev.isDuplicate && (
                            <input type="checkbox" checked={ev.selected} onChange={e=>updateEvent(globalIdx,{selected:e.target.checked})} style={{ marginTop:3, accentColor:accent, width:15, height:15, flexShrink:0 }}/>
                          )}
                          <div>
                            <div style={{ fontWeight:700, color:'var(--text)', fontSize:14 }}>{ev.title}</div>
                            <div style={{ fontSize:11, color:'var(--text-dim)', marginTop:1 }}>{fmtIcalDate(ev.start)} → {fmtIcalDate(ev.end)}</div>
                          </div>
                        </div>
                        {ev.isDuplicate && <span style={{ fontSize:11, color:'var(--text-dim)', background:'var(--bg-hover)', borderRadius:100, padding:'2px 8px', flexShrink:0 }}>déjà importé</span>}
                      </div>

                      {ev.selected && !ev.isDuplicate && (
                        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginLeft:24 }}>
                          <div>
                            <div style={{ fontSize:11, color:'var(--text-muted)', marginBottom:4 }}>{t(lang,'gcal.match_etab')}</div>
                            <select value={ev.matchedEtabId} onChange={e2=>updateEvent(globalIdx,{matchedEtabId:e2.target.value,matchedCreneauIdx:-1})} style={inp}>
                              <option value="">— Aucun —</option>
                              {etabs.map(e=><option key={e.id} value={e.id}>{e.nom} ({e.taux_horaire}€/h)</option>)}
                              <option value="__new__">+ Créer un établissement</option>
                            </select>
                            {ev.matchedEtabId==='__new__' && (
                              <input value={ev.newEtabName} onChange={e2=>updateEvent(globalIdx,{newEtabName:e2.target.value})} placeholder="Nom de l'établissement" style={{ ...inp, marginTop:6 }}/>
                            )}
                          </div>
                          {ev.matchedEtabId && ev.matchedEtabId!=='__new__' && (etabs.find(e=>e.id===ev.matchedEtabId)?.creneaux||[]).length>0 ? (
                            <div>
                              <div style={{ fontSize:11, color:'var(--text-muted)', marginBottom:4 }}>{t(lang,'gcal.match_creneau')}</div>
                              <select value={ev.matchedCreneauIdx>=0?String(ev.matchedCreneauIdx):''} onChange={e2=>updateEvent(globalIdx,{matchedCreneauIdx:e2.target.value!==''?Number(e2.target.value):-1})} style={inp}>
                                <option value="">— Horaires de l'événement —</option>
                                {(etabs.find(e=>e.id===ev.matchedEtabId)?.creneaux||[]).map((c:any,ci:number)=>{
                                  const etab = etabs.find(e=>e.id===ev.matchedEtabId)!
                                  const [hd,md]=(c.heure_debut||'08:00').split(':').map(Number)
                                  const [hf,mf]=(c.heure_fin||'16:00').split(':').map(Number)
                                  const h=Math.max(0,(hf*60+mf-hd*60-md)/60-(c.pause_minutes||0)/60)
                                  const sal=(h*etab.taux_horaire).toFixed(2)
                                  return <option key={ci} value={ci}>{c.label} ({c.heure_debut}→{c.heure_fin}) · {sal}€</option>
                                })}
                              </select>
                            </div>
                          ) : (
                            <div style={{ display:'flex', alignItems:'center' }}>
                              {ev.matchedEtabId && ev.matchedEtabId!=='__new__' && (
                                <div style={{ fontSize:12, color:'var(--text-dim)', padding:'7px 10px', background:'var(--bg-input)', borderRadius:7, width:'100%' }}>
                                  Pas de créneau → horaires depuis l'événement Google
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
