'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useTheme } from '@/lib/theme-context'

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

function calcHeures(deb:string, fin:string, pause:number) {
  if (!deb||!fin) return 0
  const a = new Date('2000-01-01T'+deb), b = new Date('2000-01-01T'+fin)
  return Math.max(0,(b.getTime()-a.getTime())/3600000-pause)
}
function calcSalaire(h:number, taux:number, nuit:boolean, dim:boolean, fer:boolean) {
  let m=0; if(nuit)m+=.25; if(dim)m+=.50; if(fer)m+=1
  return Math.round(h*taux*(1+m)*100)/100
}
function fmtDate(d:string|null) { if(!d)return '—'; return new Date(d).toLocaleDateString('fr-FR',{day:'2-digit',month:'2-digit',year:'2-digit'}) }
function fmtDateTime(d:string|null) { if(!d)return null; return new Date(d).toLocaleDateString('fr-FR',{day:'2-digit',month:'2-digit',year:'2-digit',hour:'2-digit',minute:'2-digit'}) }
function fmtEur(n:number) { return n.toLocaleString('fr-FR',{style:'currency',currency:'EUR',minimumFractionDigits:2}) }
function isPassee(m:Mission) {
  try { return new Date(m.date_fin) < new Date() } catch { return false }
}

// ===== MODAL MISSION (création + édition) =====
function MissionModal({ etabs, editing, defaultDate, onClose, onSaved }: { etabs:Etab[]; editing:Mission|null; defaultDate?:string; onClose:()=>void; onSaved:()=>void }) {
  const supabase = createClient()
  const { accent, userId } = useTheme()
  const today = defaultDate || new Date().toISOString().split('T')[0]
  const [form, setForm] = useState({
    etablissement_id: editing?.etablissement_id||'',
    titre: editing?.titre||'',
    date: editing?.date_debut?.split('T')[0]||today,
    debut: editing?.date_debut?.split('T')[1]?.slice(0,5)||'08:00',
    fin: editing?.date_fin?.split('T')[1]?.slice(0,5)||'18:00',
    pause_heures: editing?.pause_heures??1,
    majoration_nuit: editing?.majoration_nuit||false,
    majoration_dimanche: editing?.majoration_dimanche||false,
    majoration_ferie: editing?.majoration_ferie||false,
    notes: editing?.notes||'',
    creneau_label: editing?.creneau_label||'',
    creneau_index: -1,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [showNewCreneau, setShowNewCreneau] = useState(false)
  const [newCreneau, setNewCreneau] = useState({ label:'Matin', heure_debut:'08:00', heure_fin:'16:00', pause_minutes:30 })

  const etab = etabs.find(e=>e.id===form.etablissement_id)
  const creneaux = etab?.creneaux||[]
  const heures = calcHeures(form.debut, form.fin, Number(form.pause_heures))
  const salaire = calcSalaire(heures, etab?.taux_horaire||0, form.majoration_nuit, form.majoration_dimanche, form.majoration_ferie)
  const inp: React.CSSProperties = { width:'100%', padding:'9px 12px', borderRadius:8, border:'1px solid var(--border)', background:'var(--bg-input)', color:'var(--text)', fontSize:14, outline:'none', boxSizing:'border-box' }

  const applyCreneau = (c:Creneau, idx:number) => {
    setForm(f=>({ ...f, debut:c.heure_debut, fin:c.heure_fin, pause_heures:c.pause_minutes/60, creneau_label:c.label, creneau_index:idx, titre:f.titre||c.label }))
  }

  const saveNewCreneau = async () => {
    if (!etab||!userId) return
    const updated = [...creneaux, newCreneau]
    await supabase.from('etablissements').update({ creneaux:updated }).eq('id',etab.id).eq('user_id',userId)
    applyCreneau(newCreneau, updated.length-1)
    setShowNewCreneau(false)
  }

  const handleSave = async (e:React.FormEvent) => {
    e.preventDefault()
    if (!userId) { setError('Non connecté'); return }
    setSaving(true); setError('')
    const payload = {
      user_id:userId, etablissement_id:form.etablissement_id, titre:form.titre,
      date_debut:`${form.date}T${form.debut}:00`, date_fin:`${form.date}T${form.fin}:00`,
      pause_heures:Number(form.pause_heures), heures, salaire_estime:salaire,
      majoration_nuit:form.majoration_nuit, majoration_dimanche:form.majoration_dimanche, majoration_ferie:form.majoration_ferie,
      taux_majoration:(form.majoration_nuit?25:0)+(form.majoration_dimanche?50:0)+(form.majoration_ferie?100:0),
      notes:form.notes, creneau_label:form.creneau_label||null,
      statut: editing?.statut || 'a_venir', source:'manual',
    }
    let res
    if (editing) res = await supabase.from('missions').update(payload).eq('id',editing.id).eq('user_id',userId)
    else res = await supabase.from('missions').insert(payload)
    if (res.error) { setError(res.error.message); setSaving(false); return }
    setSaving(false); onSaved(); onClose()
  }

  return (
    <div style={{ position:'fixed', inset:0, background:'var(--overlay)', zIndex:500, display:'flex', alignItems:'center', justifyContent:'center', padding:16, animation:'fadeIn .15s ease' }} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{ background:'var(--bg-modal)', border:'1px solid var(--border)', borderRadius:14, padding:28, width:'100%', maxWidth:520, maxHeight:'92vh', overflow:'auto', boxShadow:'0 24px 60px var(--shadow)', animation:'slideIn .2s ease' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:22 }}>
          <h2 style={{ fontSize:17, fontWeight:800, color:'var(--text)' }}>{editing?'✏️ Modifier la mission':'➕ Nouvelle mission'}</h2>
          <button onClick={onClose} style={{ background:'none', border:'none', color:'var(--text-dim)', cursor:'pointer', fontSize:20 }}>✕</button>
        </div>
        {error && <div style={{ padding:'8px 12px', borderRadius:7, background:'rgba(239,68,68,.1)', border:'1px solid rgba(239,68,68,.3)', fontSize:13, color:'#ef4444', marginBottom:12 }}>❌ {error}</div>}
        <form onSubmit={handleSave} style={{ display:'flex', flexDirection:'column', gap:14 }}>
          {/* Établissement */}
          <div>
            <label style={{ display:'block', fontSize:12, fontWeight:600, color:'var(--text-muted)', marginBottom:5 }}>Établissement *</label>
            <select required value={form.etablissement_id} onChange={e=>setForm({...form,etablissement_id:e.target.value,creneau_label:'',creneau_index:-1})} style={inp}>
              <option value="">Sélectionner un établissement</option>
              {etabs.map(e=><option key={e.id} value={e.id}>{e.nom}</option>)}
            </select>
          </div>

          {/* Créneaux de l'établissement */}
          {etab && (
            <div>
              <label style={{ display:'block', fontSize:12, fontWeight:600, color:'var(--text-muted)', marginBottom:8 }}>Créneau de travail</label>
              <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                {creneaux.map((c,i)=>(
                  <button key={i} type="button" onClick={()=>applyCreneau(c,i)} style={{ padding:'7px 14px', borderRadius:8, border:`1.5px solid ${form.creneau_index===i?accent:'var(--border)'}`, background:form.creneau_index===i?'var(--accent-dim)':'var(--bg-input)', color:form.creneau_index===i?accent:'var(--text-muted)', cursor:'pointer', fontSize:13, fontWeight:form.creneau_index===i?700:400 }}>
                    {c.label} <span style={{ fontSize:11, opacity:.7 }}>{c.heure_debut}–{c.heure_fin}</span>
                  </button>
                ))}
                <button type="button" onClick={()=>setShowNewCreneau(!showNewCreneau)} style={{ padding:'7px 14px', borderRadius:8, border:`1.5px dashed ${accent}60`, background:'transparent', color:accent, cursor:'pointer', fontSize:13 }}>
                  + Créer un créneau
                </button>
              </div>
              {showNewCreneau && (
                <div style={{ marginTop:10, padding:'12px 14px', background:'var(--bg-input)', borderRadius:9, border:'1px solid var(--border)' }}>
                  <div style={{ fontSize:12, fontWeight:600, color:'var(--text-muted)', marginBottom:8 }}>Nouveau créneau pour {etab.nom}</div>
                  <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr 1fr', gap:8, marginBottom:8 }}>
                    <input placeholder="Label (ex: Matin)" value={newCreneau.label} onChange={e=>setNewCreneau({...newCreneau,label:e.target.value})} style={{ ...inp, fontSize:12 }}/>
                    <input type="time" value={newCreneau.heure_debut} onChange={e=>setNewCreneau({...newCreneau,heure_debut:e.target.value})} style={{ ...inp, fontSize:12 }}/>
                    <input type="time" value={newCreneau.heure_fin} onChange={e=>setNewCreneau({...newCreneau,heure_fin:e.target.value})} style={{ ...inp, fontSize:12 }}/>
                    <input type="number" placeholder="Pause min" value={newCreneau.pause_minutes} onChange={e=>setNewCreneau({...newCreneau,pause_minutes:Number(e.target.value)})} style={{ ...inp, fontSize:12 }}/>
                  </div>
                  <div style={{ display:'flex', gap:8 }}>
                    <button type="button" onClick={saveNewCreneau} style={{ padding:'6px 14px', borderRadius:7, border:'none', background:accent, color:'white', cursor:'pointer', fontSize:13, fontWeight:600 }}>Créer et appliquer</button>
                    <button type="button" onClick={()=>setShowNewCreneau(false)} style={{ padding:'6px 14px', borderRadius:7, border:'1px solid var(--border)', background:'transparent', color:'var(--text-muted)', cursor:'pointer', fontSize:13 }}>Annuler</button>
                  </div>
                </div>
              )}
            </div>
          )}

          <div>
            <label style={{ display:'block', fontSize:12, fontWeight:600, color:'var(--text-muted)', marginBottom:5 }}>Titre / Service *</label>
            <input required value={form.titre} onChange={e=>setForm({...form,titre:e.target.value})} placeholder="Ex : Urgences, Réanimation..." style={inp}/>
          </div>
          <div>
            <label style={{ display:'block', fontSize:12, fontWeight:600, color:'var(--text-muted)', marginBottom:5 }}>Date</label>
            <input type="date" value={form.date} onChange={e=>setForm({...form,date:e.target.value})} style={inp}/>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10 }}>
            <div><label style={{ display:'block', fontSize:12, fontWeight:600, color:'var(--text-muted)', marginBottom:5 }}>Début</label><input type="time" value={form.debut} onChange={e=>setForm({...form,debut:e.target.value})} style={inp}/></div>
            <div><label style={{ display:'block', fontSize:12, fontWeight:600, color:'var(--text-muted)', marginBottom:5 }}>Fin</label><input type="time" value={form.fin} onChange={e=>setForm({...form,fin:e.target.value})} style={inp}/></div>
            <div><label style={{ display:'block', fontSize:12, fontWeight:600, color:'var(--text-muted)', marginBottom:5 }}>Pause (h)</label><input type="number" step="0.25" min="0" value={form.pause_heures} onChange={e=>setForm({...form,pause_heures:Number(e.target.value)})} style={inp}/></div>
          </div>
          <div style={{ background:'var(--bg-input)', borderRadius:8, padding:'10px 14px', textAlign:'center' }}>
            <span style={{ color:'var(--text-muted)', fontSize:13 }}>Heures calculées : </span>
            <span style={{ fontSize:18, fontWeight:800, color:'var(--text)' }}>{heures.toFixed(2)}h</span>
          </div>
          <div>
            <label style={{ display:'block', fontSize:12, fontWeight:600, color:'var(--text-muted)', marginBottom:8 }}>Majorations</label>
            <div style={{ display:'flex', gap:12, flexWrap:'wrap' }}>
              {([['majoration_nuit','🌙 Nuit (+25%)'],['majoration_dimanche','☀️ Dimanche (+50%)'],['majoration_ferie','🎉 Férié (+100%)']] as [string,string][]).map(([k,lbl])=>(
                <label key={k} style={{ display:'flex', alignItems:'center', gap:7, cursor:'pointer', fontSize:13, color:'var(--text-muted)' }}>
                  <input type="checkbox" checked={(form as any)[k]} onChange={e=>setForm({...form,[k]:e.target.checked})} style={{ accentColor:accent, width:15, height:15 }}/>{lbl}
                </label>
              ))}
            </div>
          </div>
          <div style={{ background:'var(--accent-dim)', border:'1px solid var(--accent-border)', borderRadius:9, padding:'12px 16px', textAlign:'center' }}>
            <span style={{ color:'var(--text-muted)', fontSize:13 }}>Salaire estimé : </span>
            <span style={{ fontSize:22, fontWeight:800, color:accent }}>{fmtEur(salaire)}</span>
          </div>
          <div>
            <label style={{ display:'block', fontSize:12, fontWeight:600, color:'var(--text-muted)', marginBottom:5 }}>Notes</label>
            <textarea value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} rows={2} placeholder="Notes supplémentaires..." style={{ ...inp, resize:'vertical' as const }}/>
          </div>
          <div style={{ display:'flex', gap:10, justifyContent:'flex-end', marginTop:4 }}>
            <button type="button" onClick={onClose} style={{ padding:'10px 18px', borderRadius:9, border:'1px solid var(--border)', background:'transparent', color:'var(--text-muted)', cursor:'pointer', fontSize:14 }}>Annuler</button>
            <button type="submit" disabled={saving} style={{ padding:'10px 24px', borderRadius:9, border:'none', background:`linear-gradient(135deg,${accent},#a855f7)`, color:'white', cursor:'pointer', fontSize:14, fontWeight:700 }}>{saving?'Sauvegarde...':editing?'Enregistrer':'Créer la mission'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ===== MODAL DÉTAIL MISSION =====
function MissionDetailModal({ mission, etab, onClose, onEdit, onToggleDoc }: { mission:Mission; etab:Etab|undefined; onClose:()=>void; onEdit:()=>void; onToggleDoc:(field:string)=>void }) {
  const { accent } = useTheme()
  const fmtH = (d:string) => d?.split('T')[1]?.slice(0,5)||'—'
  const maj = [mission.majoration_nuit&&'Nuit +25%', mission.majoration_dimanche&&'Dimanche +50%', mission.majoration_ferie&&'Férié +100%'].filter(Boolean) as string[]
  const docs = [
    { key:'contrat_signe', icon:'📄', label:'Contrat signé', date:mission.date_contrat_signe, val:mission.contrat_signe },
    { key:'fiche_paie_recue', icon:'💳', label:'Fiche de paie reçue', date:mission.date_fiche_paie_recue, val:mission.fiche_paie_recue },
    { key:'salaire_recu', icon:'💰', label:'Salaire reçu', date:mission.date_salaire_recu, val:mission.salaire_recu },
  ]
  return (
    <div style={{ position:'fixed', inset:0, background:'var(--overlay)', zIndex:500, display:'flex', alignItems:'center', justifyContent:'center', padding:16, animation:'fadeIn .15s ease' }} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{ background:'var(--bg-modal)', border:'1px solid var(--border)', borderRadius:16, padding:28, width:'100%', maxWidth:500, maxHeight:'90vh', overflow:'auto', boxShadow:'0 24px 60px var(--shadow)', animation:'slideIn .2s ease' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:20 }}>
          <div>
            <h2 style={{ fontSize:20, fontWeight:800, color:'var(--text)', marginBottom:4 }}>{mission.titre}</h2>
            <div style={{ fontSize:13, color:'var(--text-muted)' }}>{etab?.nom||'—'}</div>
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={onEdit} style={{ padding:'7px 14px', borderRadius:8, border:`1px solid ${accent}`, background:'var(--accent-dim)', color:accent, cursor:'pointer', fontSize:13, fontWeight:600 }}>✏️ Modifier</button>
            <button onClick={onClose} style={{ background:'none', border:'none', color:'var(--text-dim)', cursor:'pointer', fontSize:22 }}>✕</button>
          </div>
        </div>
        {/* Infos principales */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:16 }}>
          {[
            ['📅 Date', fmtDate(mission.date_debut)],
            ['⏰ Horaires', `${mission.date_debut?.split('T')[1]?.slice(0,5)||'—'} → ${mission.date_fin?.split('T')[1]?.slice(0,5)||'—'}`],
            ['⏱ Heures', `${mission.heures}h`],
            ['💶 Salaire', fmtEur(mission.salaire_estime)],
          ].map(([lbl,val])=>(
            <div key={lbl} style={{ background:'var(--bg-input)', borderRadius:9, padding:'12px 14px' }}>
              <div style={{ fontSize:11, color:'var(--text-dim)', marginBottom:3 }}>{lbl}</div>
              <div style={{ fontSize:15, fontWeight:700, color:'var(--text)' }}>{val}</div>
            </div>
          ))}
        </div>
        {mission.creneau_label && <div style={{ background:'var(--accent-dim)', border:'1px solid var(--accent-border)', borderRadius:8, padding:'8px 12px', fontSize:13, color:accent, marginBottom:14, fontWeight:600 }}>🕐 Créneau : {mission.creneau_label}</div>}
        {maj.length > 0 && <div style={{ background:'rgba(245,158,11,.1)', border:'1px solid rgba(245,158,11,.3)', borderRadius:8, padding:'8px 12px', fontSize:13, color:'#f59e0b', marginBottom:14 }}>⚡ Majorations : {maj.join(', ')}</div>}
        {/* Suivi administratif */}
        <div style={{ borderTop:'1px solid var(--border)', paddingTop:16, marginBottom:8 }}>
          <div style={{ fontSize:13, fontWeight:700, color:'var(--text)', marginBottom:12 }}>📋 Suivi administratif</div>
          {docs.map(d=>(
            <div key={d.key} onClick={()=>onToggleDoc(d.key)} style={{ display:'flex', alignItems:'center', gap:12, padding:'11px 14px', borderRadius:9, background:d.val?'rgba(16,185,129,.08)':'var(--bg-input)', border:`1px solid ${d.val?'rgba(16,185,129,.3)':'var(--border)'}`, marginBottom:8, cursor:'pointer', transition:'all .15s' }}>
              <span style={{ fontSize:20 }}>{d.icon}</span>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:13, fontWeight:600, color:'var(--text)' }}>{d.label}</div>
                {d.val && d.date && <div style={{ fontSize:11, color:'var(--text-dim)', marginTop:1 }}>Pointé le {fmtDateTime(d.date)}</div>}
                {!d.val && <div style={{ fontSize:11, color:'var(--text-dim)', marginTop:1 }}>Cliquer pour pointer</div>}
              </div>
              <div style={{ width:22, height:22, borderRadius:'50%', border:`2px solid ${d.val?'#10b981':'var(--border)'}`, background:d.val?'#10b981':'transparent', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, color:'white', flexShrink:0 }}>{d.val?'✓':''}</div>
            </div>
          ))}
        </div>
        {mission.notes && <div style={{ background:'var(--bg-input)', borderRadius:9, padding:'10px 14px', fontSize:13, color:'var(--text-muted)', borderTop:'1px solid var(--border)', marginTop:8 }}><span style={{ fontWeight:600, color:'var(--text)' }}>Notes : </span>{mission.notes}</div>}
      </div>
    </div>
  )
}

// ===== MENU 3 POINTS =====
function ActionMenu({ onEdit, onDelete, onArchive, canArchive }: { onEdit:()=>void; onDelete:()=>void; onArchive?:()=>void; canArchive?:boolean }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const h = (e:MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown',h); return () => document.removeEventListener('mousedown',h)
  }, [])
  return (
    <div ref={ref} style={{ position:'relative' }}>
      <button onClick={e=>{e.stopPropagation();setOpen(!open)}} style={{ width:28, height:28, borderRadius:7, border:'1px solid var(--border)', background:'var(--bg-card)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--text-muted)', fontSize:16, flexShrink:0 }}>
        ⋮
      </button>
      {open && (
        <div style={{ position:'absolute', top:'calc(100% + 4px)', right:0, background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:10, boxShadow:'0 8px 24px var(--shadow)', zIndex:100, minWidth:140, overflow:'hidden', animation:'popIn .15s ease' }}>
          <button onClick={e=>{e.stopPropagation();onEdit();setOpen(false)}} style={{ width:'100%', padding:'10px 14px', border:'none', background:'transparent', color:'var(--text)', cursor:'pointer', fontSize:13, textAlign:'left', display:'flex', alignItems:'center', gap:8 }}>✏️ Modifier</button>
          {canArchive && onArchive && <button onClick={e=>{e.stopPropagation();onArchive();setOpen(false)}} style={{ width:'100%', padding:'10px 14px', border:'none', background:'transparent', color:'var(--warning)', cursor:'pointer', fontSize:13, textAlign:'left', display:'flex', alignItems:'center', gap:8 }}>📦 Archiver</button>}
          <div style={{ height:1, background:'var(--border)', margin:'0 8px' }}/>
          <button onClick={e=>{e.stopPropagation();onDelete();setOpen(false)}} style={{ width:'100%', padding:'10px 14px', border:'none', background:'transparent', color:'#ef4444', cursor:'pointer', fontSize:13, textAlign:'left', display:'flex', alignItems:'center', gap:8 }}>🗑 Supprimer</button>
        </div>
      )}
    </div>
  )
}

// ===== PAGE PRINCIPALE =====
export default function MissionsPage() {
  const [missions, setMissions] = useState<Mission[]>([])
  const [etabs, setEtabs] = useState<Etab[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('a_venir')
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Mission|null>(null)
  const [viewing, setViewing] = useState<Mission|null>(null)
  const supabase = createClient()
  const { accent, userId } = useTheme()

  const load = useCallback(async () => {
    if (!userId) return
    const [m, e] = await Promise.all([
      supabase.from('missions').select('*').eq('user_id',userId).order('date_debut',{ascending:false}),
      supabase.from('etablissements').select('*').eq('user_id',userId).eq('archived',false).order('nom'),
    ])
    const rawMissions = (m.data||[]) as Mission[]
    // Auto-passer en "passee" si la date est dépassée
    const toUpdate = rawMissions.filter(mi => mi.statut==='a_venir' && isPassee(mi))
    if (toUpdate.length > 0) {
      await Promise.all(toUpdate.map(mi => supabase.from('missions').update({statut:'passee'}).eq('id',mi.id).eq('user_id',userId)))
      toUpdate.forEach(mi => { mi.statut='passee' })
    }
    setMissions(rawMissions)
    setEtabs((e.data||[]) as Etab[])
    setLoading(false)
  }, [userId])

  useEffect(() => { if (userId) load() }, [load, userId])

  const toggleDoc = async (m:Mission, field:string) => {
    if (!userId) return
    const newVal = !(m as any)[field]
    const dateField = `date_${field}` as string
    const payload: any = { [field]: newVal }
    payload[dateField] = newVal ? new Date().toISOString() : null

    await supabase.from('missions').update(payload).eq('id',m.id).eq('user_id',userId)

    // Vérifier si on doit archiver (3 statuts cochés)
    const updated = { ...m, [field]: newVal, [dateField]: newVal ? new Date().toISOString() : null }
    const allDone = updated.contrat_signe && updated.fiche_paie_recue && updated.salaire_recu
    if (allDone && updated.statut === 'passee') {
      if (confirm('✅ Tous les documents sont reçus ! Archiver cette mission ?')) {
        await supabase.from('missions').update({ statut:'archive', date_archive:new Date().toISOString() }).eq('id',m.id).eq('user_id',userId)
      }
    }
    load()
    // Mettre à jour le viewing si ouvert
    if (viewing?.id === m.id) {
      setViewing(v => v ? { ...v, [field]:newVal, [dateField]:newVal?new Date().toISOString():null } : null)
    }
  }

  const del = async (id:string) => {
    if (!confirm('Supprimer cette mission ?')) return
    await supabase.from('missions').delete().eq('id',id).eq('user_id',userId!)
    if (viewing?.id===id) setViewing(null)
    load()
  }

  const archive = async (m:Mission) => {
    await supabase.from('missions').update({ statut:'archive', date_archive:new Date().toISOString() }).eq('id',m.id).eq('user_id',userId!)
    load()
  }

  const getEtab = (id:string) => etabs.find(e=>e.id===id)
  const counts = {
    a_venir: missions.filter(m=>m.statut==='a_venir').length,
    passee: missions.filter(m=>m.statut==='passee').length,
    archive: missions.filter(m=>m.statut==='archive').length,
  }
  const filtered = missions.filter(m => {
    if (m.statut!==tab) return false
    if (search && !m.titre.toLowerCase().includes(search.toLowerCase()) && !(getEtab(m.etablissement_id)?.nom||'').toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const TABS = [['a_venir','🗓 À venir'],['passee','✅ Passées'],['archive','📦 Archivées']]

  const td: React.CSSProperties = { padding:'14px 16px', borderBottom:'1px solid var(--border)', fontSize:14, color:'var(--text)', verticalAlign:'middle' }
  const th: React.CSSProperties = { padding:'11px 16px', textAlign:'left', fontSize:11, fontWeight:700, color:'var(--text-dim)', borderBottom:'1px solid var(--border)', letterSpacing:'.06em', textTransform:'uppercase', background:'var(--bg-input)' }

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24 }}>
        <div>
          <h1 style={{ fontSize:26, fontWeight:800, color:'var(--text)', marginBottom:3 }}>Mes missions</h1>
          <div style={{ fontSize:14, color:'var(--text-dim)' }}>{missions.filter(m=>m.statut==='a_venir').length} à venir · {missions.filter(m=>m.statut==='passee').length} passées</div>
        </div>
        <button onClick={()=>{setEditing(null);setShowModal(true)}} style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 20px', borderRadius:10, border:'none', background:`linear-gradient(135deg,${accent},#a855f7)`, color:'white', cursor:'pointer', fontSize:14, fontWeight:700, boxShadow:`0 2px 14px ${accent}40` }}>
          + Nouvelle mission
        </button>
      </div>

      {/* Barre de recherche */}
      <div style={{ position:'relative', marginBottom:16 }}>
        <svg style={{ position:'absolute', left:14, top:'50%', transform:'translateY(-50%)', color:'var(--text-dim)' }} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Rechercher une mission ou un établissement..." style={{ width:'100%', padding:'11px 14px 11px 42px', borderRadius:10, border:'1px solid var(--border)', background:'var(--bg-card)', color:'var(--text)', fontSize:14, outline:'none', boxSizing:'border-box' }}/>
      </div>

      {/* Onglets */}
      <div style={{ display:'flex', gap:0, marginBottom:0, background:'var(--bg-card)', border:'1px solid var(--border)', borderBottom:'none', borderRadius:'10px 10px 0 0', overflow:'hidden', display:'inline-flex' }}>
        {TABS.map(([k,lbl])=>(
          <button key={k} onClick={()=>setTab(k)} style={{ padding:'11px 22px', border:'none', background:tab===k?'var(--bg-hover)':'transparent', color:tab===k?'var(--text)':'var(--text-dim)', cursor:'pointer', fontSize:14, fontWeight:tab===k?700:400, borderBottom:tab===k?`2px solid ${accent}`:'2px solid transparent', whiteSpace:'nowrap' }}>
            {lbl} <span style={{ fontSize:12, opacity:.7 }}>({(counts as any)[k]})</span>
          </button>
        ))}
      </div>

      {/* Tableau */}
      <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderTop:'none', borderRadius:'0 0 10px 10px', overflow:'hidden' }}>
        {loading ? (
          <div style={{ padding:48, textAlign:'center' }}><div style={{ width:32, height:32, borderRadius:'50%', border:`3px solid var(--accent-dim)`, borderTop:`3px solid ${accent}`, animation:'spin .8s linear infinite', margin:'0 auto' }}/></div>
        ) : filtered.length===0 ? (
          <div style={{ padding:56, textAlign:'center', color:'var(--text-dim)' }}>
            <div style={{ fontSize:40, marginBottom:12 }}>📋</div>
            <div style={{ fontSize:15, marginBottom:8 }}>Aucune mission {tab==='a_venir'?'à venir':tab==='passee'?'passée':'archivée'}</div>
            {tab==='a_venir' && <button onClick={()=>setShowModal(true)} style={{ color:accent, background:'none', border:'none', cursor:'pointer', fontSize:14, fontWeight:600 }}>+ Créer une mission</button>}
          </div>
        ) : (
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead>
              <tr>
                <th style={th}>Mission</th>
                <th style={th}>Établissement</th>
                <th style={th}>Date & Horaires</th>
                <th style={th}>Heures</th>
                <th style={th}>Salaire</th>
                {tab==='passee' && <th style={th}>Suivi docs</th>}
                <th style={{ ...th, width:40 }}></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(m=>{
                const etab = getEtab(m.etablissement_id)
                const debut = m.date_debut?.split('T')[1]?.slice(0,5)||''
                const fin = m.date_fin?.split('T')[1]?.slice(0,5)||''
                const docs = [
                  { key:'contrat_signe', icon:'📄', label:'Contrat', val:m.contrat_signe, date:m.date_contrat_signe },
                  { key:'fiche_paie_recue', icon:'💳', label:'Fiche de paie', val:m.fiche_paie_recue, date:m.date_fiche_paie_recue },
                  { key:'salaire_recu', icon:'💰', label:'Salaire', val:m.salaire_recu, date:m.date_salaire_recu },
                ]
                return (
                  <tr key={m.id} onClick={()=>setViewing(m)} style={{ cursor:'pointer', transition:'background .1s' }}
                    onMouseEnter={e=>(e.currentTarget.style.background='var(--bg-hover)')}
                    onMouseLeave={e=>(e.currentTarget.style.background='')}>
                    <td style={td}>
                      <div style={{ fontWeight:700, fontSize:14, color:'var(--text)' }}>{m.titre}</div>
                      {m.creneau_label && <div style={{ fontSize:11, color:accent, marginTop:2 }}>🕐 {m.creneau_label}</div>}
                      {m.source==='google_calendar' && <div style={{ fontSize:10, color:'#3b82f6', marginTop:1 }}>📅 Google Calendar</div>}
                    </td>
                    <td style={{ ...td, color:'var(--text-muted)' }}>{etab?.nom||'—'}</td>
                    <td style={td}>
                      <div style={{ fontWeight:600, fontSize:13 }}>{fmtDate(m.date_debut)}</div>
                      {debut && fin && <div style={{ fontSize:11, color:'var(--text-dim)', marginTop:2 }}>{debut} → {fin}</div>}
                    </td>
                    <td style={{ ...td, fontWeight:700 }}>{m.heures}h</td>
                    <td style={{ ...td, color:accent, fontWeight:700 }}>{fmtEur(m.salaire_estime)}</td>
                    {tab==='passee' && (
                      <td style={td} onClick={e=>e.stopPropagation()}>
                        <div style={{ display:'flex', gap:5 }}>
                          {docs.map(d=>(
                            <div key={d.key} title={`${d.label}${d.val&&d.date?' — pointé le '+fmtDateTime(d.date):''}`} onClick={e=>{e.stopPropagation();toggleDoc(m,d.key)}} style={{ width:30, height:30, borderRadius:7, border:`1px solid ${d.val?'rgba(16,185,129,.4)':'var(--border)'}`, background:d.val?'rgba(16,185,129,.12)':'transparent', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, transition:'all .15s', flexShrink:0 }}>
                              <span style={{ opacity:d.val?1:.3 }}>{d.icon}</span>
                            </div>
                          ))}
                        </div>
                      </td>
                    )}
                    <td style={{ ...td, padding:'14px 12px' }} onClick={e=>e.stopPropagation()}>
                      <ActionMenu
                        onEdit={()=>{setEditing(m);setShowModal(true);setViewing(null)}}
                        onDelete={()=>del(m.id)}
                        onArchive={tab!=='archive'?()=>archive(m):undefined}
                        canArchive={tab!=='archive'}
                      />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {showModal && <MissionModal etabs={etabs} editing={editing} defaultDate={new Date().toISOString().split('T')[0]} onClose={()=>{setShowModal(false);setEditing(null)}} onSaved={load}/>}
      {viewing && !showModal && <MissionDetailModal
        mission={viewing}
        etab={getEtab(viewing.etablissement_id)}
        onClose={()=>setViewing(null)}
        onEdit={()=>{setEditing(viewing);setViewing(null);setShowModal(true)}}
        onToggleDoc={(field)=>toggleDoc(viewing,field)}
      />}
    </div>
  )
}
