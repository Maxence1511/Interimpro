'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { getSupabase } from '@/lib/supabase/client'
import { useTheme } from '@/lib/theme-context'

type Creneau = { label:string; heure_debut:string; heure_fin:string; pause_minutes:number }
type Etab = { id:string; nom:string; type_etablissement:string; adresse:string; telephone:string; email_contact:string; taux_horaire:number; contact_nom:string; creneaux:Creneau[]; notes:string; archived:boolean; photo_url:string|null }

function EtabModal({ editing, onClose, onSaved, userId }: { editing:Etab|null; onClose:()=>void; onSaved:()=>void; userId:string }) {
  const { accent } = useTheme()
  const [form, setForm] = useState<Partial<Etab>>({
    nom:'', type_etablissement:'EHPAD', adresse:'', telephone:'', email_contact:'',
    taux_horaire:16.32, contact_nom:'', notes:'', creneaux:[],
    ...(editing||{})
  })
  const [newC, setNewC] = useState({ label:'Matin', heure_debut:'08:00', heure_fin:'16:00', pause_minutes:30 })
  const [saving, setSaving] = useState(false)
  const inp: React.CSSProperties = { width:'100%', padding:'9px 12px', borderRadius:8, border:'1px solid var(--border)', background:'var(--bg-input)', color:'var(--text)', fontSize:13, outline:'none', boxSizing:'border-box' }

  const addCreneau = () => {
    setForm(f => ({ ...f, creneaux:[...(f.creneaux||[]), {...newC}] }))
    setNewC({ label:'Soir', heure_debut:'16:00', heure_fin:'00:00', pause_minutes:30 })
  }
  const removeCreneau = (i:number) => setForm(f => ({ ...f, creneaux:(f.creneaux||[]).filter((_,j)=>j!==i) }))

  const save = async (e:React.FormEvent) => {
    e.preventDefault(); setSaving(true)
    const sb = getSupabase()
    const payload = { ...form, user_id:userId, archived:false }
    if (editing) await sb.from('etablissements').update(payload).eq('id',editing.id).eq('user_id',userId)
    else await sb.from('etablissements').insert(payload)
    setSaving(false); onSaved(); onClose()
  }

  return (
    <div style={{ position:'fixed', inset:0, background:'var(--overlay)', zIndex:500, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{ background:'var(--bg-modal)', border:'1px solid var(--border)', borderRadius:14, padding:28, width:'100%', maxWidth:560, maxHeight:'90vh', overflow:'auto', boxShadow:'0 24px 60px var(--shadow)' }}>
        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:20 }}>
          <h2 style={{ fontSize:17, fontWeight:800, color:'var(--text)' }}>{editing?'✏️ Modifier':'➕ Nouvel établissement'}</h2>
          <button onClick={onClose} style={{ background:'none', border:'none', color:'var(--text-dim)', cursor:'pointer', fontSize:20 }}>✕</button>
        </div>
        <form onSubmit={save} style={{ display:'flex', flexDirection:'column', gap:12 }}>
          <div><label style={{ display:'block', fontSize:11, color:'var(--text-muted)', marginBottom:4 }}>Nom *</label><input required value={form.nom||''} onChange={e=>setForm({...form,nom:e.target.value})} style={inp}/></div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
            <div><label style={{ display:'block', fontSize:11, color:'var(--text-muted)', marginBottom:4 }}>Type</label>
              <select value={form.type_etablissement||'EHPAD'} onChange={e=>setForm({...form,type_etablissement:e.target.value})} style={inp}>
                {['EHPAD','Clinique','CHU','CH','SSIAD','HAD','Cabinet libéral','Autre'].map(t=><option key={t}>{t}</option>)}
              </select>
            </div>
            <div><label style={{ display:'block', fontSize:11, color:'var(--text-muted)', marginBottom:4 }}>Taux horaire (€)</label><input type="number" step="0.01" value={form.taux_horaire||16.32} onChange={e=>setForm({...form,taux_horaire:Number(e.target.value)})} style={inp}/></div>
          </div>
          <div><label style={{ display:'block', fontSize:11, color:'var(--text-muted)', marginBottom:4 }}>Adresse</label><input value={form.adresse||''} onChange={e=>setForm({...form,adresse:e.target.value})} style={inp}/></div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
            <div><label style={{ display:'block', fontSize:11, color:'var(--text-muted)', marginBottom:4 }}>Téléphone</label><input value={form.telephone||''} onChange={e=>setForm({...form,telephone:e.target.value})} style={inp}/></div>
            <div><label style={{ display:'block', fontSize:11, color:'var(--text-muted)', marginBottom:4 }}>Contact</label><input value={form.contact_nom||''} onChange={e=>setForm({...form,contact_nom:e.target.value})} style={inp}/></div>
          </div>
          <div><label style={{ display:'block', fontSize:11, color:'var(--text-muted)', marginBottom:4 }}>Email</label><input type="email" value={form.email_contact||''} onChange={e=>setForm({...form,email_contact:e.target.value})} style={inp}/></div>
          {/* Créneaux */}
          <div style={{ background:'var(--bg-input)', borderRadius:10, padding:'12px 14px' }}>
            <div style={{ fontSize:12, fontWeight:700, color:'var(--text)', marginBottom:10 }}>🕐 Créneaux horaires</div>
            {(form.creneaux||[]).map((c,i) => (
              <div key={i} style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6, padding:'7px 10px', background:'var(--bg-card)', borderRadius:8, border:'1px solid var(--border)' }}>
                <span style={{ fontSize:13, fontWeight:600, color:'var(--text)', flex:1 }}>{c.label}</span>
                <span style={{ fontSize:12, color:'var(--text-dim)' }}>{c.heure_debut}→{c.heure_fin} ({c.pause_minutes}min pause)</span>
                <button type="button" onClick={()=>removeCreneau(i)} style={{ background:'none', border:'none', color:'#ef4444', cursor:'pointer', fontSize:16 }}>✕</button>
              </div>
            ))}
            <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr 1fr auto', gap:6, marginTop:8 }}>
              <input placeholder="Label" value={newC.label} onChange={e=>setNewC({...newC,label:e.target.value})} style={{ ...inp, fontSize:12 }}/>
              <input type="time" value={newC.heure_debut} onChange={e=>setNewC({...newC,heure_debut:e.target.value})} style={{ ...inp, fontSize:12 }}/>
              <input type="time" value={newC.heure_fin} onChange={e=>setNewC({...newC,heure_fin:e.target.value})} style={{ ...inp, fontSize:12 }}/>
              <input type="number" placeholder="Pause min" value={newC.pause_minutes} onChange={e=>setNewC({...newC,pause_minutes:Number(e.target.value)})} style={{ ...inp, fontSize:12 }}/>
              <button type="button" onClick={addCreneau} style={{ padding:'6px 12px', borderRadius:7, border:`1px solid ${accent}`, background:'var(--accent-dim)', color:accent, cursor:'pointer', fontSize:13, fontWeight:700, whiteSpace:'nowrap' }}>+ Ajouter</button>
            </div>
          </div>
          <div><label style={{ display:'block', fontSize:11, color:'var(--text-muted)', marginBottom:4 }}>Notes</label><textarea value={form.notes||''} onChange={e=>setForm({...form,notes:e.target.value})} rows={2} style={{ ...inp, resize:'vertical' as const }}/></div>
          <div style={{ display:'flex', gap:10, justifyContent:'flex-end', marginTop:4 }}>
            <button type="button" onClick={onClose} style={{ padding:'10px 18px', borderRadius:9, border:'1px solid var(--border)', background:'transparent', color:'var(--text-muted)', cursor:'pointer', fontSize:14 }}>Annuler</button>
            <button type="submit" disabled={saving} style={{ padding:'10px 24px', borderRadius:9, border:'none', background:`linear-gradient(135deg,${accent},#a855f7)`, color:'white', cursor:'pointer', fontSize:14, fontWeight:700 }}>{saving?'Sauvegarde...':editing?'Enregistrer':'Créer'}</button>
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
  const [userId, setUserId] = useState<string|null>(null)
  const [search, setSearch] = useState('')
  const { accent } = useTheme()

  useEffect(() => {
    getSupabase().auth.getSession().then(({ data }) => {
      if (data.session?.user?.id) setUserId(data.session.user.id)
    })
  }, [])

  const load = useCallback(async () => {
    if (!userId) return
    const { data } = await getSupabase().from('etablissements').select('*').eq('user_id',userId).eq('archived',false).order('nom')
    setEtabs((data||[]) as Etab[])
    setLoading(false)
  }, [userId])

  useEffect(() => { if (userId) load() }, [userId, load])

  const del = async (id:string) => {
    if (!userId||!confirm('Archiver cet établissement ?')) return
    await getSupabase().from('etablissements').update({ archived:true }).eq('id',id).eq('user_id',userId)
    load()
  }

  const fmtEur = (n:number) => n?.toLocaleString('fr-FR',{style:'currency',currency:'EUR',minimumFractionDigits:2})||'—'
  const filtered = etabs.filter(e => !search || e.nom.toLowerCase().includes(search.toLowerCase()) || e.type_etablissement?.toLowerCase().includes(search.toLowerCase()))

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:22 }}>
        <div>
          <h1 style={{ fontSize:26, fontWeight:800, color:'var(--text)', marginBottom:3 }}>Établissements</h1>
          <div style={{ fontSize:14, color:'var(--text-dim)' }}>{etabs.length} établissement{etabs.length>1?'s':''}</div>
        </div>
        {userId && <button onClick={()=>{setEditing(null);setShowModal(true)}} style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 20px', borderRadius:10, border:'none', background:`linear-gradient(135deg,${accent},#a855f7)`, color:'white', cursor:'pointer', fontSize:14, fontWeight:700, boxShadow:`0 2px 14px ${accent}40` }}>
          + Nouvel établissement
        </button>}
      </div>
      <div style={{ position:'relative', marginBottom:16 }}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Rechercher..." style={{ width:'100%', padding:'11px 14px 11px 42px', borderRadius:10, border:'1px solid var(--border)', background:'var(--bg-card)', color:'var(--text)', fontSize:14, outline:'none', boxSizing:'border-box' }}/>
        <span style={{ position:'absolute', left:14, top:'50%', transform:'translateY(-50%)', fontSize:16 }}>🔍</span>
      </div>
      {loading ? (
        <div style={{ textAlign:'center', padding:48 }}><div style={{ width:32, height:32, borderRadius:'50%', border:`3px solid ${accent}30`, borderTop:`3px solid ${accent}`, animation:'spin .8s linear infinite', margin:'0 auto' }}/></div>
      ) : filtered.length===0 ? (
        <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:12, padding:56, textAlign:'center', color:'var(--text-dim)' }}>
          <div style={{ fontSize:40, marginBottom:12 }}>🏥</div>
          <div style={{ fontSize:15, marginBottom:8 }}>{search?'Aucun résultat':'Aucun établissement'}</div>
          {!search && userId && <button onClick={()=>setShowModal(true)} style={{ color:accent, background:'none', border:'none', cursor:'pointer', fontSize:14, fontWeight:600 }}>+ Ajouter un établissement</button>}
        </div>
      ) : (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(320px,1fr))', gap:14 }}>
          {filtered.map(e=>(
            <div key={e.id} style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:12, padding:20, position:'relative' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:12 }}>
                <div>
                  <div style={{ fontSize:16, fontWeight:800, color:'var(--text)', marginBottom:3 }}>{e.nom}</div>
                  <span style={{ display:'inline-block', fontSize:11, color:accent, background:'var(--accent-dim)', border:'1px solid var(--accent-border)', borderRadius:100, padding:'2px 9px' }}>{e.type_etablissement||'Établissement'}</span>
                </div>
                <div style={{ display:'flex', gap:6 }}>
                  <button onClick={()=>{setEditing(e);setShowModal(true)}} title="Modifier" style={{ width:30, height:30, borderRadius:7, border:'1px solid var(--border)', background:'var(--bg-input)', color:'var(--text-muted)', cursor:'pointer', fontSize:14, display:'flex', alignItems:'center', justifyContent:'center' }}>✏️</button>
                  <button onClick={()=>del(e.id)} title="Archiver" style={{ width:30, height:30, borderRadius:7, border:'1px solid rgba(239,68,68,.3)', background:'rgba(239,68,68,.06)', color:'#ef4444', cursor:'pointer', fontSize:14, display:'flex', alignItems:'center', justifyContent:'center' }}>🗑</button>
                </div>
              </div>
              {e.adresse && <div style={{ fontSize:12, color:'var(--text-dim)', marginBottom:6 }}>📍 {e.adresse}</div>}
              {e.telephone && <div style={{ fontSize:12, color:'var(--text-dim)', marginBottom:6 }}>📞 {e.telephone}</div>}
              {e.contact_nom && <div style={{ fontSize:12, color:'var(--text-dim)', marginBottom:10 }}>👤 {e.contact_nom}</div>}
              <div style={{ background:'var(--accent-dim)', border:'1px solid var(--accent-border)', borderRadius:8, padding:'8px 12px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <span style={{ fontSize:12, color:'var(--text-muted)' }}>Taux horaire</span>
                <span style={{ fontSize:17, fontWeight:800, color:accent }}>{fmtEur(e.taux_horaire)}/h</span>
              </div>
              {(e.creneaux||[]).length>0 && (
                <div style={{ marginTop:10 }}>
                  <div style={{ fontSize:11, fontWeight:700, color:'var(--text-dim)', marginBottom:6 }}>CRÉNEAUX</div>
                  <div style={{ display:'flex', flexWrap:'wrap', gap:5 }}>
                    {e.creneaux.map((c,i)=>(
                      <span key={i} style={{ fontSize:11, padding:'2px 8px', borderRadius:100, background:'var(--bg-input)', color:'var(--text-muted)', border:'1px solid var(--border)' }}>{c.label} {c.heure_debut}–{c.heure_fin}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      {showModal && userId && <EtabModal editing={editing} onClose={()=>{setShowModal(false);setEditing(null)}} onSaved={load} userId={userId}/>}
      <style>{'@keyframes spin{to{transform:rotate(360deg)}}'}</style>
    </div>
  )
}
