'use client'
import { useState, useEffect, useCallback } from 'react'
import { getSupabase } from '@/lib/supabase/client'
import { useTheme } from '@/lib/theme-context'
import { t } from '@/lib/i18n'

type Mission = { id:string; titre:string; date_debut:string; date_fin:string; etablissement_id:string; statut:string; heures:number; salaire_estime:number; majoration_nuit:boolean; majoration_dimanche:boolean; majoration_ferie:boolean; pause_heures:number; notes:string }
type Etab = { id:string; nom:string; taux_horaire:number; creneaux?:any[] }

function getEaster(y:number):Date {
  const a=y%19,b=Math.floor(y/100),c=y%100,d=Math.floor(b/4),e=b%4,f=Math.floor((b+8)/25)
  const g=Math.floor((b-f+1)/3),h=(19*a+b-d-g+15)%30,i=Math.floor(c/4),k=c%4
  const l=(32+2*e+2*i-h-k)%7,m=Math.floor((a+11*h+22*l)/451)
  const mo=Math.floor((h+l-7*m+114)/31),da=((h+l-7*m+114)%31)+1
  return new Date(y,mo-1,da)
}
function addDays(d:Date,n:number):Date { const r=new Date(d); r.setDate(r.getDate()+n); return r }
function fmtDate(d:Date):string { return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}` }
function getHolidays(y:number,lang:string):Map<string,string> {
  const e=getEaster(y), map=new Map<string,string>()
  if(lang==='en') {
    map.set(`${y}-01-01`,'New Year'); map.set(`${y}-05-05`,'Early May'); map.set(`${y}-05-26`,'Spring BH')
    map.set(`${y}-08-25`,'Late Summer'); map.set(`${y}-12-25`,'Christmas'); map.set(`${y}-12-26`,'Boxing Day')
    map.set(fmtDate(addDays(e,-2)),'Good Friday'); map.set(fmtDate(addDays(e,1)),'Easter Monday')
  } else if(lang==='es') {
    map.set(`${y}-01-01`,'Año Nuevo'); map.set(`${y}-01-06`,'Reyes Magos'); map.set(`${y}-05-01`,'Día del Trabajo')
    map.set(`${y}-10-12`,'Día de la Hispanidad'); map.set(`${y}-11-01`,'Todos los Santos')
    map.set(`${y}-12-06`,'Día de la Constitución'); map.set(`${y}-12-08`,'Inmaculada'); map.set(`${y}-12-25`,'Navidad')
    map.set(fmtDate(addDays(e,-2)),'Viernes Santo')
  } else {
    const labels: [string,string][] = [
      [`${y}-01-01`,'Jour de l\'an'],[`${y}-05-01`,'Fête du Travail'],[`${y}-05-08`,'Victoire 1945'],
      [`${y}-07-14`,'Fête Nationale'],[`${y}-08-15`,'Assomption'],[`${y}-11-01`,'Toussaint'],
      [`${y}-11-11`,'Armistice'],[`${y}-12-25`,'Noël'],
    ]
    labels.forEach(([k,v])=>map.set(k,v))
    map.set(fmtDate(addDays(e,1)),'Lundi de Pâques')
    map.set(fmtDate(addDays(e,39)),'Ascension')
    map.set(fmtDate(addDays(e,50)),'Lundi de Pentecôte')
  }
  return map
}

function calcH(d:string,f:string,p:number){ if(!d||!f) return 0; const a=new Date('2000-01-01T'+d),b=new Date('2000-01-01T'+f); return Math.max(0,(b.getTime()-a.getTime())/3600000-p) }
function calcS(h:number,ta:number,n:boolean,d:boolean,f:boolean){ let m=0; if(n)m+=.25; if(d)m+=.50; if(f)m+=1; return Math.round(h*ta*(1+m)*100)/100 }

function MissionModal({ date, mission, etabs, onClose, onSaved }: { date?:Date; mission?:Mission; etabs:Etab[]; onClose:()=>void; onSaved:()=>void }) {
  
  const { accent, lang, userId } = useTheme()
  const today = date ? fmtDate(date) : fmtDate(new Date())
  const [form, setForm] = useState({
    etablissement_id: mission?.etablissement_id||'',
    titre: mission?.titre||'',
    date: mission?.date_debut?.split('T')[0]||today,
    debut: mission?.date_debut?.split('T')[1]?.slice(0,5)||'08:00',
    fin: mission?.date_fin?.split('T')[1]?.slice(0,5)||'18:00',
    pause_heures: mission?.pause_heures??1,
    majoration_nuit: mission?.majoration_nuit||false,
    majoration_dimanche: mission?.majoration_dimanche||false,
    majoration_ferie: mission?.majoration_ferie||false,
    notes: mission?.notes||'',
  })
  const [mode, setMode] = useState<'view'|'edit'>(mission?'view':'edit')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const etab = etabs.find(e=>e.id===form.etablissement_id)
  const heures = calcH(form.debut, form.fin, Number(form.pause_heures))
  const salaire = calcS(heures, etab?.taux_horaire||0, form.majoration_nuit, form.majoration_dimanche, form.majoration_ferie)
  const fmtEur = (n:number) => n.toLocaleString('fr-FR',{style:'currency',currency:'EUR',minimumFractionDigits:2})
  const inp: React.CSSProperties = { width:'100%', padding:'9px 12px', borderRadius:8, border:'1px solid var(--border)', background:'var(--bg-input)', color:'var(--text)', fontSize:14, outline:'none', boxSizing:'border-box' }

  const handleSave = async (e:React.FormEvent) => {
    e.preventDefault()
    if (!userId) { setError('Non connecté'); return }
    setSaving(true); setError('')
    const payload = { user_id:userId, etablissement_id:form.etablissement_id, titre:form.titre, date_debut:`${form.date}T${form.debut}:00`, date_fin:`${form.date}T${form.fin}:00`, pause_heures:Number(form.pause_heures), heures, salaire_estime:salaire, majoration_nuit:form.majoration_nuit, majoration_dimanche:form.majoration_dimanche, majoration_ferie:form.majoration_ferie, notes:form.notes, source:'manual', statut:'a_venir' }
    let res
    if (mission) res = await supabase.from('missions').update(payload).eq('id',mission.id).eq('user_id',userId)
    else res = await supabase.from('missions').insert(payload)
    if (res.error) { setError(res.error.message); setSaving(false); return }
    setSaving(false); onSaved(); onClose()
  }

  const del = async () => {
    if (!mission||!userId) return
    if (!confirm(t(lang,'gen.confirm_delete'))) return
    await supabase.from('missions').delete().eq('id',mission.id).eq('user_id',userId)
    onSaved(); onClose()
  }

  return (
    <div style={{ position:'fixed', inset:0, background:'var(--overlay)', zIndex:500, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{ background:'var(--bg-modal)', border:'1px solid var(--border)', borderRadius:14, padding:28, width:'100%', maxWidth:500, maxHeight:'90vh', overflow:'auto', boxShadow:`0 24px 60px var(--shadow)`, animation:'slideIn .2s ease' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
          <h2 style={{ fontSize:17, fontWeight:800, color:'var(--text)' }}>
            {mode==='view' ? '📅 '+t(lang,'cal.detail') : mission ? '✏️ '+t(lang,'cal.edit') : '➕ '+t(lang,'cal.new')}
          </h2>
          <div style={{ display:'flex', gap:8 }}>
            {mission && mode==='view' && <button onClick={()=>setMode('edit')} style={{ padding:'5px 12px', borderRadius:7, border:`1px solid ${accent}`, background:'transparent', color:accent, cursor:'pointer', fontSize:12, fontWeight:600 }}>{t(lang,'gen.modify')}</button>}
            {mission && mode==='edit' && <button onClick={del} style={{ padding:'5px 12px', borderRadius:7, border:'1px solid rgba(239,68,68,.3)', background:'rgba(239,68,68,.05)', color:'#ef4444', cursor:'pointer', fontSize:12, fontWeight:600 }}>{t(lang,'miss.delete')}</button>}
            <button onClick={onClose} style={{ background:'none', border:'none', color:'var(--text-dim)', cursor:'pointer', fontSize:20 }}>✕</button>
          </div>
        </div>
        {error && <div style={{ padding:'8px 12px', borderRadius:7, background:'rgba(239,68,68,.1)', border:'1px solid rgba(239,68,68,.3)', fontSize:13, color:'#ef4444', marginBottom:12 }}>❌ {error}</div>}

        {mode==='view' && mission ? (
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            <div style={{ background:'var(--bg-input)', borderRadius:9, padding:'14px 16px' }}>
              <div style={{ fontSize:18, fontWeight:800, color:'var(--text)', marginBottom:3 }}>{mission.titre}</div>
              <div style={{ fontSize:13, color:'var(--text-muted)' }}>{etabs.find(e=>e.id===mission.etablissement_id)?.nom}</div>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10 }}>
              {[['📅',new Date(mission.date_debut).toLocaleDateString('fr-FR',{day:'numeric',month:'long'})],['⏰',`${mission.heures}h`],['💶',fmtEur(mission.salaire_estime)]].map(([ic,v],i)=>(
                <div key={i} style={{ background:'var(--bg-input)', borderRadius:8, padding:'10px 12px', textAlign:'center' }}>
                  <div style={{ fontSize:16, marginBottom:4 }}>{ic}</div>
                  <div style={{ fontSize:13, fontWeight:700, color: i===2?accent:'var(--text)' }}>{v}</div>
                </div>
              ))}
            </div>
            <button onClick={()=>setMode('edit')} style={{ padding:'11px', borderRadius:9, border:'none', background:`linear-gradient(135deg,${accent},#a855f7)`, color:'white', cursor:'pointer', fontSize:14, fontWeight:700 }}>✏️ {t(lang,'gen.modify')}</button>
          </div>
        ) : (
          <form onSubmit={handleSave} style={{ display:'flex', flexDirection:'column', gap:12 }}>
            <div><label style={{ display:'block', fontSize:12, fontWeight:600, color:'var(--text-muted)', marginBottom:4 }}>{t(lang,'miss.etab_required')}</label>
              <select required value={form.etablissement_id} onChange={e=>setForm({...form,etablissement_id:e.target.value})} style={inp}>
                <option value="">—</option>
                {etabs.map(e=><option key={e.id} value={e.id}>{e.nom}</option>)}
              </select>
            </div>
            <div><label style={{ display:'block', fontSize:12, fontWeight:600, color:'var(--text-muted)', marginBottom:4 }}>{t(lang,'miss.title_service')}</label>
              <input required value={form.titre} onChange={e=>setForm({...form,titre:e.target.value})} placeholder="Urgences..." style={inp}/>
            </div>
            <div><label style={{ display:'block', fontSize:12, fontWeight:600, color:'var(--text-muted)', marginBottom:4 }}>{t(lang,'miss.date_label')}</label>
              <input type="date" value={form.date} onChange={e=>setForm({...form,date:e.target.value})} style={inp}/>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8 }}>
              <div><label style={{ display:'block', fontSize:12, fontWeight:600, color:'var(--text-muted)', marginBottom:4 }}>{t(lang,'miss.start')}</label><input type="time" value={form.debut} onChange={e=>setForm({...form,debut:e.target.value})} style={inp}/></div>
              <div><label style={{ display:'block', fontSize:12, fontWeight:600, color:'var(--text-muted)', marginBottom:4 }}>{t(lang,'miss.end')}</label><input type="time" value={form.fin} onChange={e=>setForm({...form,fin:e.target.value})} style={inp}/></div>
              <div><label style={{ display:'block', fontSize:12, fontWeight:600, color:'var(--text-muted)', marginBottom:4 }}>{t(lang,'miss.break')}</label><input type="number" step="0.5" min="0" value={form.pause_heures} onChange={e=>setForm({...form,pause_heures:Number(e.target.value)})} style={inp}/></div>
            </div>
            {heures>0 && <div style={{ background:'var(--bg-input)', borderRadius:8, padding:'10px', textAlign:'center' }}>
              <span style={{ color:'var(--text-muted)', fontSize:13 }}>{t(lang,'miss.calc_hours')} : </span>
              <span style={{ fontSize:16, fontWeight:800, color:'var(--text)' }}>{heures.toFixed(2)}h</span>
            </div>}
            <div>
              <label style={{ display:'block', fontSize:12, fontWeight:600, color:'var(--text-muted)', marginBottom:8 }}>{t(lang,'miss.majorations')}</label>
              <div style={{ display:'flex', gap:12, flexWrap:'wrap' }}>
                {([['majoration_nuit','miss.night'],['majoration_dimanche','miss.sunday'],['majoration_ferie','miss.holiday']] as [string,string][]).map(([k,lk])=>(
                  <label key={k} style={{ display:'flex', alignItems:'center', gap:6, cursor:'pointer', fontSize:12, color:'var(--text-muted)' }}>
                    <input type="radio" checked={(form as any)[k]} onChange={()=>setForm({...form,majoration_nuit:k==='majoration_nuit',majoration_dimanche:k==='majoration_dimanche',majoration_ferie:k==='majoration_ferie'})} style={{ accentColor:accent }}/>{t(lang,lk)}
                  </label>
                ))}
              </div>
            </div>
            <div style={{ background:'var(--accent-dim)', border:'1px solid var(--accent-border)', borderRadius:8, padding:'10px', textAlign:'center' }}>
              <span style={{ color:'var(--text-muted)', fontSize:12 }}>{t(lang,'miss.est_salary')} : </span>
              <span style={{ fontSize:18, fontWeight:800, color:accent }}>{fmtEur(salaire)}</span>
            </div>
            <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
              <button type="button" onClick={onClose} style={{ padding:'9px 16px', borderRadius:8, border:'1px solid var(--border)', background:'transparent', color:'var(--text-muted)', cursor:'pointer', fontSize:13 }}>{t(lang,'miss.cancel')}</button>
              <button type="submit" disabled={saving} style={{ padding:'9px 20px', borderRadius:8, border:'none', background:`linear-gradient(135deg,${accent},#a855f7)`, color:'white', cursor:'pointer', fontSize:13, fontWeight:700 }}>{saving?t(lang,'gen.saving'):mission?t(lang,'miss.save'):t(lang,'miss.create')}</button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

export default function CalendrierPage() {
  const [missions, setMissions] = useState<Mission[]>([])
  const [etabs, setEtabs] = useState<Etab[]>([])
  const [cur, setCur] = useState(new Date())
  const [modal, setModal] = useState<{date?:Date;mission?:Mission}|null>(null)
  const [hoveredDay, setHoveredDay] = useState<number|null>(null)
  
  const { accent, lang, userId } = useTheme()

  const load = useCallback(async () => {
    if (!userId) return
    const [m, e] = await Promise.all([
      supabase.from('missions').select('*').eq('user_id',userId).order('date_debut'),
      supabase.from('etablissements').select('*').eq('user_id',userId),
    ])
    setMissions((m.data||[]) as Mission[])
    setEtabs((e.data||[]) as Etab[])
  }, [userId])

  useEffect(() => { if (userId) load() }, [load, userId])

  const y=cur.getFullYear(), mo=cur.getMonth()
  const firstDay=(new Date(y,mo,1).getDay()+6)%7
  const daysInMonth=new Date(y,mo+1,0).getDate()
  const days:(number|null)[] = []
  for(let i=0;i<firstDay;i++) days.push(null)
  for(let i=1;i<=daysInMonth;i++) days.push(i)
  while(days.length%7!==0) days.push(null)

  const holidays = getHolidays(y, lang)
  const today = new Date()
  const isToday = (d:number) => d===today.getDate()&&mo===today.getMonth()&&y===today.getFullYear()
  const isSunday = (idx:number) => idx%7===6
  const dayStr = (d:number) => `${y}-${String(mo+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`
  const getMissions = (d:number) => missions.filter(m=>m.date_debut?.startsWith(dayStr(d)))
  const moisLabel = cur.toLocaleDateString(lang==='fr'?'fr-FR':lang==='en'?'en-GB':'es-ES',{month:'long',year:'numeric'}).replace(/^\w/,c=>c.toUpperCase())

  const DAYS_HEADER = lang==='en' ? ['MON','TUE','WED','THU','FRI','SAT','SUN']
    : lang==='es' ? ['LUN','MAR','MIÉ','JUE','VIE','SÁB','DOM']
    : ['LUN','MAR','MER','JEU','VEN','SAM','DIM']

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
        <h1 style={{ fontSize:22, fontWeight:800, color:'var(--text)' }}>{t(lang,'cal.title')}</h1>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <button onClick={()=>setCur(new Date(y,mo-1,1))} style={{ width:32, height:32, borderRadius:8, border:'1px solid var(--border)', background:'var(--bg-card)', color:'var(--text-muted)', cursor:'pointer', fontSize:16, display:'flex', alignItems:'center', justifyContent:'center' }}>‹</button>
          <span style={{ fontSize:14, fontWeight:700, color:'var(--text)', minWidth:140, textAlign:'center' }}>{moisLabel}</span>
          <button onClick={()=>setCur(new Date(y,mo+1,1))} style={{ width:32, height:32, borderRadius:8, border:'1px solid var(--border)', background:'var(--bg-card)', color:'var(--text-muted)', cursor:'pointer', fontSize:16, display:'flex', alignItems:'center', justifyContent:'center' }}>›</button>
          <button onClick={()=>setCur(new Date())} style={{ padding:'6px 12px', borderRadius:8, border:`1px solid ${accent}`, background:'var(--accent-dim)', color:accent, cursor:'pointer', fontSize:12, fontWeight:600, marginLeft:4 }}>{t(lang,'cal.today')}</button>
        </div>
      </div>

      <div style={{ display:'flex', gap:14, marginBottom:12, fontSize:11, color:'var(--text-dim)' }}>
        <span>🟣 {t(lang,'cal.today')}</span>
        <span style={{ color:'#f97316' }}>🟠 Dimanche</span>
        <span style={{ color:'#10b981' }}>🟢 Jour férié</span>
        <span>+ Cliquer pour ajouter</span>
      </div>

      <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:12, overflow:'hidden' }}>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', borderBottom:'1px solid var(--border)' }}>
          {DAYS_HEADER.map((d,i)=>(
            <div key={d} style={{ textAlign:'center', padding:'10px 4px', fontSize:11, fontWeight:700, color:i===6?'#f97316':'var(--text-dim)', letterSpacing:'.06em', borderRight:i<6?'1px solid var(--border)':'none' }}>{d}</div>
          ))}
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)' }}>
          {days.map((day,idx) => {
            if (!day) return <div key={idx} style={{ minHeight:100, borderRight:idx%7<6?'1px solid var(--border)':'none', borderBottom:'1px solid var(--border)', background:'var(--bg-hover)', opacity:.5 }}/>
            const dm = getMissions(day)
            const ds = dayStr(day)
            const isHol = holidays.has(ds)
            const holLabel = holidays.get(ds)||''
            const tod = isToday(day)
            const sun = isSunday(idx)
            const hov = hoveredDay===day
            let bg = 'transparent'
            if (isHol) bg = 'rgba(16,185,129,.07)'
            else if (tod) bg = 'var(--accent-dim)'
            else if (sun) bg = 'rgba(249,115,22,.04)'
            return (
              <div key={idx}
                onClick={()=>setModal({ date:new Date(y,mo,day) })}
                onMouseEnter={()=>setHoveredDay(day)}
                onMouseLeave={()=>setHoveredDay(null)}
                style={{ minHeight:100, borderRight:idx%7<6?'1px solid var(--border)':'none', borderBottom:'1px solid var(--border)', padding:6, background: hov && !dm.length ? 'var(--accent-hover)' : bg, cursor:'pointer', position:'relative', transition:'background .1s' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:3 }}>
                  <span style={{ width:22, height:22, borderRadius:'50%', background:tod?accent:'transparent', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:tod?800:500, color:tod?'white':isHol?'#10b981':sun?'#f97316':'var(--text-muted)', flexShrink:0 }}>{day}</span>
                  {/* Icône + au hover si pas de mission */}
                  {hov && !tod && (
                    <span style={{ color:accent, fontSize:16, fontWeight:300, lineHeight:1, opacity:.7 }}>+</span>
                  )}
                </div>
                {isHol && <div style={{ fontSize:9, color:'#10b981', fontWeight:600, marginBottom:2, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>🎉 {holLabel}</div>}
                {dm.slice(0,2).map(m=>{
                  const etab = etabs.find(e=>e.id===m.etablissement_id)
                  const deb = m.date_debut?.split('T')[1]?.slice(0,5)||''
                  const fin = m.date_fin?.split('T')[1]?.slice(0,5)||''
                  return (
                    <div key={m.id} onClick={e=>{e.stopPropagation();setModal({mission:m})}} style={{ background:'var(--accent-dim)', border:'1px solid var(--accent-border)', borderRadius:4, padding:'3px 6px', marginBottom:2, cursor:'pointer' }}>
                      <div style={{ fontSize:10, color:'var(--text)', fontWeight:600, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{etab?.nom||'—'}</div>
                      {(deb||fin) && <div style={{ fontSize:9, color:'var(--text-dim)' }}>{deb}–{fin}</div>}
                      <div style={{ fontSize:10, color:accent, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{m.titre}</div>
                    </div>
                  )
                })}
                {dm.length>2 && <div style={{ fontSize:9, color:'var(--text-dim)', paddingLeft:4 }}>+{dm.length-2}</div>}
              </div>
            )
          })}
        </div>
      </div>
      {modal && <MissionModal date={modal.date} mission={modal.mission} etabs={etabs} onClose={()=>setModal(null)} onSaved={load}/>}
    </div>
  )
}
