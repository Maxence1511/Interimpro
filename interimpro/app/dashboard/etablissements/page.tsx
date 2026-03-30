'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useTheme } from '@/lib/theme-context'
import { t } from '@/lib/i18n'

type Creneau = { label:string; heure_debut:string; heure_fin:string; pause_minutes:number }
type Etab = { id:string; nom:string; groupe:string; type:string; taux_horaire:number; telephone:string; email:string; notes:string; creneaux:Creneau[]; archived:boolean }

const TYPES = ['EHPAD','Clinique','Hôpital','Laboratoire','Rééducation','Psychiatrie','Maison de Santé','Autre']
const TCOLORS: Record<string,string> = { EHPAD:'#f59e0b', Clinique:'#e879f9', Hôpital:'#818cf8', Laboratoire:'#34d399', Rééducation:'#8b5cf6', Psychiatrie:'#ec4899', 'Maison de Santé':'#14b8a6', Autre:'#94a3b8' }

function EtabModal({ editing, onClose, onSaved }: { editing:Etab|null; onClose:()=>void; onSaved:()=>void }) {
  const supabase = createClient()
  const { accent, lang, userId } = useTheme()
  const [form, setForm] = useState({ nom:'', groupe:'', type:'Hôpital', tauxStr:'14', telephone:'', email:'', notes:'', creneaux:[] as Creneau[] })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (editing) setForm({ nom:editing.nom, groupe:editing.groupe||'', type:editing.type||'Hôpital', tauxStr:String(editing.taux_horaire||14), telephone:editing.telephone||'', email:editing.email||'', notes:editing.notes||'', creneaux:editing.creneaux||[] })
  }, [editing])

  const addCreneau = () => setForm({...form,creneaux:[...form.creneaux,{label:'Matin',heure_debut:'08:00',heure_fin:'16:00',pause_minutes:30}]})
  const upd = (i:number, k:keyof Creneau, v:any) => { const c=[...form.creneaux]; (c[i] as any)[k]=v; setForm({...form,creneaux:c}) }
  const rmv = (i:number) => setForm({...form,creneaux:form.creneaux.filter((_,j)=>j!==i)})
  const taux = parseFloat(form.tauxStr.replace(',','.')) || 0

  const save = async (e:React.FormEvent) => {
    e.preventDefault()
    if (!userId) { setError('Utilisateur non connecté'); return }
    if (isNaN(taux) || taux <= 0) { setError('Taux horaire invalide'); return }
    setSaving(true); setError('')
    const payload = { user_id:userId, nom:form.nom, groupe:form.groupe, type:form.type, taux_horaire:taux, telephone:form.telephone, email:form.email, notes:form.notes, creneaux:form.creneaux, archived:false }
    let res
    if (editing) res = await supabase.from('etablissements').update(payload).eq('id',editing.id).eq('user_id',userId)
    else res = await supabase.from('etablissements').insert(payload)
    if (res.error) { setError(res.error.message); setSaving(false); return }
    setSaving(false); onSaved(); onClose()
  }

  const inp: React.CSSProperties = { width:'100%', padding:'9px 12px', borderRadius:8, border:'1px solid var(--border)', background:'var(--bg-input)', color:'var(--text)', fontSize:14, outline:'none', boxSizing:'border-box' }

  return (
    <div style={{ position:'fixed', inset:0, background:'var(--overlay)', zIndex:500, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{ background:'var(--bg-modal)', border:'1px solid var(--border)', borderRadius:14, padding:28, width:'100%', maxWidth:500, maxHeight:'90vh', overflow:'auto', boxShadow:`0 24px 60px var(--shadow)`, animation:'slideIn .2s ease' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <h2 style={{ fontSize:17, fontWeight:800, color:'var(--text)' }}>{editing?t(lang,'gen.modify'):t(lang,'etab.new')}</h2>
            <span style={{ padding:'2px 10px', borderRadius:100, fontSize:11, fontWeight:700, background:TCOLORS[form.type]+'25', color:TCOLORS[form.type] }}>{form.type}</span>
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', color:'var(--text-dim)', cursor:'pointer', fontSize:20 }}>✕</button>
        </div>
        {error && <div style={{ padding:'8px 12px', borderRadius:7, background:'rgba(239,68,68,.1)', border:'1px solid rgba(239,68,68,.3)', fontSize:13, color:'#ef4444', marginBottom:12 }}>❌ {error}</div>}
        <form onSubmit={save} style={{ display:'flex', flexDirection:'column', gap:13 }}>
          <div><label style={{ display:'block', fontSize:12, fontWeight:600, color:'var(--text-muted)', marginBottom:4 }}>{t(lang,'etab.name')}</label><input required value={form.nom} onChange={e=>setForm({...form,nom:e.target.value})} placeholder="Ex : CHU de Lyon" style={inp}/></div>
          <div><label style={{ display:'block', fontSize:12, fontWeight:600, color:'var(--text-muted)', marginBottom:4 }}>{t(lang,'etab.group')}</label><input value={form.groupe} onChange={e=>setForm({...form,groupe:e.target.value})} placeholder="Ex : Groupe Korian" style={inp}/></div>
          <div>
            <label style={{ display:'block', fontSize:12, fontWeight:600, color:'var(--text-muted)', marginBottom:8 }}>{t(lang,'etab.type')}</label>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', gap:6 }}>
              {TYPES.map(tp=>(
                <button key={tp} type="button" onClick={()=>setForm({...form,type:tp})} style={{ padding:'8px 4px', borderRadius:8, border:`1.5px solid ${form.type===tp?TCOLORS[tp]:'var(--border)'}`, background:form.type===tp?TCOLORS[tp]+'20':'var(--bg-input)', color:form.type===tp?TCOLORS[tp]:'var(--text-muted)', cursor:'pointer', fontSize:12, fontWeight:form.type===tp?700:400 }}>{tp}</button>
              ))}
            </div>
          </div>
          <div>
            <label style={{ display:'block', fontSize:12, fontWeight:600, color:'var(--text-muted)', marginBottom:4 }}>{t(lang,'etab.rate')}</label>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <input value={form.tauxStr} onChange={e=>setForm({...form,tauxStr:e.target.value})} placeholder="16.32" style={{ ...inp, width:160 }}/>
              <span style={{ fontSize:13, color:'var(--text-dim)' }}>{t(lang,'gen.per_hour')}</span>
              {taux>0 && <span style={{ fontSize:12, color:accent, fontWeight:600 }}>→ {taux.toFixed(2)} €/h</span>}
            </div>
          </div>
          <div>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
              <label style={{ fontSize:12, fontWeight:600, color:'var(--text-muted)' }}>{t(lang,'etab.slots')}</label>
              <button type="button" onClick={addCreneau} style={{ padding:'4px 10px', borderRadius:6, border:'1px solid var(--border)', background:'var(--bg-input)', color:'var(--text-muted)', cursor:'pointer', fontSize:12 }}>+ {t(lang,'gen.add')}</button>
            </div>
            {form.creneaux.length===0 ? (
              <div style={{ border:'1px dashed var(--border)', borderRadius:8, padding:14, textAlign:'center', fontSize:13, color:'var(--text-dim)' }}>{t(lang,'etab.no_slot')}</div>
            ) : form.creneaux.map((c,i)=>(
              <div key={i} style={{ background:'var(--bg-input)', borderRadius:8, padding:8, marginBottom:6, display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr auto', gap:6 }}>
                <input value={c.label} onChange={e=>upd(i,'label',e.target.value)} placeholder="Matin" style={{ ...inp, fontSize:12 }}/>
                <input type="time" value={c.heure_debut} onChange={e=>upd(i,'heure_debut',e.target.value)} style={{ ...inp, fontSize:12 }}/>
                <input type="time" value={c.heure_fin} onChange={e=>upd(i,'heure_fin',e.target.value)} style={{ ...inp, fontSize:12 }}/>
                <input type="number" value={c.pause_minutes} onChange={e=>upd(i,'pause_minutes',Number(e.target.value))} placeholder="Pause min" style={{ ...inp, fontSize:12 }}/>
                <button type="button" onClick={()=>rmv(i)} style={{ width:26, height:26, borderRadius:6, border:'1px solid rgba(239,68,68,.3)', background:'rgba(239,68,68,.05)', cursor:'pointer', color:'#ef4444', fontSize:14, display:'flex', alignItems:'center', justifyContent:'center' }}>✕</button>
              </div>
            ))}
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
            <div><label style={{ display:'block', fontSize:12, fontWeight:600, color:'var(--text-muted)', marginBottom:4 }}>{t(lang,'etab.phone')}</label><input value={form.telephone} onChange={e=>setForm({...form,telephone:e.target.value})} placeholder="04 72 11 22 33" style={inp}/></div>
            <div><label style={{ display:'block', fontSize:12, fontWeight:600, color:'var(--text-muted)', marginBottom:4 }}>{t(lang,'etab.email')}</label><input type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} placeholder="contact@chu.fr" style={inp}/></div>
          </div>
          <div><label style={{ display:'block', fontSize:12, fontWeight:600, color:'var(--text-muted)', marginBottom:4 }}>{t(lang,'etab.notes')}</label><textarea value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} rows={2} style={{ ...inp, resize:'vertical' as const }}/></div>
          <div style={{ display:'flex', gap:10, justifyContent:'flex-end', marginTop:4 }}>
            <button type="button" onClick={onClose} style={{ padding:'10px 18px', borderRadius:9, border:'1px solid var(--border)', background:'transparent', color:'var(--text-muted)', cursor:'pointer', fontSize:14 }}>{t(lang,'miss.cancel')}</button>
            <button type="submit" disabled={saving} style={{ padding:'10px 22px', borderRadius:9, border:'none', background:`linear-gradient(135deg,${accent},#a855f7)`, color:'white', cursor:'pointer', fontSize:14, fontWeight:700 }}>{saving?t(lang,'gen.saving'):editing?t(lang,'miss.save'):t(lang,'miss.create')}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function EtablissementsPage() {
  const [etabs, setEtabs] = useState<Etab[]>([])
  const [missions, setMissions] = useState<any[]>([])
  const [tab, setTab] = useState<'actifs'|'archives'>('actifs')
  const [typeFilter, setTypeFilter] = useState('Tous')
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState<Etab|null>(null)
  const [showModal, setShowModal] = useState(false)
  const supabase = createClient()
  const { accent, lang, userId } = useTheme()

  const load = useCallback(async () => {
    if (!userId) return
    const [e, m] = await Promise.all([
      supabase.from('etablissements').select('*').eq('user_id', userId).order('nom'),
      supabase.from('missions').select('etablissement_id').eq('user_id', userId),
    ])
    setEtabs((e.data||[]) as Etab[])
    setMissions(m.data||[])
  }, [userId])

  useEffect(() => { if (userId) load() }, [load, userId])

  const archive = async (e:Etab) => {
    await supabase.from('etablissements').update({ archived:!e.archived, date_archive:e.archived?null:new Date().toISOString() }).eq('id',e.id).eq('user_id',userId!)
    load()
  }
  const del = async (id:string) => {
    if (!confirm(t(lang,'gen.confirm_delete'))) return
    await supabase.from('etablissements').delete().eq('id',id).eq('user_id',userId!)
    load()
  }

  const actifs = etabs.filter(e=>!e.archived)
  const archives = etabs.filter(e=>e.archived)
  const displayed = (tab==='actifs'?actifs:archives)
    .filter(e=>typeFilter==='Tous'||e.type===typeFilter)
    .filter(e=>!search||e.nom.toLowerCase().includes(search.toLowerCase())||(e.groupe||'').toLowerCase().includes(search.toLowerCase()))
  const mCount = (id:string) => missions.filter(m=>m.etablissement_id===id).length
  const inp: React.CSSProperties = { width:'100%', padding:'8px 12px', borderRadius:8, border:'1px solid var(--border)', background:'var(--bg-card)', color:'var(--text)', fontSize:13, outline:'none', boxSizing:'border-box' }

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
        <h1 style={{ fontSize:22, fontWeight:800, color:'var(--text)' }}>{t(lang,'etab.title')}</h1>
        <button onClick={()=>{ setEditing(null); setShowModal(true) }} style={{ display:'flex', alignItems:'center', gap:6, padding:'9px 18px', borderRadius:9, border:'none', background:`linear-gradient(135deg,${accent},#a855f7)`, color:'white', cursor:'pointer', fontSize:14, fontWeight:700, boxShadow:`0 2px 12px ${accent}40` }}>
          + {t(lang,'etab.add')}
        </button>
      </div>
      <div style={{ position:'relative', marginBottom:14 }}>
        <svg style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:'var(--text-dim)' }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder={t(lang,'etab.search')} style={{ ...inp, paddingLeft:36 }}/>
      </div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16, flexWrap:'wrap', gap:10 }}>
        <div style={{ display:'flex', background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:9, overflow:'hidden' }}>
          {(['actifs','archives'] as const).map(tab_k=>(
            <button key={tab_k} onClick={()=>setTab(tab_k)} style={{ padding:'8px 16px', border:'none', background:tab===tab_k?accent:'transparent', color:tab===tab_k?'white':'var(--text-dim)', cursor:'pointer', fontSize:13, fontWeight:tab===tab_k?700:400 }}>
              {tab_k==='actifs'?`${t(lang,'etab.active')} (${actifs.length})`:`${t(lang,'etab.archived')} (${archives.length})`}
            </button>
          ))}
        </div>
        <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
          {[t(lang,'etab.all'),...TYPES].map(tp=>(
            <button key={tp} onClick={()=>setTypeFilter(tp==='Tous'||tp===t(lang,'etab.all')?'Tous':tp)} style={{ padding:'5px 12px', borderRadius:100, border:`1px solid ${typeFilter===tp||(tp===t(lang,'etab.all')&&typeFilter==='Tous')?accent:'var(--border)'}`, background:(typeFilter===tp||(tp===t(lang,'etab.all')&&typeFilter==='Tous'))?accent:'transparent', color:(typeFilter===tp||(tp===t(lang,'etab.all')&&typeFilter==='Tous'))?'white':'var(--text-dim)', cursor:'pointer', fontSize:12 }}>{tp}</button>
          ))}
        </div>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(260px, 1fr))', gap:14 }}>
        {displayed.map(etab=>{
          const color = TCOLORS[etab.type]||'#94a3b8'
          const count = mCount(etab.id)
          return (
            <div key={etab.id} style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:12, padding:20, opacity:etab.archived?.7:1 }}>
              <div style={{ marginBottom:10 }}>
                <h3 style={{ fontSize:16, fontWeight:700, color:'var(--text)', marginBottom:2 }}>{etab.nom}</h3>
                {etab.groupe && <p style={{ fontSize:13, color:'var(--text-dim)' }}>{etab.groupe}</p>}
              </div>
              <span style={{ display:'inline-block', padding:'3px 10px', borderRadius:100, fontSize:11, fontWeight:700, background:color+'20', color, marginBottom:10 }}>{etab.type}</span>
              <div style={{ fontSize:22, fontWeight:800, color:accent, marginBottom:8 }}>{etab.taux_horaire?.toFixed(2)} €/h</div>
              <div style={{ display:'flex', alignItems:'center', gap:5, fontSize:13, color:'var(--text-dim)', marginBottom:6 }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
                {count} {t(lang,'etab.missions')}
              </div>
              {(etab.creneaux||[]).map((c,i)=>(
                <div key={i} style={{ fontSize:12, color:'var(--text-dim)', marginBottom:2 }}>{c.label} · {c.heure_debut}–{c.heure_fin} (Pause {c.pause_minutes}min)</div>
              ))}
              <div style={{ display:'flex', gap:6, marginTop:14 }}>
                <button onClick={()=>{ setEditing(etab); setShowModal(true) }} style={{ flex:1, padding:'7px', borderRadius:7, border:'1px solid var(--border)', background:'var(--bg-input)', color:'var(--text-muted)', cursor:'pointer', fontSize:12 }}>✏️ {t(lang,'gen.modify')}</button>
                <button onClick={()=>archive(etab)} style={{ flex:1, padding:'7px', borderRadius:7, border:'1px solid var(--border)', background:'var(--bg-input)', color:etab.archived?'#10b981':'var(--warning)', cursor:'pointer', fontSize:12 }}>
                  {etab.archived?'↩️ '+t(lang,'gen.restore'):'📦 '+t(lang,'gen.archive')}
                </button>
                <button onClick={()=>del(etab.id)} style={{ padding:'7px 10px', borderRadius:7, border:'1px solid rgba(239,68,68,.3)', background:'rgba(239,68,68,.05)', color:'#ef4444', cursor:'pointer', fontSize:12 }}>🗑</button>
              </div>
            </div>
          )
        })}
        {displayed.length===0 && (
          <div style={{ gridColumn:'1/-1', textAlign:'center', padding:48, color:'var(--text-dim)' }}>
            <div style={{ fontSize:36, marginBottom:10 }}>🏥</div>
            <button onClick={()=>setShowModal(true)} style={{ color:accent, background:'none', border:'none', cursor:'pointer', fontSize:14 }}>+ {t(lang,'etab.new')}</button>
          </div>
        )}
      </div>
      {showModal && <EtabModal editing={editing} onClose={()=>setShowModal(false)} onSaved={load}/>}
    </div>
  )
}
