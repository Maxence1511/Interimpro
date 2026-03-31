'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { getSupabase } from '@/lib/supabase/client'
import { useTheme } from '@/lib/theme-context'
import { t } from '@/lib/i18n'

type Creneau = { label:string; heure_debut:string; heure_fin:string; pause_minutes:number }
type Etab = { id:string; nom:string; taux_horaire:number; creneaux:Creneau[] }
type Mission = {
  id:string; titre:string; etablissement_id:string; date_debut:string; date_fin:string
  pause_heures:number; heures:number; statut:string; salaire_estime:number; notes:string
  contrat_signe:boolean; fiche_paie_recue:boolean; salaire_recu:boolean
  date_contrat_signe:string|null; date_fiche_paie_recue:string|null; date_salaire_recu:string|null
  majoration_nuit:boolean; majoration_dimanche:boolean; majoration_ferie:boolean
  creneau_label:string|null; source:string
}

function calcH(deb:string, fin:string, pause:number) {
  if (!deb||!fin) return 0
  const a=new Date('2000-01-01T'+deb), b=new Date('2000-01-01T'+fin)
  return Math.max(0,(b.getTime()-a.getTime())/3600000-pause)
}
function calcS(h:number, taux:number, nuit:boolean, dim:boolean, fer:boolean) {
  let m=0; if(nuit)m+=.25; if(dim)m+=.50; if(fer)m+=1
  return Math.round(h*taux*(1+m)*100)/100
}
function fmtDate(d:string|null) { if(!d)return '—'; return new Date(d).toLocaleDateString('fr-FR',{day:'2-digit',month:'2-digit',year:'2-digit'}) }
function fmtDateTime(d:string|null) { if(!d)return null; return new Date(d).toLocaleString('fr-FR',{day:'2-digit',month:'2-digit',year:'2-digit',hour:'2-digit',minute:'2-digit'}) }
function fmtEur(n:number) { return n.toLocaleString('fr-FR',{style:'currency',currency:'EUR',minimumFractionDigits:2}) }

// ===== MENU 3 POINTS =====
function ActionMenu({ onView, onEdit, onArchive, onDelete }: { onView:()=>void; onEdit:()=>void; onArchive:()=>void; onDelete:()=>void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const h=(e:MouseEvent)=>{ if(ref.current&&!ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown',h); return ()=>document.removeEventListener('mousedown',h)
  }, [])
  return (
    <div ref={ref} style={{ position:'relative' }} onClick={e=>e.stopPropagation()}>
      <button onClick={()=>setOpen(!open)} style={{ width:28, height:28, borderRadius:7, border:'1px solid var(--border)', background:'var(--bg-card)', cursor:'pointer', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:2, padding:0, color:'var(--text-muted)', flexShrink:0 }}>
        <div style={{ width:3, height:3, borderRadius:'50%', background:'currentColor' }}/>
        <div style={{ width:3, height:3, borderRadius:'50%', background:'currentColor' }}/>
        <div style={{ width:3, height:3, borderRadius:'50%', background:'currentColor' }}/>
      </button>
      {open && (
        <div style={{ position:'absolute', top:'calc(100% + 4px)', right:0, background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:10, boxShadow:'0 8px 24px var(--shadow)', zIndex:200, minWidth:150, overflow:'hidden', animation:'popIn .15s ease' }}>
          <button onClick={()=>{onView();setOpen(false)}} style={{ width:'100%', padding:'9px 14px', border:'none', background:'transparent', color:'var(--text)', cursor:'pointer', fontSize:13, textAlign:'left', display:'flex', alignItems:'center', gap:8 }}>👁 Voir les détails</button>
          <button onClick={()=>{onEdit();setOpen(false)}} style={{ width:'100%', padding:'9px 14px', border:'none', background:'transparent', color:'var(--text)', cursor:'pointer', fontSize:13, textAlign:'left', display:'flex', alignItems:'center', gap:8 }}>✏️ Modifier</button>
          <button onClick={()=>{onArchive();setOpen(false)}} style={{ width:'100%', padding:'9px 14px', border:'none', background:'transparent', color:'#f97316', cursor:'pointer', fontSize:13, textAlign:'left', display:'flex', alignItems:'center', gap:8 }}>📦 Archiver</button>
          <div style={{ height:1, background:'var(--border)', margin:'0 8px' }}/>
          <button onClick={()=>{onDelete();setOpen(false)}} style={{ width:'100%', padding:'9px 14px', border:'none', background:'transparent', color:'#ef4444', cursor:'pointer', fontSize:13, textAlign:'left', display:'flex', alignItems:'center', gap:8 }}>🗑 Supprimer</button>
        </div>
      )}
    </div>
  )
}

// ===== MODAL DÉTAIL MISSION =====
function MissionDetail({ m, etab, onClose, onEdit, onToggleDoc }: { m:Mission; etab:Etab|undefined; onClose:()=>void; onEdit:()=>void; onToggleDoc:(f:string)=>void }) {
  const { accent, lang } = useTheme()
  const docs = [
    { key:'contrat_signe', icon:'📄', label:t(lang,'missions.doc_contract'), date:m.date_contrat_signe, val:m.contrat_signe },
    { key:'fiche_paie_recue', icon:'💳', label:t(lang,'missions.doc_payslip'), date:m.date_fiche_paie_recue, val:m.fiche_paie_recue },
    { key:'salaire_recu', icon:'💰', label:t(lang,'missions.doc_salary'), date:m.date_salaire_recu, val:m.salaire_recu },
  ]
  const majs = [m.majoration_nuit&&'Nuit +25%', m.majoration_dimanche&&'Dim +50%', m.majoration_ferie&&'Férié +100%'].filter(Boolean)
  return (
    <div style={{ position:'fixed', inset:0, background:'var(--overlay)', zIndex:500, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{ background:'var(--bg-modal)', border:'1px solid var(--border)', borderRadius:16, padding:28, width:'100%', maxWidth:480, maxHeight:'88vh', overflow:'auto', boxShadow:'0 24px 60px var(--shadow)', animation:'slideIn .2s ease' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:20 }}>
          <div>
            <h2 style={{ fontSize:20, fontWeight:800, color:'var(--text)', marginBottom:3 }}>{m.titre}</h2>
            <div style={{ fontSize:13, color:'var(--text-muted)' }}>{etab?.nom||'—'}</div>
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={onEdit} style={{ padding:'7px 14px', borderRadius:8, border:`1px solid ${accent}`, background:'var(--accent-dim)', color:accent, cursor:'pointer', fontSize:13, fontWeight:600 }}>{t(lang,'missions.modify')}</button>
            <button onClick={onClose} style={{ background:'none', border:'none', color:'var(--text-dim)', cursor:'pointer', fontSize:22 }}>✕</button>
          </div>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:14 }}>
          {[
            ['📅 Date', fmtDate(m.date_debut)],
            ['⏰ Horaires', `${m.date_debut?.split('T')[1]?.slice(0,5)||'—'} → ${m.date_fin?.split('T')[1]?.slice(0,5)||'—'}`],
            ['⏱ Heures', `${m.heures}h`],
            ['💶 Salaire', fmtEur(m.salaire_estime)],
          ].map(([lbl,val])=>(
            <div key={lbl} style={{ background:'var(--bg-input)', borderRadius:9, padding:'10px 14px' }}>
              <div style={{ fontSize:11, color:'var(--text-dim)', marginBottom:2 }}>{lbl}</div>
              <div style={{ fontSize:14, fontWeight:700, color:'var(--text)' }}>{val}</div>
            </div>
          ))}
        </div>
        {m.creneau_label && <div style={{ background:'var(--accent-dim)', border:'1px solid var(--accent-border)', borderRadius:8, padding:'7px 12px', fontSize:13, color:accent, marginBottom:10, fontWeight:600 }}>🕐 {m.creneau_label}</div>}
        {majs.length>0 && <div style={{ background:'rgba(245,158,11,.1)', border:'1px solid rgba(245,158,11,.3)', borderRadius:8, padding:'7px 12px', fontSize:13, color:'#f59e0b', marginBottom:14 }}>⚡ {majs.join(' · ')}</div>}
        <div style={{ borderTop:'1px solid var(--border)', paddingTop:14, marginBottom:6 }}>
          <div style={{ fontSize:13, fontWeight:700, color:'var(--text)', marginBottom:10 }}>{t(lang,'missions.admin_tracking')}</div>
          {docs.map(d=>(
            <div key={d.key} onClick={()=>onToggleDoc(d.key)} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 14px', borderRadius:9, background:d.val?'rgba(16,185,129,.08)':'var(--bg-input)', border:`1px solid ${d.val?'rgba(16,185,129,.3)':'var(--border)'}`, marginBottom:7, cursor:'pointer' }}>
              <span style={{ fontSize:20 }}>{d.icon}</span>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:13, fontWeight:600, color:'var(--text)' }}>{d.label}</div>
                <div style={{ fontSize:11, color:'var(--text-dim)', marginTop:1 }}>
                  {d.val && d.date ? `Pointé le ${fmtDateTime(d.date)}` : 'Cliquer pour pointer'}
                </div>
              </div>
              <div style={{ width:22, height:22, borderRadius:'50%', border:`2px solid ${d.val?'#10b981':'var(--border)'}`, background:d.val?'#10b981':'transparent', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, color:'white' }}>{d.val?'✓':''}</div>
            </div>
          ))}
        </div>
        {m.notes && <div style={{ background:'var(--bg-input)', borderRadius:9, padding:'9px 12px', fontSize:13, color:'var(--text-muted)', marginTop:8 }}><span style={{ fontWeight:600, color:'var(--text)' }}>Notes : </span>{m.notes}</div>}
      </div>
    </div>
  )
}

// ===== MODAL MISSION =====
function MissionModal({ etabs, editing, onClose, onSaved, userId }: { etabs:Etab[]; editing:Mission|null; onClose:()=>void; onSaved:()=>void; userId:string }) {
  const { accent, lang } = useTheme()
  const today = new Date().toISOString().split('T')[0]
  const [form, setForm] = useState({
    etablissement_id:editing?.etablissement_id||'',
    titre:editing?.titre||'',
    date:editing?.date_debut?.split('T')[0]||today,
    debut:editing?.date_debut?.split('T')[1]?.slice(0,5)||'08:00',
    fin:editing?.date_fin?.split('T')[1]?.slice(0,5)||'18:00',
    pause_heures:editing?.pause_heures??1,
    majoration_nuit:editing?.majoration_nuit||false,
    majoration_dimanche:editing?.majoration_dimanche||false,
    majoration_ferie:editing?.majoration_ferie||false,
    notes:editing?.notes||'',
    creneau_label:editing?.creneau_label||'',
    creneau_index:-1,
  })
  const [saving, setSaving] = useState(false); const [error, setError] = useState('')
  const [showNewC, setShowNewC] = useState(false)
  const [newC, setNewC] = useState({ label:'Matin', heure_debut:'08:00', heure_fin:'16:00', pause_minutes:30 })
  const etab = etabs.find(e=>e.id===form.etablissement_id)
  const creneaux = etab?.creneaux||[]
  const heures = calcH(form.debut, form.fin, Number(form.pause_heures))
  const salaire = calcS(heures, etab?.taux_horaire||0, form.majoration_nuit, form.majoration_dimanche, form.majoration_ferie)
  const inp: React.CSSProperties = { width:'100%', padding:'9px 12px', borderRadius:8, border:'1px solid var(--border)', background:'var(--bg-input)', color:'var(--text)', fontSize:13, outline:'none', boxSizing:'border-box' }

  const applyCreneau = (c:Creneau, idx:number) => setForm(f=>({...f, debut:c.heure_debut, fin:c.heure_fin, pause_heures:c.pause_minutes/60, creneau_label:c.label, creneau_index:idx, titre:f.titre||c.label }))

  const saveNewCreneau = async () => {
    if (!etab) return
    const sb = getSupabase()
    const updated = [...creneaux, newC]
    await sb.from('etablissements').update({ creneaux:updated }).eq('id',etab.id).eq('user_id',userId)
    applyCreneau(newC, updated.length-1)
    setShowNewC(false)
  }

  const handleSave = async (e:React.FormEvent) => {
    e.preventDefault(); setSaving(true); setError('')
    const sb = getSupabase()
    const payload = {
      user_id:userId, etablissement_id:form.etablissement_id||null, titre:form.titre,
      date_debut:`${form.date}T${form.debut}:00`, date_fin:`${form.date}T${form.fin}:00`,
      pause_heures:Number(form.pause_heures), heures, salaire_estime:salaire,
      majoration_nuit:form.majoration_nuit, majoration_dimanche:form.majoration_dimanche, majoration_ferie:form.majoration_ferie,
      taux_majoration:(form.majoration_nuit?25:0)+(form.majoration_dimanche?50:0)+(form.majoration_ferie?100:0),
      notes:form.notes, creneau_label:form.creneau_label||null,
      statut:editing?.statut||'a_venir', source:'manual',
    }
    let res
    if (editing) res = await sb.from('missions').update(payload).eq('id',editing.id).eq('user_id',userId)
    else res = await sb.from('missions').insert(payload)
    if (res.error) { setError(res.error.message); setSaving(false); return }
    setSaving(false); onSaved(); onClose()
  }

  return (
    <div style={{ position:'fixed', inset:0, background:'var(--overlay)', zIndex:500, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{ background:'var(--bg-modal)', border:'1px solid var(--border)', borderRadius:14, padding:28, width:'100%', maxWidth:520, maxHeight:'92vh', overflow:'auto', boxShadow:'0 24px 60px var(--shadow)', animation:'slideIn .2s ease' }}>
        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:20 }}>
          <h2 style={{ fontSize:17, fontWeight:800, color:'var(--text)' }}>{editing?t(lang,'missions.modal_edit'):t(lang,'missions.modal_new')}</h2>
          <button onClick={onClose} style={{ background:'none', border:'none', color:'var(--text-dim)', cursor:'pointer', fontSize:20 }}>✕</button>
        </div>
        {error && <div style={{ padding:'8px 12px', borderRadius:7, background:'rgba(239,68,68,.1)', border:'1px solid rgba(239,68,68,.3)', fontSize:13, color:'#ef4444', marginBottom:12 }}>❌ {error}</div>}
        <form onSubmit={handleSave} style={{ display:'flex', flexDirection:'column', gap:12 }}>
          <div><label style={{ display:'block', fontSize:11, color:'var(--text-muted)', marginBottom:4 }}>{t(lang,'missions.field_etab')}</label>
            <select required={false} value={form.etablissement_id} onChange={e=>setForm({...form,etablissement_id:e.target.value,creneau_label:'',creneau_index:-1})} style={inp}>
              <option value="">{t(lang,'missions.field_select_etab')}</option>
              {etabs.map(e=><option key={e.id} value={e.id}>{e.nom}</option>)}
            </select>
          </div>
          {etab && creneaux.length>0 && (
            <div>
              <label style={{ display:'block', fontSize:11, color:'var(--text-muted)', marginBottom:6 }}>{t(lang,'missions.field_creneau')}</label>
              <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                {creneaux.map((c,i)=>(
                  <button key={i} type="button" onClick={()=>applyCreneau(c,i)} style={{ padding:'6px 12px', borderRadius:8, border:`1.5px solid ${form.creneau_index===i?accent:'var(--border)'}`, background:form.creneau_index===i?'var(--accent-dim)':'var(--bg-input)', color:form.creneau_index===i?accent:'var(--text-muted)', cursor:'pointer', fontSize:12, fontWeight:form.creneau_index===i?700:400 }}>
                    {c.label} <span style={{ opacity:.7 }}>{c.heure_debut}–{c.heure_fin}</span>
                  </button>
                ))}
                <button type="button" onClick={()=>setShowNewC(!showNewC)} style={{ padding:'6px 12px', borderRadius:8, border:`1.5px dashed ${accent}60`, background:'transparent', color:accent, cursor:'pointer', fontSize:12 }}>{t(lang,'missions.field_new_creneau')}</button>
              </div>
              {showNewC && (
                <div style={{ marginTop:8, padding:'10px 12px', background:'var(--bg-input)', borderRadius:9, border:'1px solid var(--border)' }}>
                  <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr 1fr', gap:6, marginBottom:8 }}>
                    <input placeholder="Label" value={newC.label} onChange={e=>setNewC({...newC,label:e.target.value})} style={{ ...inp, fontSize:12 }}/>
                    <input type="time" value={newC.heure_debut} onChange={e=>setNewC({...newC,heure_debut:e.target.value})} style={{ ...inp, fontSize:12 }}/>
                    <input type="time" value={newC.heure_fin} onChange={e=>setNewC({...newC,heure_fin:e.target.value})} style={{ ...inp, fontSize:12 }}/>
                    <input type="number" placeholder="Pause" value={newC.pause_minutes} onChange={e=>setNewC({...newC,pause_minutes:Number(e.target.value)})} style={{ ...inp, fontSize:12 }}/>
                  </div>
                  <div style={{ display:'flex', gap:8 }}>
                    <button type="button" onClick={saveNewCreneau} style={{ padding:'6px 14px', borderRadius:7, border:'none', background:accent, color:'white', cursor:'pointer', fontSize:13, fontWeight:600 }}>Créer</button>
                    <button type="button" onClick={()=>setShowNewC(false)} style={{ padding:'6px 12px', borderRadius:7, border:'1px solid var(--border)', background:'transparent', color:'var(--text-muted)', cursor:'pointer', fontSize:13 }}>Annuler</button>
                  </div>
                </div>
              )}
            </div>
          )}
          <div><label style={{ display:'block', fontSize:11, color:'var(--text-muted)', marginBottom:4 }}>{t(lang,'missions.field_title')}</label><input required value={form.titre} onChange={e=>setForm({...form,titre:e.target.value})} placeholder="Ex: Urgences, Réanimation..." style={inp}/></div>
          <div><label style={{ display:'block', fontSize:11, color:'var(--text-muted)', marginBottom:4 }}>{t(lang,'missions.field_date')}</label><input type="date" value={form.date} onChange={e=>setForm({...form,date:e.target.value})} style={inp}/></div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10 }}>
            <div><label style={{ display:'block', fontSize:11, color:'var(--text-muted)', marginBottom:4 }}>{t(lang,'missions.field_start')}</label><input type="time" value={form.debut} onChange={e=>setForm({...form,debut:e.target.value})} style={inp}/></div>
            <div><label style={{ display:'block', fontSize:11, color:'var(--text-muted)', marginBottom:4 }}>{t(lang,'missions.field_end')}</label><input type="time" value={form.fin} onChange={e=>setForm({...form,fin:e.target.value})} style={inp}/></div>
            <div><label style={{ display:'block', fontSize:11, color:'var(--text-muted)', marginBottom:4 }}>{t(lang,'missions.field_break')}</label><input type="number" step="0.25" min="0" value={form.pause_heures} onChange={e=>setForm({...form,pause_heures:Number(e.target.value)})} style={inp}/></div>
          </div>
          <div style={{ background:'var(--bg-input)', borderRadius:8, padding:'9px 14px', textAlign:'center' }}>
            <span style={{ color:'var(--text-muted)', fontSize:13 }}>{t(lang,'missions.calc_hours')} </span>
            <span style={{ fontSize:18, fontWeight:800, color:'var(--text)' }}>{heures.toFixed(2)}h</span>
          </div>
          <div>
            <label style={{ display:'block', fontSize:11, color:'var(--text-muted)', marginBottom:6 }}>{t(lang,'missions.majorations')}</label>
            <div style={{ display:'flex', gap:12, flexWrap:'wrap' }}>
              {([['majoration_nuit',t(lang,'missions.maj_night')],['majoration_dimanche',t(lang,'missions.maj_sunday')],['majoration_ferie',t(lang,'missions.maj_holiday')]] as [string,string][]).map(([k,lbl])=>(
                <label key={k} style={{ display:'flex', alignItems:'center', gap:6, cursor:'pointer', fontSize:12, color:'var(--text-muted)' }}>
                  <input type="checkbox" checked={(form as any)[k]} onChange={e=>setForm({...form,[k]:e.target.checked})} style={{ accentColor:accent }}/>{lbl}
                </label>
              ))}
            </div>
          </div>
          <div style={{ background:'var(--accent-dim)', border:'1px solid var(--accent-border)', borderRadius:9, padding:'10px 14px', textAlign:'center' }}>
            <span style={{ color:'var(--text-muted)', fontSize:13 }}>{t(lang,'missions.calc_salary')} </span>
            <span style={{ fontSize:22, fontWeight:800, color:accent }}>{fmtEur(salaire)}</span>
          </div>
          <div><label style={{ display:'block', fontSize:11, color:'var(--text-muted)', marginBottom:4 }}>{t(lang,'missions.field_notes')}</label><textarea value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} rows={2} style={{ ...inp, resize:'vertical' as const }}/></div>
          <div style={{ display:'flex', gap:10, justifyContent:'flex-end', marginTop:4 }}>
            <button type="button" onClick={onClose} style={{ padding:'10px 18px', borderRadius:9, border:'1px solid var(--border)', background:'transparent', color:'var(--text-muted)', cursor:'pointer', fontSize:13 }}>{t(lang,'missions.cancel')}</button>
            <button type="submit" disabled={saving} style={{ padding:'10px 24px', borderRadius:9, border:'none', background:`linear-gradient(135deg,${accent},#a855f7)`, color:'white', cursor:'pointer', fontSize:14, fontWeight:700 }}>
              {saving ? t(lang,'common.saving') : (editing ? t(lang,'missions.save') : t(lang,'missions.create'))}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ===== PAGE =====
export default function MissionsPage() {
  const [missions, setMissions] = useState<Mission[]>([])
  const [etabs, setEtabs] = useState<Etab[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('a_venir')
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Mission|null>(null)
  const [viewing, setViewing] = useState<Mission|null>(null)
  const [userId, setUserId] = useState<string|null>(null)
  const { accent, lang } = useTheme()

  useEffect(() => {
    getSupabase().auth.getSession().then(({ data }) => {
      if (data.session?.user?.id) setUserId(data.session.user.id)
    })
  }, [])

  const load = useCallback(async () => {
    if (!userId) return
    const [m,e] = await Promise.all([
      getSupabase().from('missions').select('*').eq('user_id',userId).order('date_debut',{ascending:false}),
      getSupabase().from('etablissements').select('*').eq('user_id',userId).eq('archived',false).order('nom'),
    ])
    // Auto-passer en "passée"
    const raw = (m.data||[]) as Mission[]
    const toPass = raw.filter(mi=>mi.statut==='a_venir' && mi.date_fin && new Date(mi.date_fin)<new Date())
    if (toPass.length>0) {
      await getSupabase().from('missions').update({statut:'passee'}).in('id',toPass.map(m=>m.id)).eq('user_id',userId)
      toPass.forEach(mi=>{mi.statut='passee'})
    }
    setMissions(raw)
    setEtabs((e.data||[]) as Etab[])
    setLoading(false)
  }, [userId])

  useEffect(() => { if(userId) load() }, [userId, load])

  const toggleDoc = async (m:Mission, field:string) => {
    if (!userId) return
    const newVal = !(m as any)[field]
    const dateField = `date_${field}`
    const patch: any = { [field]:newVal, [dateField]:newVal?new Date().toISOString():null }
    await getSupabase().from('missions').update(patch).eq('id',m.id).eq('user_id',userId)
    const updated = {...m, [field]:newVal, [dateField]:patch[dateField]}
    if (newVal && updated.contrat_signe && updated.fiche_paie_recue && updated.salaire_recu && updated.statut==='passee') {
      if (confirm(t(lang,'missions.all_docs_confirm'))) {
        await getSupabase().from('missions').update({statut:'archive',date_archive:new Date().toISOString()}).eq('id',m.id).eq('user_id',userId)
      }
    }
    load()
    if (viewing?.id===m.id) setViewing({...m,...patch})
  }

  const del = async (id:string) => {
    if (!userId || !confirm(t(lang,'missions.delete_confirm'))) return
    await getSupabase().from('missions').delete().eq('id',id).eq('user_id',userId)
    if (viewing?.id===id) setViewing(null)
    load()
  }

  const archive = async (m:Mission) => {
    if (!confirm(t(lang,'missions.archive_confirm'))) return
    await getSupabase().from('missions').update({statut:'archive',date_archive:new Date().toISOString()}).eq('id',m.id).eq('user_id',userId!)
    load()
  }

  const getEtab = (id:string) => etabs.find(e=>e.id===id)
  const counts = { a_venir:missions.filter(m=>m.statut==='a_venir').length, passee:missions.filter(m=>m.statut==='passee').length, archive:missions.filter(m=>m.statut==='archive').length }
  const filtered = missions.filter(m => m.statut===tab && (!search || m.titre.toLowerCase().includes(search.toLowerCase()) || (getEtab(m.etablissement_id)?.nom||'').toLowerCase().includes(search.toLowerCase())))
  const td: React.CSSProperties = { padding:'13px 14px', borderBottom:'1px solid var(--border)', fontSize:13, color:'var(--text)', verticalAlign:'middle' }
  const th: React.CSSProperties = { padding:'10px 14px', textAlign:'left', fontSize:11, fontWeight:700, color:'var(--text-dim)', borderBottom:'1px solid var(--border)', letterSpacing:'.06em', textTransform:'uppercase' as const, background:'var(--bg-input)' }

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:22 }}>
        <div>
          <h1 style={{ fontSize:26, fontWeight:800, color:'var(--text)', marginBottom:3 }}>{t(lang,'missions.title')}</h1>
          <div style={{ fontSize:14, color:'var(--text-dim)' }}>{counts.a_venir} à venir · {counts.passee} passées</div>
        </div>
        {userId && <button onClick={()=>{setEditing(null);setShowModal(true)}} style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 20px', borderRadius:10, border:'none', background:`linear-gradient(135deg,${accent},#a855f7)`, color:'white', cursor:'pointer', fontSize:14, fontWeight:700, boxShadow:`0 2px 14px ${accent}40` }}>{t(lang,'missions.new')}</button>}
      </div>

      <div style={{ position:'relative', marginBottom:14 }}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder={t(lang,'missions.search')} style={{ width:'100%', padding:'10px 14px 10px 40px', borderRadius:10, border:'1px solid var(--border)', background:'var(--bg-card)', color:'var(--text)', fontSize:14, outline:'none', boxSizing:'border-box' }}/>
        <span style={{ position:'absolute', left:13, top:'50%', transform:'translateY(-50%)' }}>🔍</span>
      </div>

      <div style={{ display:'inline-flex', background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:'10px 10px 0 0', overflow:'hidden' }}>
        {[['a_venir',t(lang,'missions.tab_upcoming')],['passee',t(lang,'missions.tab_past')],['archive',t(lang,'missions.tab_archive')]].map(([k,lbl])=>(
          <button key={k} onClick={()=>setTab(k)} style={{ padding:'10px 20px', border:'none', background:tab===k?'var(--bg-hover)':'transparent', color:tab===k?'var(--text)':'var(--text-dim)', cursor:'pointer', fontSize:13, fontWeight:tab===k?700:400, borderBottom:tab===k?`2px solid ${accent}`:'2px solid transparent', whiteSpace:'nowrap' }}>
            {lbl} <span style={{ opacity:.7 }}>({(counts as any)[k]})</span>
          </button>
        ))}
      </div>

      <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderTop:'none', borderRadius:'0 0 10px 10px', overflow:'hidden' }}>
        {loading ? (
          <div style={{ padding:48, textAlign:'center' }}><div style={{ width:32, height:32, borderRadius:'50%', border:`3px solid ${accent}30`, borderTop:`3px solid ${accent}`, animation:'spin .8s linear infinite', margin:'0 auto' }}/></div>
        ) : filtered.length===0 ? (
          <div style={{ padding:48, textAlign:'center', color:'var(--text-dim)' }}>
            <div style={{ fontSize:40, marginBottom:12 }}>📋</div>
            <div style={{ fontSize:15, marginBottom:8 }}>{tab==='a_venir'?t(lang,'missions.empty_upcoming'):tab==='passee'?t(lang,'missions.empty_past'):t(lang,'missions.empty_archive')}</div>
            {tab==='a_venir' && userId && <button onClick={()=>setShowModal(true)} style={{ color:accent, background:'none', border:'none', cursor:'pointer', fontSize:14, fontWeight:600 }}>{t(lang,'missions.new')}</button>}
          </div>
        ) : (
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead>
              <tr>
                <th style={th}>{t(lang,'missions.col_mission')}</th>
                <th style={th}>{t(lang,'missions.col_etab')}</th>
                <th style={th}>{t(lang,'missions.col_date')}</th>
                <th style={th}>{t(lang,'missions.col_hours')}</th>
                <th style={th}>{t(lang,'missions.col_salary')}</th>
                {tab==='passee' && <th style={th}>{t(lang,'missions.col_docs')}</th>}
                <th style={{ ...th, width:40 }}></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(m=>{
                const etab = getEtab(m.etablissement_id)
                const docs = [
                  { key:'contrat_signe', icon:'📄', title:t(lang,'missions.tooltip_contract'), val:m.contrat_signe, date:m.date_contrat_signe },
                  { key:'fiche_paie_recue', icon:'💳', title:t(lang,'missions.tooltip_payslip'), val:m.fiche_paie_recue, date:m.date_fiche_paie_recue },
                  { key:'salaire_recu', icon:'💰', title:t(lang,'missions.tooltip_salary'), val:m.salaire_recu, date:m.date_salaire_recu },
                ]
                return (
                  <tr key={m.id} onClick={()=>setViewing(m)} style={{ cursor:'pointer' }}
                    onMouseEnter={e=>(e.currentTarget.style.background='var(--bg-hover)')}
                    onMouseLeave={e=>(e.currentTarget.style.background='')}>
                    <td style={td}>
                      <div style={{ fontWeight:700, fontSize:14 }}>{m.titre}</div>
                      {m.creneau_label && <div style={{ fontSize:11, color:accent, marginTop:1 }}>🕐 {m.creneau_label}</div>}
                    </td>
                    <td style={{ ...td, color:'var(--text-muted)' }}>{etab?.nom||'—'}</td>
                    <td style={td}>
                      <div style={{ fontWeight:600 }}>{fmtDate(m.date_debut)}</div>
                      <div style={{ fontSize:11, color:'var(--text-dim)', marginTop:1 }}>{m.date_debut?.split('T')[1]?.slice(0,5)||''} → {m.date_fin?.split('T')[1]?.slice(0,5)||''}</div>
                    </td>
                    <td style={{ ...td, fontWeight:700 }}>{m.heures}h</td>
                    <td style={{ ...td, color:accent, fontWeight:700 }}>{fmtEur(m.salaire_estime)}</td>
                    {tab==='passee' && (
                      <td style={td} onClick={e=>e.stopPropagation()}>
                        <div style={{ display:'flex', gap:4 }}>
                          {docs.map(d=>(
                            <div key={d.key} title={`${d.title}${d.val&&d.date?'\nPointé le '+fmtDateTime(d.date):''}`} onClick={e=>{e.stopPropagation();toggleDoc(m,d.key)}} style={{ width:28, height:28, borderRadius:7, border:`1px solid ${d.val?'rgba(16,185,129,.4)':'var(--border)'}`, background:d.val?'rgba(16,185,129,.12)':'transparent', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, transition:'all .15s' }}>
                              <span style={{ opacity:d.val?1:.3 }}>{d.icon}</span>
                            </div>
                          ))}
                        </div>
                      </td>
                    )}
                    <td style={{ ...td, padding:'13px 10px' }} onClick={e=>e.stopPropagation()}>
                      <ActionMenu
                        onView={()=>setViewing(m)}
                        onEdit={()=>{setEditing(m);setShowModal(true);setViewing(null)}}
                        onArchive={()=>archive(m)}
                        onDelete={()=>del(m.id)}
                      />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {showModal && userId && <MissionModal etabs={etabs} editing={editing} onClose={()=>{setShowModal(false);setEditing(null)}} onSaved={load} userId={userId}/>}
      {viewing && !showModal && <MissionDetail m={viewing} etab={getEtab(viewing.etablissement_id)} onClose={()=>setViewing(null)} onEdit={()=>{setEditing(viewing);setViewing(null);setShowModal(true)}} onToggleDoc={f=>toggleDoc(viewing,f)}/>}
      <style>{'@keyframes spin{to{transform:rotate(360deg)}} @keyframes slideIn{from{opacity:0;transform:scale(.97)}to{opacity:1;transform:none}} @keyframes popIn{from{opacity:0;transform:scale(.85)}to{opacity:1;transform:scale(1)}}'}</style>
    </div>
  )
}
