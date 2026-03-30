'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useTheme } from '@/lib/theme-context'
import { t } from '@/lib/i18n'

type Mission = { id:string; titre:string; etablissement_id:string; date_debut:string; date_fin:string; pause_heures:number; statut:string; heures:number; salaire_estime:number; contrat_signe:boolean; fiche_paie_recue:boolean; salaire_recu:boolean; majoration_nuit:boolean; majoration_dimanche:boolean; majoration_ferie:boolean; notes:string }
type Etab = { id:string; nom:string; taux_horaire:number }

function calcH(d:string,f:string,p:number){ if(!d||!f) return 0; const a=new Date('2000-01-01T'+d),b=new Date('2000-01-01T'+f); return Math.max(0,(b.getTime()-a.getTime())/3600000-p) }
function calcS(h:number,t:number,n:boolean,d:boolean,f:boolean){ let m=0; if(n)m+=.25; if(d)m+=.50; if(f)m+=1; return Math.round(h*t*(1+m)*100)/100 }
function parseTaux(v:string):number { return parseFloat(v.replace(',','.')) || 0 }

function MissionModal({ etabs, editing, onClose, onSaved, defaultDate }: { etabs:Etab[]; editing:Mission|null; onClose:()=>void; onSaved:()=>void; defaultDate?:string }) {
  const supabase = createClient()
  const { accent, lang, userId } = useTheme()
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
    statut: editing?.statut||'a_venir',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const etab = etabs.find(e=>e.id===form.etablissement_id)
  const heures = calcH(form.debut, form.fin, Number(form.pause_heures))
  const salaire = calcS(heures, etab?.taux_horaire||0, form.majoration_nuit, form.majoration_dimanche, form.majoration_ferie)
  const fmtEur = (n:number) => n.toLocaleString('fr-FR',{style:'currency',currency:'EUR',minimumFractionDigits:2})
  const inp: React.CSSProperties = { width:'100%', padding:'9px 12px', borderRadius:8, border:'1px solid var(--border)', background:'var(--bg-input)', color:'var(--text)', fontSize:14, outline:'none', boxSizing:'border-box' }

  const handleSave = async (e:React.FormEvent) => {
    e.preventDefault()
    if (!userId) { setError('Utilisateur non connecté'); return }
    setSaving(true); setError('')
    const payload = {
      user_id: userId,
      etablissement_id: form.etablissement_id, titre: form.titre,
      date_debut: `${form.date}T${form.debut}:00`, date_fin: `${form.date}T${form.fin}:00`,
      pause_heures: Number(form.pause_heures), heures, salaire_estime: salaire,
      majoration_nuit: form.majoration_nuit, majoration_dimanche: form.majoration_dimanche, majoration_ferie: form.majoration_ferie,
      taux_majoration: (form.majoration_nuit?25:0)+(form.majoration_dimanche?50:0)+(form.majoration_ferie?100:0),
      notes: form.notes, statut: form.statut, source: 'manual',
    }
    let res
    if (editing) res = await supabase.from('missions').update(payload).eq('id', editing.id).eq('user_id', userId)
    else res = await supabase.from('missions').insert(payload)
    if (res.error) { setError(res.error.message); setSaving(false); return }
    setSaving(false); onSaved(); onClose()
  }

  return (
    <div style={{ position:'fixed', inset:0, background:'var(--overlay)', zIndex:500, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{ background:'var(--bg-modal)', border:'1px solid var(--border)', borderRadius:14, padding:28, width:'100%', maxWidth:500, maxHeight:'90vh', overflow:'auto', boxShadow:`0 24px 60px var(--shadow)`, animation:'slideIn .2s ease' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:22 }}>
          <h2 style={{ fontSize:17, fontWeight:800, color:'var(--text)' }}>{editing ? '✏️ '+t(lang,'cal.edit') : '➕ '+t(lang,'miss.new')}</h2>
          <button onClick={onClose} style={{ background:'none', border:'none', color:'var(--text-dim)', cursor:'pointer', fontSize:20 }}>✕</button>
        </div>
        {error && <div style={{ padding:'8px 12px', borderRadius:7, background:'rgba(239,68,68,.1)', border:'1px solid rgba(239,68,68,.3)', fontSize:13, color:'#ef4444', marginBottom:12 }}>❌ {error}</div>}
        <form onSubmit={handleSave} style={{ display:'flex', flexDirection:'column', gap:13 }}>
          <div><label style={{ display:'block', fontSize:12, fontWeight:600, color:'var(--text-muted)', marginBottom:5 }}>{t(lang,'miss.etab_required')}</label>
            <select required value={form.etablissement_id} onChange={e=>setForm({...form,etablissement_id:e.target.value})} style={inp}>
              <option value="">Sélectionner</option>
              {etabs.map(e=><option key={e.id} value={e.id}>{e.nom}</option>)}
            </select>
          </div>
          <div><label style={{ display:'block', fontSize:12, fontWeight:600, color:'var(--text-muted)', marginBottom:5 }}>{t(lang,'miss.title_service')}</label>
            <input required value={form.titre} onChange={e=>setForm({...form,titre:e.target.value})} placeholder="Urgences, Réanimation..." style={inp}/>
          </div>
          <div><label style={{ display:'block', fontSize:12, fontWeight:600, color:'var(--text-muted)', marginBottom:5 }}>{t(lang,'miss.date_label')}</label>
            <input type="date" value={form.date} onChange={e=>setForm({...form,date:e.target.value})} style={inp}/>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10 }}>
            <div><label style={{ display:'block', fontSize:12, fontWeight:600, color:'var(--text-muted)', marginBottom:5 }}>{t(lang,'miss.start')}</label><input type="time" value={form.debut} onChange={e=>setForm({...form,debut:e.target.value})} style={inp}/></div>
            <div><label style={{ display:'block', fontSize:12, fontWeight:600, color:'var(--text-muted)', marginBottom:5 }}>{t(lang,'miss.end')}</label><input type="time" value={form.fin} onChange={e=>setForm({...form,fin:e.target.value})} style={inp}/></div>
            <div><label style={{ display:'block', fontSize:12, fontWeight:600, color:'var(--text-muted)', marginBottom:5 }}>{t(lang,'miss.break')}</label><input type="number" step="0.5" min="0" value={form.pause_heures} onChange={e=>setForm({...form,pause_heures:Number(e.target.value)})} style={inp}/></div>
          </div>
          <div style={{ background:'var(--bg-input)', borderRadius:9, padding:'12px 16px', textAlign:'center' }}>
            <span style={{ color:'var(--text-muted)', fontSize:13 }}>{t(lang,'miss.calc_hours')} : </span>
            <span style={{ fontSize:18, fontWeight:800, color:'var(--text)' }}>{heures.toFixed(2)}h</span>
          </div>
          <div>
            <label style={{ display:'block', fontSize:12, fontWeight:600, color:'var(--text-muted)', marginBottom:10 }}>{t(lang,'miss.majorations')}</label>
            <div style={{ display:'flex', gap:16, flexWrap:'wrap' }}>
              {([['majoration_nuit','miss.night'],['majoration_dimanche','miss.sunday'],['majoration_ferie','miss.holiday']] as [string,string][]).map(([k,lk])=>(
                <label key={k} style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer', fontSize:13, color:'var(--text-muted)' }}>
                  <input type="radio" checked={(form as any)[k]} onChange={()=>setForm({...form,majoration_nuit:k==='majoration_nuit',majoration_dimanche:k==='majoration_dimanche',majoration_ferie:k==='majoration_ferie'})} style={{ accentColor:accent,width:15,height:15 }}/>{t(lang,lk)}
                </label>
              ))}
            </div>
          </div>
          <div style={{ background:'var(--accent-dim)', border:'1px solid var(--accent-border)', borderRadius:9, padding:'12px 16px', textAlign:'center' }}>
            <span style={{ color:'var(--text-muted)', fontSize:13 }}>{t(lang,'miss.est_salary')} : </span>
            <span style={{ fontSize:20, fontWeight:800, color:accent }}>{fmtEur(salaire)}</span>
          </div>
          <div><label style={{ display:'block', fontSize:12, fontWeight:600, color:'var(--text-muted)', marginBottom:5 }}>{t(lang,'miss.notes')}</label>
            <textarea value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} rows={2} placeholder={t(lang,'miss.notes_placeholder')} style={{ ...inp, resize:'vertical' as const }}/>
          </div>
          {editing && <div><label style={{ display:'block', fontSize:12, fontWeight:600, color:'var(--text-muted)', marginBottom:5 }}>Statut</label>
            <select value={form.statut} onChange={e=>setForm({...form,statut:e.target.value})} style={inp}>
              <option value="a_venir">{t(lang,'miss.upcoming')}</option>
              <option value="passee">{t(lang,'miss.past')}</option>
              <option value="archive">{t(lang,'miss.archived')}</option>
            </select>
          </div>}
          <div style={{ display:'flex', gap:10, justifyContent:'flex-end', marginTop:4 }}>
            <button type="button" onClick={onClose} style={{ padding:'10px 18px', borderRadius:9, border:'1px solid var(--border)', background:'transparent', color:'var(--text-muted)', cursor:'pointer', fontSize:14 }}>{t(lang,'miss.cancel')}</button>
            <button type="submit" disabled={saving} style={{ padding:'10px 24px', borderRadius:9, border:'none', background:`linear-gradient(135deg,${accent},#a855f7)`, color:'white', cursor:'pointer', fontSize:14, fontWeight:700 }}>{saving?t(lang,'gen.saving'):editing?t(lang,'miss.save'):t(lang,'miss.create')}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function MissionsPage() {
  const [missions, setMissions] = useState<Mission[]>([])
  const [etabs, setEtabs] = useState<Etab[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('a_venir')
  const [search, setSearch] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Mission|null>(null)
  const supabase = createClient()
  const { accent, lang, userId } = useTheme()

  const load = useCallback(async () => {
    if (!userId) return
    const [m, e] = await Promise.all([
      supabase.from('missions').select('*').eq('user_id', userId).order('date_debut', { ascending:false }),
      supabase.from('etablissements').select('*').eq('user_id', userId).eq('archived', false).order('nom'),
    ])
    setMissions((m.data||[]) as Mission[])
    setEtabs((e.data||[]) as Etab[])
    setLoading(false)
  }, [userId])

  useEffect(() => { if (userId) load() }, [load, userId])

  const toggle = async (m:Mission, field:keyof Mission) => {
    await supabase.from('missions').update({ [field]: !(m[field] as boolean) }).eq('id', m.id).eq('user_id', userId!)
    load()
  }
  const archive = async (m:Mission) => {
    await supabase.from('missions').update({ statut:'archive', date_archive:new Date().toISOString() }).eq('id', m.id).eq('user_id', userId!)
    load()
  }
  const del = async (id:string) => {
    if (!confirm(t(lang,'gen.confirm_delete'))) return
    await supabase.from('missions').delete().eq('id', id).eq('user_id', userId!)
    load()
  }

  const getEtab = (id:string) => etabs.find(e=>e.id===id)
  const fmtEur = (n:number) => n?.toLocaleString('fr-FR',{style:'currency',currency:'EUR',minimumFractionDigits:2})||'—'
  const fmtDate = (d:string) => d?new Date(d).toLocaleDateString('fr-FR',{day:'numeric',month:'long',year:'numeric'}):'—'
  const counts = { a_venir:missions.filter(m=>m.statut==='a_venir').length, passee:missions.filter(m=>m.statut==='passee').length, archive:missions.filter(m=>m.statut==='archive').length }
  const filtered = missions.filter(m => {
    if (m.statut !== tab) return false
    if (search && !m.titre.toLowerCase().includes(search.toLowerCase()) && !(getEtab(m.etablissement_id)?.nom||'').toLowerCase().includes(search.toLowerCase())) return false
    if (dateFrom && m.date_debut < dateFrom) return false
    if (dateTo && m.date_debut > dateTo+'T23:59:59') return false
    return true
  })
  const inp: React.CSSProperties = { padding:'8px 12px', borderRadius:8, border:'1px solid var(--border)', background:'var(--bg-card)', color:'var(--text)', fontSize:13, outline:'none' }
  const td: React.CSSProperties = { padding:'12px 14px', borderBottom:'1px solid var(--border)', fontSize:13, color:'var(--text)', verticalAlign:'middle' }

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:22 }}>
        <h1 style={{ fontSize:22, fontWeight:800, color:'var(--text)' }}>{t(lang,'miss.title')}</h1>
        <button onClick={()=>{ setEditing(null); setShowModal(true) }} style={{ display:'flex', alignItems:'center', gap:6, padding:'9px 18px', borderRadius:9, border:'none', background:`linear-gradient(135deg,${accent},#a855f7)`, color:'white', cursor:'pointer', fontSize:14, fontWeight:700, boxShadow:`0 2px 12px ${accent}40` }}>
          + {t(lang,'miss.new')}
        </button>
      </div>
      <div style={{ display:'flex', gap:10, marginBottom:14, flexWrap:'wrap' }}>
        <div style={{ position:'relative', flex:1, minWidth:240 }}>
          <svg style={{ position:'absolute', left:11, top:'50%', transform:'translateY(-50%)', color:'var(--text-dim)' }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder={t(lang,'miss.search')} style={{ ...inp, paddingLeft:34, width:'100%', boxSizing:'border-box' as const }}/>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
          <span style={{ fontSize:12, color:'var(--text-dim)' }}>{t(lang,'miss.from')}</span>
          <input type="date" value={dateFrom} onChange={e=>setDateFrom(e.target.value)} style={{ ...inp, fontSize:12 }}/>
          <span style={{ fontSize:12, color:'var(--text-dim)' }}>{t(lang,'miss.to')}</span>
          <input type="date" value={dateTo} onChange={e=>setDateTo(e.target.value)} style={{ ...inp, fontSize:12 }}/>
        </div>
      </div>
      <div style={{ display:'inline-flex', marginBottom:0, background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:'9px 9px 0 0', overflow:'hidden' }}>
        {[['a_venir','miss.upcoming'],['passee','miss.past'],['archive','miss.archived']].map(([k,lk])=>(
          <button key={k} onClick={()=>setTab(k)} style={{ padding:'10px 18px', border:'none', background:tab===k?'var(--bg-hover)':'transparent', color:tab===k?'var(--text)':'var(--text-dim)', cursor:'pointer', fontSize:13, fontWeight:tab===k?700:400, borderBottom:tab===k?`2px solid ${accent}`:'2px solid transparent' }}>
            {t(lang,lk)} ({(counts as any)[k]})
          </button>
        ))}
      </div>
      <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderTop:'none', borderRadius:'0 0 9px 9px', overflow:'hidden' }}>
        <table style={{ width:'100%', borderCollapse:'collapse' }}>
          <thead>
            <tr style={{ background:'var(--bg-input)' }}>
              {['miss.mission','miss.etablissement','miss.date','miss.hours','miss.salary','miss.tracking','miss.actions'].map(h=>(
                <th key={h} style={{ padding:'10px 14px', textAlign:'left', fontSize:11, fontWeight:600, color:'var(--text-dim)', borderBottom:`1px solid var(--border)`, letterSpacing:'.05em', textTransform:'uppercase' }}>{t(lang,h)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? <tr><td colSpan={7} style={{ textAlign:'center', padding:40, color:'var(--text-dim)' }}>{t(lang,'gen.loading')}</td></tr>
            : filtered.length===0 ? <tr><td colSpan={7} style={{ textAlign:'center', padding:40, color:'var(--text-dim)', fontSize:13 }}>{t(lang,'miss.none')}</td></tr>
            : filtered.map(m=>{
              const etab = getEtab(m.etablissement_id)
              return (
                <tr key={m.id}>
                  <td style={td}><span style={{ fontWeight:600 }}>{m.titre}</span></td>
                  <td style={{ ...td, color:'var(--text-muted)' }}>{etab?.nom||'—'}</td>
                  <td style={{ ...td, color:'var(--text-muted)' }}>{fmtDate(m.date_debut)}</td>
                  <td style={td}>{m.heures}h</td>
                  <td style={{ ...td, color:accent, fontWeight:700 }}>{fmtEur(m.salaire_estime)}</td>
                  <td style={td}>
                    <div style={{ display:'flex', gap:4 }}>
                      {([['contrat_signe','📄'],['fiche_paie_recue','💳'],['salaire_recu','✓']] as [keyof Mission,string][]).map(([f,ico])=>(
                        <button key={String(f)} onClick={()=>toggle(m,f)} title={String(f)} style={{ width:26, height:26, borderRadius:5, border:'1px solid var(--border)', background:m[f]?'var(--accent-dim)':'transparent', cursor:'pointer', fontSize:12, color:m[f]?accent:'var(--text-dim)', display:'flex', alignItems:'center', justifyContent:'center' }}>{ico}</button>
                      ))}
                    </div>
                  </td>
                  <td style={td}>
                    <div style={{ display:'flex', gap:4 }}>
                      <button onClick={()=>{ setEditing(m); setShowModal(true) }} style={{ width:28, height:28, borderRadius:6, border:'1px solid var(--border)', background:'transparent', cursor:'pointer', color:'var(--text-muted)', fontSize:13, display:'flex', alignItems:'center', justifyContent:'center' }}>✏️</button>
                      {tab!=='archive' && <button onClick={()=>archive(m)} style={{ width:28, height:28, borderRadius:6, border:'1px solid var(--border)', background:'transparent', cursor:'pointer', color:'var(--warning)', fontSize:13, display:'flex', alignItems:'center', justifyContent:'center' }}>📦</button>}
                      <button onClick={()=>del(m.id)} style={{ width:28, height:28, borderRadius:6, border:'1px solid rgba(239,68,68,.3)', background:'rgba(239,68,68,.05)', cursor:'pointer', color:'#ef4444', fontSize:13, display:'flex', alignItems:'center', justifyContent:'center' }}>🗑</button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {showModal && <MissionModal etabs={etabs} editing={editing} onClose={()=>setShowModal(false)} onSaved={load} defaultDate={new Date().toISOString().split('T')[0]}/>}
    </div>
  )
}
