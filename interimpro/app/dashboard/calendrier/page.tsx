'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useTheme } from '@/lib/theme-context'

type Mission = { id:string; titre:string; date_debut:string; date_fin:string; etablissement_id:string; statut:string; heures:number; salaire_estime:number; majoration_nuit:boolean; majoration_dimanche:boolean; majoration_ferie:boolean; pause_heures:number; notes:string }
type Etab = { id:string; nom:string; taux_horaire:number; creneaux?:any[] }

// === JOURS FÉRIÉS ===
function getEasterDate(year: number): Date {
  const a = year%19, b = Math.floor(year/100), c = year%100
  const d = Math.floor(b/4), e = b%4, f = Math.floor((b+8)/25)
  const g = Math.floor((b-f+1)/3), h = (19*a+b-d-g+15)%30
  const i = Math.floor(c/4), k = c%4, l = (32+2*e+2*i-h-k)%7
  const m = Math.floor((a+11*h+22*l)/451)
  const month = Math.floor((h+l-7*m+114)/31)
  const day = ((h+l-7*m+114)%31)+1
  return new Date(year, month-1, day)
}

function getFrenchHolidays(year: number): Set<string> {
  const easter = getEasterDate(year)
  const add = (d: Date, days: number) => { const r=new Date(d); r.setDate(r.getDate()+days); return r }
  const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
  const fixed = [
    `${year}-01-01`, `${year}-05-01`, `${year}-05-08`,
    `${year}-07-14`, `${year}-08-15`, `${year}-11-01`,
    `${year}-11-11`, `${year}-12-25`
  ]
  const variable = [
    fmt(add(easter,1)),   // Lundi de Pâques
    fmt(add(easter,39)),  // Ascension
    fmt(add(easter,50)),  // Lundi de Pentecôte
  ]
  return new Set([...fixed, ...variable])
}

function getHolidayLabel(dateStr: string, year: number): string {
  const easter = getEasterDate(year)
  const add = (d: Date, days: number) => { const r=new Date(d); r.setDate(r.getDate()+days); return r }
  const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
  const labels: Record<string,string> = {
    [`${year}-01-01`]: 'Jour de l\'an',
    [`${year}-05-01`]: 'Fête du Travail',
    [`${year}-05-08`]: 'Victoire 1945',
    [`${year}-07-14`]: 'Fête Nationale',
    [`${year}-08-15`]: 'Assomption',
    [`${year}-11-01`]: 'Toussaint',
    [`${year}-11-11`]: 'Armistice',
    [`${year}-12-25`]: 'Noël',
    [fmt(add(easter,1))]: 'Lundi de Pâques',
    [fmt(add(easter,39))]: 'Ascension',
    [fmt(add(easter,50))]: 'Lundi de Pentecôte',
  }
  return labels[dateStr] || 'Jour férié'
}

function calcHeures(debut:string, fin:string, pause:number) {
  if (!debut||!fin) return 0
  const d = new Date(`2000-01-01T${debut}`), f = new Date(`2000-01-01T${fin}`)
  return Math.max(0, (f.getTime()-d.getTime())/3600000 - pause)
}
function calcSalaire(heures:number, taux:number, nuit:boolean, dim:boolean, ferie:boolean) {
  let maj = 0; if(nuit) maj+=.25; if(dim) maj+=.50; if(ferie) maj+=1.00
  return Math.round(heures*taux*(1+maj)*100)/100
}

// Modal détail/création/édition d'une mission
function MissionModal({ date, mission, etabs, onClose, onSaved }: {
  date?: Date; mission?: Mission|null; etabs:Etab[]; onClose:()=>void; onSaved:()=>void
}) {
  const supabase = createClient()
  const { accent } = useTheme()
  const today = date ? `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}` : new Date().toISOString().split('T')[0]
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
  const [saving, setSaving] = useState(false)
  const [mode, setMode] = useState<'view'|'edit'>(mission ? 'view' : 'edit')

  const etab = etabs.find(e=>e.id===form.etablissement_id)
  const heures = calcHeures(form.debut, form.fin, Number(form.pause_heures))
  const salaire = calcSalaire(heures, etab?.taux_horaire||0, form.majoration_nuit, form.majoration_dimanche, form.majoration_ferie)
  const fmtEur = (n:number) => n.toLocaleString('fr-FR',{style:'currency',currency:'EUR',minimumFractionDigits:2})
  const inp: React.CSSProperties = { width:'100%', padding:'9px 12px', borderRadius:8, border:'1px solid var(--border)', background:'var(--bg-input)', color:'var(--text)', fontSize:14, outline:'none', boxSizing:'border-box' }

  const handleSave = async (e:React.FormEvent) => {
    e.preventDefault(); setSaving(true)
    const payload = {
      etablissement_id:form.etablissement_id, titre:form.titre,
      date_debut:`${form.date}T${form.debut}:00`, date_fin:`${form.date}T${form.fin}:00`,
      pause_heures:Number(form.pause_heures), heures, salaire_estime:salaire,
      majoration_nuit:form.majoration_nuit, majoration_dimanche:form.majoration_dimanche,
      majoration_ferie:form.majoration_ferie, notes:form.notes, source:'manual',
      taux_majoration:(form.majoration_nuit?25:0)+(form.majoration_dimanche?50:0)+(form.majoration_ferie?100:0),
      statut: 'a_venir',
    }
    if (mission) await supabase.from('missions').update(payload).eq('id',mission.id)
    else await supabase.from('missions').insert(payload)
    setSaving(false); onSaved(); onClose()
  }

  const deleteMission = async () => {
    if (!mission || !confirm('Supprimer cette mission ?')) return
    await supabase.from('missions').delete().eq('id',mission.id)
    onSaved(); onClose()
  }

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.65)', zIndex:500, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:14, padding:28, width:'100%', maxWidth:520, maxHeight:'90vh', overflow:'auto', boxShadow:'0 24px 60px rgba(0,0,0,.6)', animation:'fadeIn .15s ease' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:22 }}>
          <h2 style={{ fontSize:17, fontWeight:800, color:'var(--text)' }}>
            {mode==='view' ? '📅 Détail mission' : mission ? '✏️ Modifier la mission' : '➕ Nouvelle mission'}
          </h2>
          <div style={{ display:'flex', gap:8 }}>
            {mission && mode==='view' && (
              <button onClick={()=>setMode('edit')} style={{ padding:'6px 12px', borderRadius:7, border:`1px solid ${accent}`, background:'transparent', color:accent, cursor:'pointer', fontSize:12, fontWeight:600 }}>Modifier</button>
            )}
            {mission && mode==='edit' && (
              <button onClick={deleteMission} style={{ padding:'6px 12px', borderRadius:7, border:'1px solid rgba(239,68,68,.3)', background:'rgba(239,68,68,.05)', color:'#ef4444', cursor:'pointer', fontSize:12, fontWeight:600 }}>Supprimer</button>
            )}
            <button onClick={onClose} style={{ background:'none', border:'none', color:'var(--text-dim)', cursor:'pointer', fontSize:20 }}>✕</button>
          </div>
        </div>

        {mode==='view' && mission ? (
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            <div style={{ background:'var(--bg-input)', borderRadius:9, padding:'14px 16px' }}>
              <div style={{ fontSize:18, fontWeight:800, color:'var(--text)', marginBottom:4 }}>{mission.titre}</div>
              <div style={{ fontSize:13, color:'var(--text-muted)' }}>{etabs.find(e=>e.id===mission.etablissement_id)?.nom}</div>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10 }}>
              {[
                ['📅 Date', new Date(mission.date_debut).toLocaleDateString('fr-FR',{day:'numeric',month:'long',year:'numeric'})],
                ['⏰ Heures', `${mission.heures}h`],
                ['💶 Salaire', fmtEur(mission.salaire_estime)],
              ].map(([l,v])=>(
                <div key={String(l)} style={{ background:'var(--bg-input)', borderRadius:8, padding:'10px 12px' }}>
                  <div style={{ fontSize:11, color:'var(--text-dim)', marginBottom:2 }}>{l}</div>
                  <div style={{ fontSize:13, fontWeight:700, color: String(l).includes('💶') ? accent : 'var(--text)' }}>{v}</div>
                </div>
              ))}
            </div>
            {(mission.majoration_nuit||mission.majoration_dimanche||mission.majoration_ferie) && (
              <div style={{ background:'var(--accent-dim)', border:'1px solid var(--accent-border)', borderRadius:8, padding:'8px 12px', fontSize:12, color:accent }}>
                Majorations : {mission.majoration_nuit&&'Nuit +25% '}{mission.majoration_dimanche&&'Dimanche +50% '}{mission.majoration_ferie&&'Férié +100%'}
              </div>
            )}
            {mission.notes && <div style={{ background:'var(--bg-input)', borderRadius:8, padding:'10px 12px', fontSize:13, color:'var(--text-muted)' }}>{mission.notes}</div>}
            <button onClick={()=>setMode('edit')} style={{ padding:'11px', borderRadius:9, border:'none', background:`linear-gradient(135deg,${accent},#a855f7)`, color:'white', cursor:'pointer', fontSize:14, fontWeight:700 }}>✏️ Modifier cette mission</button>
          </div>
        ) : (
          <form onSubmit={handleSave} style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <div>
              <label style={{ display:'block', fontSize:12, fontWeight:600, color:'var(--text-muted)', marginBottom:5 }}>Établissement *</label>
              <select required value={form.etablissement_id} onChange={e=>setForm({...form,etablissement_id:e.target.value})} style={inp}>
                <option value="">Sélectionner</option>
                {etabs.map(e=><option key={e.id} value={e.id}>{e.nom}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display:'block', fontSize:12, fontWeight:600, color:'var(--text-muted)', marginBottom:5 }}>Titre / Service *</label>
              <input required value={form.titre} onChange={e=>setForm({...form,titre:e.target.value})} placeholder="Urgences, Réanimation..." style={inp}/>
            </div>
            <div>
              <label style={{ display:'block', fontSize:12, fontWeight:600, color:'var(--text-muted)', marginBottom:5 }}>Date</label>
              <input type="date" value={form.date} onChange={e=>setForm({...form,date:e.target.value})} style={inp}/>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10 }}>
              <div><label style={{ display:'block', fontSize:12, fontWeight:600, color:'var(--text-muted)', marginBottom:5 }}>Début</label><input type="time" value={form.debut} onChange={e=>setForm({...form,debut:e.target.value})} style={inp}/></div>
              <div><label style={{ display:'block', fontSize:12, fontWeight:600, color:'var(--text-muted)', marginBottom:5 }}>Fin</label><input type="time" value={form.fin} onChange={e=>setForm({...form,fin:e.target.value})} style={inp}/></div>
              <div><label style={{ display:'block', fontSize:12, fontWeight:600, color:'var(--text-muted)', marginBottom:5 }}>Pause (h)</label><input type="number" step="0.5" min="0" value={form.pause_heures} onChange={e=>setForm({...form,pause_heures:Number(e.target.value)})} style={inp}/></div>
            </div>
            {heures>0 && <div style={{ background:'var(--bg-input)', borderRadius:9, padding:'12px 16px', textAlign:'center' }}>
              <span style={{ color:'var(--text-muted)', fontSize:13 }}>Heures calculées : </span>
              <span style={{ fontSize:18, fontWeight:800, color:'var(--text)' }}>{heures.toFixed(2)}h</span>
            </div>}
            <div>
              <label style={{ display:'block', fontSize:12, fontWeight:600, color:'var(--text-muted)', marginBottom:10 }}>Majorations</label>
              <div style={{ display:'flex', gap:16 }}>
                {([['majoration_nuit','Nuit (+25%)'],['majoration_dimanche','Dimanche (+50%)'],['majoration_ferie','Férié (+100%)']] as [string,string][]).map(([k,l])=>(
                  <label key={k} style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer', fontSize:13, color:'var(--text-muted)' }}>
                    <input type="radio" checked={(form as any)[k]} onChange={()=>setForm({...form,majoration_nuit:k==='majoration_nuit',majoration_dimanche:k==='majoration_dimanche',majoration_ferie:k==='majoration_ferie'})} style={{ accentColor:accent,width:15,height:15 }}/>{l}
                  </label>
                ))}
              </div>
            </div>
            <div style={{ background:'var(--accent-dim)', border:'1px solid var(--accent-border)', borderRadius:9, padding:'12px 16px', textAlign:'center' }}>
              <span style={{ color:'var(--text-muted)', fontSize:13 }}>Salaire estimé : </span>
              <span style={{ fontSize:20, fontWeight:800, color:accent }}>{fmtEur(salaire)}</span>
            </div>
            <div><label style={{ display:'block', fontSize:12, fontWeight:600, color:'var(--text-muted)', marginBottom:5 }}>Notes</label><textarea value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} rows={2} placeholder="Notes..." style={{ ...inp, resize:'vertical' as const }}/></div>
            <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
              <button type="button" onClick={onClose} style={{ padding:'10px 18px', borderRadius:9, border:'1px solid var(--border)', background:'transparent', color:'var(--text-muted)', cursor:'pointer', fontSize:14 }}>Annuler</button>
              <button type="submit" disabled={saving} style={{ padding:'10px 24px', borderRadius:9, border:'none', background:`linear-gradient(135deg,${accent},#a855f7)`, color:'white', cursor:'pointer', fontSize:14, fontWeight:700 }}>{saving?'...':mission?'Enregistrer':'Créer'}</button>
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
  const [modal, setModal] = useState<{ date?:Date; mission?:Mission } | null>(null)
  const supabase = createClient()
  const { accent } = useTheme()

  const load = useCallback(async () => {
    const [m, e] = await Promise.all([
      supabase.from('missions').select('*').order('date_debut'),
      supabase.from('etablissements').select('*'),
    ])
    setMissions((m.data||[]) as Mission[])
    setEtabs((e.data||[]) as Etab[])
  }, [])

  useEffect(() => { load() }, [load])

  const y = cur.getFullYear(), mo = cur.getMonth()
  const firstDay = (new Date(y, mo, 1).getDay()+6)%7
  const daysInMonth = new Date(y, mo+1, 0).getDate()
  const days: (number|null)[] = []
  for(let i=0;i<firstDay;i++) days.push(null)
  for(let i=1;i<=daysInMonth;i++) days.push(i)
  while(days.length%7!==0) days.push(null)

  const holidays = getFrenchHolidays(y)
  const todayObj = new Date()

  const fmt = (day:number) => `${y}-${String(mo+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`
  const getMissions = (day:number) => missions.filter(m=>m.date_debut?.startsWith(fmt(day)))
  const getEtab = (id:string) => etabs.find(e=>e.id===id)
  const isToday = (d:number) => d===todayObj.getDate()&&mo===todayObj.getMonth()&&y===todayObj.getFullYear()
  const isSunday = (idx:number) => idx%7===6
  const moisLabel = cur.toLocaleDateString('fr-FR',{month:'long',year:'numeric'}).replace(/^\w/,c=>c.toUpperCase())

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:22 }}>
        <h1 style={{ fontSize:22, fontWeight:800, color:'var(--text)' }}>Calendrier</h1>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <button onClick={()=>setCur(new Date(y,mo-1,1))} style={{ width:32, height:32, borderRadius:8, border:'1px solid var(--border)', background:'var(--bg-card)', color:'var(--text-muted)', cursor:'pointer', fontSize:16, display:'flex', alignItems:'center', justifyContent:'center' }}>‹</button>
          <span style={{ fontSize:14, fontWeight:700, color:'var(--text)', minWidth:130, textAlign:'center' }}>{moisLabel}</span>
          <button onClick={()=>setCur(new Date(y,mo+1,1))} style={{ width:32, height:32, borderRadius:8, border:'1px solid var(--border)', background:'var(--bg-card)', color:'var(--text-muted)', cursor:'pointer', fontSize:16, display:'flex', alignItems:'center', justifyContent:'center' }}>›</button>
          <button onClick={()=>setCur(new Date())} style={{ padding:'6px 14px', borderRadius:8, border:'1px solid var(--border)', background:'var(--bg-card)', color:'var(--text-muted)', cursor:'pointer', fontSize:12, marginLeft:4 }}>Aujourd'hui</button>
        </div>
      </div>

      {/* Légende */}
      <div style={{ display:'flex', gap:16, marginBottom:14, fontSize:11, color:'var(--text-dim)', alignItems:'center' }}>
        <div style={{ display:'flex', alignItems:'center', gap:4 }}><div style={{ width:10, height:10, borderRadius:2, background:accent }}/> Aujourd'hui</div>
        <div style={{ display:'flex', alignItems:'center', gap:4 }}><div style={{ width:10, height:10, borderRadius:2, background:'#f97316' }}/> Dimanche</div>
        <div style={{ display:'flex', alignItems:'center', gap:4 }}><div style={{ width:10, height:10, borderRadius:2, background:'#10b981' }}/> Jour férié</div>
        <div style={{ display:'flex', alignItems:'center', gap:4 }}><span>+ Cliquer sur un jour pour ajouter une mission</span></div>
      </div>

      <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:12, overflow:'hidden' }}>
        {/* Headers */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(7, 1fr)', borderBottom:'1px solid var(--border)' }}>
          {['LUN','MAR','MER','JEU','VEN','SAM','DIM'].map((d,i)=>(
            <div key={d} style={{ textAlign:'center', padding:'10px 4px', fontSize:11, fontWeight:700, color: i===6?'#f97316':'var(--text-dim)', letterSpacing:'.06em', borderRight:i<6?'1px solid var(--border)':'none' }}>{d}</div>
          ))}
        </div>
        {/* Jours */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(7, 1fr)' }}>
          {days.map((day, idx) => {
            if(!day) return <div key={idx} style={{ minHeight:100, borderRight:idx%7<6?'1px solid var(--border)':'none', borderBottom:'1px solid var(--border)', background:'rgba(0,0,0,.03)' }}/>
            const dm = getMissions(day)
            const dateStr = fmt(day)
            const isHoliday = holidays.has(dateStr)
            const tod = isToday(day)
            const sun = isSunday(idx)
            const holidayLabel = isHoliday ? getHolidayLabel(dateStr, y) : null

            let bg = 'transparent'
            if (isHoliday) bg = 'rgba(16,185,129,.06)'
            else if (tod) bg = 'var(--accent-dim)'
            else if (sun) bg = 'rgba(249,115,22,.04)'

            return (
              <div key={idx} onClick={()=>setModal({ date:new Date(y,mo,day) })} style={{ minHeight:100, borderRight:idx%7<6?'1px solid var(--border)':'none', borderBottom:'1px solid var(--border)', padding:6, background:bg, cursor:'pointer', transition:'background .1s' }}
                onMouseEnter={e=>(e.currentTarget.style.background=bg==='transparent'?'var(--bg-hover)':bg)}
                onMouseLeave={e=>(e.currentTarget.style.background=bg)}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:3 }}>
                  <span style={{ width:22, height:22, borderRadius:'50%', background: tod?accent:'transparent', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight: tod?800:500, color: tod?'white': isHoliday?'#10b981': sun?'#f97316':'var(--text-muted)', transition:'all .1s' }}>{day}</span>
                  {dm.length>0 && <span style={{ fontSize:9, background:'var(--accent-dim)', color:accent, borderRadius:100, padding:'1px 5px', fontWeight:700 }}>+{dm.length}</span>}
                </div>
                {isHoliday && <div style={{ fontSize:9, color:'#10b981', fontWeight:600, marginBottom:3, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>🎉 {holidayLabel}</div>}
                {dm.slice(0,2).map(m=>{
                  const etab = getEtab(m.etablissement_id)
                  const debut = m.date_debut?.split('T')[1]?.slice(0,5)||''
                  const fin = m.date_fin?.split('T')[1]?.slice(0,5)||''
                  return (
                    <div key={m.id} onClick={e=>{e.stopPropagation();setModal({mission:m})}} style={{ background:'var(--accent-dim)', border:'1px solid var(--accent-border)', borderRadius:4, padding:'3px 6px', marginBottom:2, cursor:'pointer' }}>
                      <div style={{ fontSize:10, color:'var(--text)', fontWeight:600, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{etab?.nom}</div>
                      {(debut||fin) && <div style={{ fontSize:9, color:'var(--text-dim)' }}>{debut}–{fin}</div>}
                      <div style={{ fontSize:10, color:accent, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{m.titre}</div>
                    </div>
                  )
                })}
                {dm.length>2 && <div style={{ fontSize:9, color:'var(--text-dim)', paddingLeft:4 }}>+{dm.length-2} autres</div>}
              </div>
            )
          })}
        </div>
      </div>

      {modal && (
        <MissionModal
          date={modal.date}
          mission={modal.mission}
          etabs={etabs}
          onClose={()=>setModal(null)}
          onSaved={load}
        />
      )}
    </div>
  )
}
