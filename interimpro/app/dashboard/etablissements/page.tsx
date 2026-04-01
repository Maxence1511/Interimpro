'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { getSupabase } from '@/lib/supabase/client'
import { useTheme } from '@/lib/theme-context'
import { t } from '@/lib/i18n'

type Creneau = { label:string; heure_debut:string; heure_fin:string; pause_minutes:number }
type Etab = { id:string; nom:string; type_etablissement:string; type?:string; adresse:string; telephone:string; email_contact:string; email?:string; contact_nom:string; taux_horaire:number; notes:string; creneaux:Creneau[]; archived:boolean }

function ActionMenu({ onView, onEdit, onArchive }: { onView:()=>void; onEdit:()=>void; onArchive:()=>void }) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState({ top:0, right:0 })
  const ref = useRef<HTMLDivElement>(null)
  const btnRef = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    const h=(e:MouseEvent)=>{ if(ref.current&&!ref.current.contains(e.target as Node))setOpen(false) }
    document.addEventListener('mousedown',h); return ()=>document.removeEventListener('mousedown',h)
  }, [])
  const handleOpen = (e:React.MouseEvent) => {
    e.stopPropagation()
    if (!open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect()
      setPos({ top: r.bottom + 4, right: window.innerWidth - r.right })
    }
    setOpen(!open)
  }
  return (
    <div ref={ref} onClick={e=>e.stopPropagation()}>
      <button ref={btnRef} onClick={handleOpen} style={{ width:28, height:28, borderRadius:7, border:'1px solid var(--border)', background:'var(--bg-input)', cursor:'pointer', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:2, padding:0, color:'var(--text-muted)', flexShrink:0 }}>
        <div style={{ width:3, height:3, borderRadius:'50%', background:'currentColor' }}/>
        <div style={{ width:3, height:3, borderRadius:'50%', background:'currentColor' }}/>
        <div style={{ width:3, height:3, borderRadius:'50%', background:'currentColor' }}/>
      </button>
      {open && (
        <div style={{ position:'fixed', top:pos.top, right:pos.right, background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:10, boxShadow:'0 8px 32px var(--shadow)', zIndex:9999, minWidth:160, overflow:'hidden', animation:'popIn .15s ease' }}>
          <button onClick={()=>{onView();setOpen(false)}} style={{ width:'100%', padding:'10px 14px', border:'none', background:'transparent', color:'var(--text)', cursor:'pointer', fontSize:13, textAlign:'left', display:'flex', alignItems:'center', gap:8 }}>👁 Voir les détails</button>
          <button onClick={()=>{onEdit();setOpen(false)}} style={{ width:'100%', padding:'10px 14px', border:'none', background:'transparent', color:'var(--text)', cursor:'pointer', fontSize:13, textAlign:'left', display:'flex', alignItems:'center', gap:8 }}>✏️ Modifier</button>
          <div style={{ height:1, background:'var(--border)', margin:'0 8px' }}/>
          <button onClick={()=>{onArchive();setOpen(false)}} style={{ width:'100%', padding:'10px 14px', border:'none', background:'transparent', color:'#f97316', cursor:'pointer', fontSize:13, textAlign:'left', display:'flex', alignItems:'center', gap:8 }}>📦 Archiver</button>
        </div>
      )}
    </div>
  )
}

function EtabDetail({ etab, onClose, onEdit }: { etab:Etab; onClose:()=>void; onEdit:()=>void }) {
  const { accent } = useTheme()
  const fmtEur = (n:number) => n?.toLocaleString('fr-FR',{style:'currency',currency:'EUR',minimumFractionDigits:2})||'—'
  return (
    <div style={{ position:'fixed', inset:0, background:'var(--overlay)', zIndex:500, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{ background:'var(--bg-modal)', border:'1px solid var(--border)', borderRadius:16, padding:28, width:'100%', maxWidth:480, maxHeight:'88vh', overflow:'auto', boxShadow:'0 24px 60px var(--shadow)', animation:'slideIn .2s ease' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:20 }}>
          <div>
            <h2 style={{ fontSize:20, fontWeight:800, color:'var(--text)', marginBottom:4 }}>{etab.nom}</h2>
            <span style={{ fontSize:12, color:accent, background:'var(--accent-dim)', border:'1px solid var(--accent-border)', borderRadius:100, padding:'2px 10px' }}>{etab.type_etablissement||etab.type||'—'}</span>
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={onEdit} style={{ padding:'7px 14px', borderRadius:8, border:`1px solid ${accent}`, background:'var(--accent-dim)', color:accent, cursor:'pointer', fontSize:13, fontWeight:600 }}>✏️ Modifier</button>
            <button onClick={onClose} style={{ background:'none', border:'none', color:'var(--text-dim)', cursor:'pointer', fontSize:22 }}>✕</button>
          </div>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:14 }}>
          {[['💶 Taux horaire',fmtEur(etab.taux_horaire)+'/h'],['📞 Téléphone',etab.telephone||'—'],['📍 Adresse',etab.adresse||'—'],['👤 Contact',etab.contact_nom||'—'],['📧 Email',etab.email_contact||etab.email||'—']].map(([l,v])=>(
            <div key={l} style={{ background:'var(--bg-input)', borderRadius:9, padding:'10px 14px' }}>
              <div style={{ fontSize:11, color:'var(--text-dim)', marginBottom:2 }}>{l}</div>
              <div style={{ fontSize:13, fontWeight:600, color:'var(--text)', wordBreak:'break-all' }}>{v}</div>
            </div>
          ))}
        </div>
        {(etab.creneaux||[]).length>0 && (
          <div style={{ background:'var(--bg-input)', borderRadius:9, padding:'12px 14px', marginBottom:10 }}>
            <div style={{ fontSize:12, fontWeight:700, color:'var(--text-muted)', marginBottom:8 }}>🕐 CRÉNEAUX</div>
            {etab.creneaux.map((c,i)=>(
              <div key={i} style={{ display:'flex', justifyContent:'space-between', padding:'6px 0', borderBottom:'1px solid var(--border)' }}>
                <span style={{ fontSize:13, fontWeight:600, color:'var(--text)' }}>{c.label}</span>
                <span style={{ fontSize:12, color:'var(--text-dim)' }}>{c.heure_debut}→{c.heure_fin} · {c.pause_minutes}min</span>
              </div>
            ))}
          </div>
        )}
        {etab.notes && <div style={{ background:'var(--bg-input)', borderRadius:9, padding:'9px 12px', fontSize:13, color:'var(--text-muted)' }}><span style={{ fontWeight:600, color:'var(--text)' }}>Notes : </span>{etab.notes}</div>}
      </div>
    </div>
  )
}

function EtabModal({ editing, onClose, onSaved, userId }: { editing:Etab|null; onClose:()=>void; onSaved:()=>void; userId:string }) {
  const { accent, lang } = useTheme()
  const [form, setForm] = useState({
    nom:editing?.nom||'', type_etablissement:editing?.type_etablissement||editing?.type||'EHPAD',
    adresse:editing?.adresse||'', telephone:editing?.telephone||'',
    email_contact:editing?.email_contact||editing?.email||'', taux_horaire:editing?.taux_horaire||16.32,
    contact_nom:editing?.contact_nom||'', notes:editing?.notes||'', creneaux:(editing?.creneaux||[]) as Creneau[]
  })
  const [newC, setNewC] = useState({ label:'', heure_debut:'08:00', heure_fin:'16:00', pause_minutes:30 })
  const [saving, setSaving] = useState(false); const [error, setError] = useState('')
  const TYPES = ['EHPAD','Clinique','CHU','CH','SSIAD','HAD','Cabinet libéral','Autre']
  const inp: React.CSSProperties = { width:'100%', padding:'9px 12px', borderRadius:8, border:'1px solid var(--border)', background:'var(--bg-input)', color:'var(--text)', fontSize:13, outline:'none', boxSizing:'border-box' }

  const save = async (e:React.FormEvent) => {
    e.preventDefault(); setSaving(true); setError('')
    const sb = getSupabase()
    const payload = { user_id:userId, nom:form.nom, type_etablissement:form.type_etablissement, type:form.type_etablissement, adresse:form.adresse, telephone:form.telephone, email_contact:form.email_contact, email:form.email_contact, taux_horaire:Number(form.taux_horaire), contact_nom:form.contact_nom, notes:form.notes, creneaux:form.creneaux, archived:false }
    const res = editing ? await sb.from('etablissements').update(payload).eq('id',editing.id).eq('user_id',userId) : await sb.from('etablissements').insert(payload)
    if (res.error) { setError(res.error.message); setSaving(false); return }
    setSaving(false); onSaved(); onClose()
  }

  return (
    <div style={{ position:'fixed', inset:0, background:'var(--overlay)', zIndex:500, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{ background:'var(--bg-modal)', border:'1px solid var(--border)', borderRadius:14, padding:28, width:'100%', maxWidth:560, maxHeight:'92vh', overflow:'auto', boxShadow:'0 24px 60px var(--shadow)', animation:'slideIn .2s ease' }}>
        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:20 }}>
          <h2 style={{ fontSize:17, fontWeight:800, color:'var(--text)' }}>{editing?t(lang,'etabs.modal_edit'):t(lang,'etabs.modal_new')}</h2>
          <button onClick={onClose} style={{ background:'none', border:'none', color:'var(--text-dim)', cursor:'pointer', fontSize:20 }}>✕</button>
        </div>
        {error && <div style={{ padding:'8px 12px', borderRadius:7, background:'rgba(239,68,68,.1)', fontSize:13, color:'#ef4444', marginBottom:12 }}>❌ {error}</div>}
        <form onSubmit={save} style={{ display:'flex', flexDirection:'column', gap:12 }}>
          <div><label style={{ display:'block', fontSize:11, color:'var(--text-muted)', marginBottom:4 }}>{t(lang,'etabs.field_name')}</label><input required value={form.nom} onChange={e=>setForm({...form,nom:e.target.value})} style={inp}/></div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
            <div><label style={{ display:'block', fontSize:11, color:'var(--text-muted)', marginBottom:4 }}>{t(lang,'etabs.field_type')}</label>
              <select value={form.type_etablissement} onChange={e=>setForm({...form,type_etablissement:e.target.value})} style={inp}>{TYPES.map(tp=><option key={tp}>{tp}</option>)}</select>
            </div>
            <div><label style={{ display:'block', fontSize:11, color:'var(--text-muted)', marginBottom:4 }}>{t(lang,'etabs.field_rate')}</label>
              <input type="number" step="0.01" min="0" value={form.taux_horaire} onChange={e=>setForm({...form,taux_horaire:Number(e.target.value)})} style={inp}/>
            </div>
          </div>
          <div><label style={{ display:'block', fontSize:11, color:'var(--text-muted)', marginBottom:4 }}>{t(lang,'etabs.field_address')}</label><input value={form.adresse} onChange={e=>setForm({...form,adresse:e.target.value})} style={inp}/></div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
            <div><label style={{ display:'block', fontSize:11, color:'var(--text-muted)', marginBottom:4 }}>{t(lang,'etabs.field_phone')}</label><input value={form.telephone} onChange={e=>setForm({...form,telephone:e.target.value})} style={inp}/></div>
            <div><label style={{ display:'block', fontSize:11, color:'var(--text-muted)', marginBottom:4 }}>{t(lang,'etabs.field_contact')}</label><input value={form.contact_nom} onChange={e=>setForm({...form,contact_nom:e.target.value})} style={inp}/></div>
          </div>
          <div><label style={{ display:'block', fontSize:11, color:'var(--text-muted)', marginBottom:4 }}>{t(lang,'etabs.field_email')}</label><input type="email" value={form.email_contact} onChange={e=>setForm({...form,email_contact:e.target.value})} style={inp}/></div>
          <div style={{ background:'var(--bg-input)', borderRadius:10, padding:'12px 14px' }}>
            <div style={{ fontSize:12, fontWeight:700, color:'var(--text)', marginBottom:10 }}>{t(lang,'etabs.creneaux')}</div>
            {form.creneaux.map((c,i)=>(
              <div key={i} style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6, padding:'7px 10px', background:'var(--bg-card)', borderRadius:8, border:'1px solid var(--border)' }}>
                <span style={{ fontSize:13, fontWeight:600, color:'var(--text)', flex:1 }}>{c.label}</span>
                <span style={{ fontSize:12, color:'var(--text-dim)' }}>{c.heure_debut}→{c.heure_fin} ({c.pause_minutes}min)</span>
                <button type="button" onClick={()=>setForm(f=>({...f,creneaux:f.creneaux.filter((_,j)=>j!==i)}))} style={{ background:'none', border:'none', color:'#ef4444', cursor:'pointer', fontSize:16, padding:0 }}>✕</button>
              </div>
            ))}
            <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr 1fr auto', gap:6, marginTop:8, alignItems:'end' }}>
              <div><div style={{ fontSize:11, color:'var(--text-muted)', marginBottom:3 }}>{t(lang,'etabs.creneau_label')}</div><input placeholder="ex: Matin" value={newC.label} onChange={e=>setNewC({...newC,label:e.target.value})} style={{ ...inp, fontSize:12 }}/></div>
              <div><div style={{ fontSize:11, color:'var(--text-muted)', marginBottom:3 }}>Début</div><input type="time" value={newC.heure_debut} onChange={e=>setNewC({...newC,heure_debut:e.target.value})} style={{ ...inp, fontSize:12 }}/></div>
              <div><div style={{ fontSize:11, color:'var(--text-muted)', marginBottom:3 }}>Fin</div><input type="time" value={newC.heure_fin} onChange={e=>setNewC({...newC,heure_fin:e.target.value})} style={{ ...inp, fontSize:12 }}/></div>
              <div><div style={{ fontSize:11, color:'var(--text-muted)', marginBottom:3 }}>{t(lang,'etabs.creneau_break')}</div><input type="number" value={newC.pause_minutes} onChange={e=>setNewC({...newC,pause_minutes:Number(e.target.value)})} style={{ ...inp, fontSize:12 }}/></div>
              <button type="button" onClick={()=>{ if(newC.label){setForm(f=>({...f,creneaux:[...f.creneaux,{...newC}]}));setNewC({label:'',heure_debut:'08:00',heure_fin:'16:00',pause_minutes:30})} }} style={{ padding:'9px 12px', borderRadius:7, border:`1px solid ${accent}`, background:'var(--accent-dim)', color:accent, cursor:'pointer', fontSize:13, fontWeight:700 }}>{t(lang,'etabs.creneau_add')}</button>
            </div>
          </div>
          <div><label style={{ display:'block', fontSize:11, color:'var(--text-muted)', marginBottom:4 }}>{t(lang,'etabs.field_notes')}</label><textarea value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} rows={2} style={{ ...inp, resize:'vertical' as const }}/></div>
          <div style={{ display:'flex', gap:10, justifyContent:'flex-end', marginTop:4 }}>
            <button type="button" onClick={onClose} style={{ padding:'10px 18px', borderRadius:9, border:'1px solid var(--border)', background:'transparent', color:'var(--text-muted)', cursor:'pointer', fontSize:13 }}>{t(lang,'etabs.cancel')}</button>
            <button type="submit" disabled={saving} style={{ padding:'10px 24px', borderRadius:9, border:'none', background:`linear-gradient(135deg,${accent},#a855f7)`, color:'white', cursor:'pointer', fontSize:14, fontWeight:700 }}>
              {saving?t(lang,'common.saving'):(editing?t(lang,'etabs.save'):t(lang,'etabs.create'))}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function EtablissementsPage() {
  const [etabs, setEtabs] = useState<Etab[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Etab|null>(null)
  const [viewing, setViewing] = useState<Etab|null>(null)
  const [userId, setUserId] = useState<string|null>(null)
  const [search, setSearch] = useState('')
  const { accent, lang } = useTheme()

  useEffect(() => { getSupabase().auth.getSession().then(({ data }) => { if(data.session?.user?.id) setUserId(data.session.user.id) }) }, [])

  const load = useCallback(async () => {
    if (!userId) return
    const { data, error } = await getSupabase().from('etablissements').select('*').eq('user_id',userId).eq('archived',false).order('nom')
    if (error) console.error(error)
    setEtabs((data||[]) as Etab[]); setLoading(false)
  }, [userId])

  useEffect(() => { if(userId) load() }, [userId,load])

  const archive = async (id:string) => {
    if (!userId||!confirm(t(lang,'etabs.archive_confirm'))) return
    await getSupabase().from('etablissements').update({archived:true}).eq('id',id).eq('user_id',userId)
    load()
  }

  const filtered = etabs.filter(e=>!search||e.nom.toLowerCase().includes(search.toLowerCase())||(e.type_etablissement||e.type||'').toLowerCase().includes(search.toLowerCase()))
  const fmtEur = (n:number) => n?.toLocaleString('fr-FR',{style:'currency',currency:'EUR',minimumFractionDigits:2})||'—'

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:22 }}>
        <div>
          <h1 style={{ fontSize:26, fontWeight:800, color:'var(--text)', marginBottom:3 }}>{t(lang,'etabs.title')}</h1>
          <div style={{ fontSize:14, color:'var(--text-dim)' }}>{etabs.length} établissement{etabs.length>1?'s':''}</div>
        </div>
        {userId && <button onClick={()=>{setEditing(null);setShowModal(true)}} style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 20px', borderRadius:10, border:'none', background:`linear-gradient(135deg,${accent},#a855f7)`, color:'white', cursor:'pointer', fontSize:14, fontWeight:700, boxShadow:`0 2px 14px ${accent}40` }}>{t(lang,'etabs.new')}</button>}
      </div>

      <div style={{ position:'relative', marginBottom:16 }}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder={t(lang,'etabs.search')} style={{ width:'100%', padding:'10px 14px 10px 40px', borderRadius:10, border:'1px solid var(--border)', background:'var(--bg-card)', color:'var(--text)', fontSize:14, outline:'none', boxSizing:'border-box' }}/>
        <span style={{ position:'absolute', left:13, top:'50%', transform:'translateY(-50%)' }}>🔍</span>
      </div>

      {loading ? (
        <div style={{ textAlign:'center', padding:48 }}><div style={{ width:32, height:32, borderRadius:'50%', border:`3px solid ${accent}30`, borderTop:`3px solid ${accent}`, animation:'spin .8s linear infinite', margin:'0 auto' }}/></div>
      ) : filtered.length===0 ? (
        <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:12, padding:56, textAlign:'center', color:'var(--text-dim)' }}>
          <div style={{ fontSize:40, marginBottom:12 }}>🏥</div>
          <div style={{ fontSize:15, marginBottom:8 }}>{t(lang,'etabs.empty')}</div>
          {!search&&userId&&<button onClick={()=>setShowModal(true)} style={{ color:accent, background:'none', border:'none', cursor:'pointer', fontSize:14, fontWeight:600 }}>{t(lang,'etabs.add')}</button>}
        </div>
      ) : (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))', gap:14 }}>
          {filtered.map(e=>(
            <div key={e.id} onClick={()=>setViewing(e)} style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:12, padding:20, cursor:'pointer', transition:'all .15s', position:'relative' }}
              onMouseEnter={el=>{ (el.currentTarget as HTMLElement).style.borderColor=accent }}
              onMouseLeave={el=>{ (el.currentTarget as HTMLElement).style.borderColor='var(--border)' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:12 }}>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:16, fontWeight:800, color:'var(--text)', marginBottom:4, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{e.nom}</div>
                  <span style={{ display:'inline-block', fontSize:11, color:accent, background:'var(--accent-dim)', border:'1px solid var(--accent-border)', borderRadius:100, padding:'2px 9px' }}>{e.type_etablissement||e.type||'Établissement'}</span>
                </div>
                <ActionMenu onView={()=>setViewing(e)} onEdit={()=>{setEditing(e);setShowModal(true)}} onArchive={()=>archive(e.id)}/>
              </div>
              {e.adresse&&<div style={{ fontSize:12, color:'var(--text-dim)', marginBottom:4 }}>📍 {e.adresse}</div>}
              {e.telephone&&<div style={{ fontSize:12, color:'var(--text-dim)', marginBottom:8 }}>📞 {e.telephone}</div>}
              <div style={{ background:'var(--accent-dim)', border:'1px solid var(--accent-border)', borderRadius:8, padding:'8px 12px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <span style={{ fontSize:12, color:'var(--text-muted)' }}>{t(lang,'etabs.rate')}</span>
                <span style={{ fontSize:17, fontWeight:800, color:accent }}>{fmtEur(e.taux_horaire)}/h</span>
              </div>
              {(e.creneaux||[]).length>0&&(
                <div style={{ marginTop:8, display:'flex', flexWrap:'wrap', gap:5 }}>
                  {e.creneaux.slice(0,3).map((c,i)=><span key={i} style={{ fontSize:11, padding:'2px 8px', borderRadius:100, background:'var(--bg-input)', color:'var(--text-muted)', border:'1px solid var(--border)' }}>{c.label}</span>)}
                  {e.creneaux.length>3&&<span style={{ fontSize:11, color:'var(--text-dim)' }}>+{e.creneaux.length-3}</span>}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showModal&&userId&&<EtabModal editing={editing} onClose={()=>{setShowModal(false);setEditing(null)}} onSaved={load} userId={userId}/>}
      {viewing&&!showModal&&<EtabDetail etab={viewing} onClose={()=>setViewing(null)} onEdit={()=>{setEditing(viewing);setViewing(null);setShowModal(true)}}/>}
      <style>{'@keyframes spin{to{transform:rotate(360deg)}} @keyframes slideIn{from{opacity:0;transform:scale(.97)}to{opacity:1;transform:none}} @keyframes popIn{from{opacity:0;transform:scale(.85)}to{opacity:1;transform:scale(1)}}'}</style>
    </div>
  )
}
