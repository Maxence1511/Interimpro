'use client'
import { useState, useEffect } from 'react'
import { getSupabase } from '@/lib/supabase/client'
import { useTheme } from '@/lib/theme-context'
import { t } from '@/lib/i18n'

type Mission = { id:string; titre:string; date_debut:string; date_fin:string; statut:string; salaire_estime:number; etablissement_id:string; heures:number }
type Etab = { id:string; nom:string }
type ModalMission = { mission:Mission; x:number; y:number } | null

const JOURS_FERIES_FR = (y:number) => {
  const d = (a:number,m:number,j:number) => new Date(a,m-1,j).toISOString().slice(0,10)
  const pasques = (a:number) => {
    const f=Math.floor,c=a%19,b=f(a/100),e=b-f(b/4)-f((8*b+13)/25)+19*c+15
    const h=(e-f(e/30)*30)%30,k=h-(f(h/28))*(1-(f(29/(h+1)))*(f(21/(c+11))))
    const p=(a+f(a/4)+k+2-b+f(b/4))%7,q=k-p
    return { m:q<-9?4:3, j:q+(q<-9?1:29) }
  }
  const { m,j } = pasques(y)
  const pa = new Date(y,m-1,j)
  const lp = new Date(pa); lp.setDate(pa.getDate()+1)
  const ap = new Date(pa); ap.setDate(pa.getDate()+39)
  const pp = new Date(pa); pp.setDate(pa.getDate()+49)
  return [d(y,1,1),d(y,5,1),d(y,5,8),d(y,7,14),d(y,8,15),d(y,11,1),d(y,11,11),d(y,12,25),
    lp.toISOString().slice(0,10), ap.toISOString().slice(0,10), pp.toISOString().slice(0,10)]
}

const JOURS_FERIES_LABELS: Record<string,string> = {
  '01-01':'Jour de l\'an','05-01':'Fête du travail','05-08':'Victoire 1945',
  '07-14':'Fête nationale','08-15':'Assomption','11-01':'Toussaint',
  '11-11':'Armistice','12-25':'Noël'
}

export default function CalendrierPage() {
  const [missions, setMissions] = useState<Mission[]>([])
  const [etabs, setEtabs] = useState<Etab[]>([])
  const [date, setDate] = useState(new Date())
  const [hoveredDay, setHoveredDay] = useState<number|null>(null)
  const [popup, setPopup] = useState<ModalMission>(null)
  const [userId, setUserId] = useState<string|null>(null)
  const { accent, lang } = useTheme()

  const y = date.getFullYear(), m = date.getMonth()
  const jf = JOURS_FERIES_FR(y)
  const premiers = new Date(y,m,1).getDay() || 7
  const nbjours = new Date(y,m+1,0).getDate()
  const moisLabel = date.toLocaleDateString('fr-FR',{month:'long',year:'numeric'}).replace(/^\w/,c=>c.toUpperCase())
  const fmtEur = (n:number) => n?.toLocaleString('fr-FR',{style:'currency',currency:'EUR',maximumFractionDigits:0})||''

  // Récupérer userId directement depuis getSession (plus fiable)
  useEffect(() => {
    getSupabase().auth.getSession().then(({ data }) => {
      if (data.session?.user?.id) setUserId(data.session.user.id)
    })
  }, [])

  useEffect(() => {
    if (!userId) return
    const sb = getSupabase()
    Promise.all([
      sb.from('missions').select('*').eq('user_id',userId),
      sb.from('etablissements').select('id,nom').eq('user_id',userId).eq('archived',false)
    ]).then(([m2,e]) => {
      setMissions((m2.data||[]) as Mission[])
      setEtabs((e.data||[]) as Etab[])
    })
  }, [userId])

  const missionsJour = (j:number) => {
    const dateStr = `${y}-${String(m+1).padStart(2,'0')}-${String(j).padStart(2,'0')}`
    return missions.filter(mi => mi.date_debut?.slice(0,10) === dateStr)
  }
  const getEtab = (id:string) => etabs.find(e => e.id === id)

  // Couleur selon statut mission
  const missionColor = (statut:string) => {
    if (statut==='passee') return { bg:'rgba(148,163,184,.15)', border:'rgba(148,163,184,.3)', text:'#94a3b8' }
    if (statut==='archive') return { bg:'rgba(107,114,128,.1)', border:'rgba(107,114,128,.2)', text:'#6b7280' }
    return { bg:`${accent}25`, border:`${accent}50`, text:accent }
  }

  const JOURS = lang==='en' ? ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'] :
                lang==='es' ? ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'] :
                ['Lun','Mar','Mer','Jeu','Ven','Sam','Dim']

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:22 }}>
        <div>
          <h1 style={{ fontSize:26, fontWeight:800, color:'var(--text)' }}>{t(lang,'nav.calendrier')}</h1>
          <div style={{ fontSize:13, color:'var(--text-dim)', marginTop:2 }}>
            {missions.filter(mi=>mi.date_debut?.slice(0,7)===`${y}-${String(m+1).padStart(2,'0')}`).length} mission{missions.filter(mi=>mi.date_debut?.slice(0,7)===`${y}-${String(m+1).padStart(2,'0')}`).length!==1?'s':''} ce mois
          </div>
        </div>
        <div style={{ display:'flex', gap:10, alignItems:'center' }}>
          <button onClick={()=>setDate(new Date(y,m-1,1))} style={{ width:32, height:32, borderRadius:8, border:'1px solid var(--border)', background:'var(--bg-card)', color:'var(--text-muted)', cursor:'pointer', fontSize:16 }}>‹</button>
          <span style={{ fontWeight:700, color:'var(--text)', minWidth:160, textAlign:'center', fontSize:15 }}>{moisLabel}</span>
          <button onClick={()=>setDate(new Date(y,m+1,1))} style={{ width:32, height:32, borderRadius:8, border:'1px solid var(--border)', background:'var(--bg-card)', color:'var(--text-muted)', cursor:'pointer', fontSize:16 }}>›</button>
          <button onClick={()=>setDate(new Date())} style={{ padding:'6px 12px', borderRadius:7, border:`1px solid ${accent}`, background:'var(--accent-dim)', color:accent, cursor:'pointer', fontSize:12, fontWeight:600 }}>Aujourd'hui</button>
        </div>
      </div>

      <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:12, overflow:'hidden' }}>
        {/* En-têtes jours */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', borderBottom:'1px solid var(--border)' }}>
          {JOURS.map(j=>(
            <div key={j} style={{ padding:'10px 0', textAlign:'center', fontSize:11, fontWeight:700, color:'var(--text-dim)', letterSpacing:'.06em' }}>{j}</div>
          ))}
        </div>

        {/* Grille */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)' }}>
          {/* Cellules vides avant */}
          {Array.from({length:premiers-1}).map((_,i)=>(
            <div key={`v${i}`} style={{ minHeight:100, borderRight:'1px solid var(--border)', borderBottom:'1px solid var(--border)', background:'rgba(0,0,0,.01)' }}/>
          ))}

          {/* Jours du mois */}
          {Array.from({length:nbjours}).map((_,i)=>{
            const j = i+1
            const dateStr = `${y}-${String(m+1).padStart(2,'0')}-${String(j).padStart(2,'0')}`
            const isToday = dateStr === new Date().toISOString().slice(0,10)
            const isFerie = jf.includes(dateStr)
            const dow = new Date(y,m,j).getDay()
            const isWE = [6,0].includes(dow)
            const ms = missionsJour(j)
            const isHovered = hoveredDay === j

            return (
              <div key={j}
                onMouseEnter={() => setHoveredDay(j)}
                onMouseLeave={() => setHoveredDay(null)}
                style={{
                  minHeight:100, padding:'6px 6px 4px', position:'relative',
                  borderRight:'1px solid var(--border)', borderBottom:'1px solid var(--border)',
                  background: isToday ? `${accent}12` : isFerie ? 'rgba(245,158,11,.06)' : isWE ? 'rgba(0,0,0,.015)' : 'transparent',
                  transition:'background .1s'
                }}>
                {/* Numéro du jour */}
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:4 }}>
                  <span style={{
                    width:22, height:22, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center',
                    background: isToday ? accent : 'transparent',
                    color: isToday ? 'white' : isFerie ? '#f59e0b' : isWE ? 'var(--text-muted)' : 'var(--text)',
                    fontSize:12, fontWeight: isToday ? 700 : 400, flexShrink:0
                  }}>{j}</span>
                  {isFerie && <span title={JOURS_FERIES_LABELS[dateStr.slice(5)]||'Férié'} style={{ fontSize:10, cursor:'default' }}>🎉</span>}
                  {/* ✕ au hover pour ajouter une mission */}
                  {isHovered && !isFerie && (
                    <button
                      title="Ajouter une mission ce jour"
                      onClick={() => window.location.href='/dashboard/missions'}
                      style={{ width:18, height:18, borderRadius:'50%', border:'none', background:accent, color:'white', cursor:'pointer', fontSize:11, display:'flex', alignItems:'center', justifyContent:'center', padding:0, flexShrink:0, lineHeight:1 }}>
                      +
                    </button>
                  )}
                </div>

                {/* Missions du jour */}
                {ms.map(mi => {
                  const c = missionColor(mi.statut)
                  const etab = getEtab(mi.etablissement_id)
                  const deb = mi.date_debut?.split('T')[1]?.slice(0,5) || ''
                  const fin = mi.date_fin?.split('T')[1]?.slice(0,5) || ''
                  return (
                    <div key={mi.id}
                      onClick={e=>{ e.stopPropagation(); setPopup({mission:mi, x:e.clientX, y:e.clientY}) }}
                      title={`${mi.titre}${etab?'\n'+etab.nom:''}${deb?'\n'+deb+'→'+fin:''}`}
                      style={{
                        padding:'2px 5px', borderRadius:4, background:c.bg, border:`1px solid ${c.border}`,
                        fontSize:10, color:c.text, fontWeight:600, marginBottom:2, cursor:'pointer',
                        overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap',
                        display:'block', transition:'opacity .1s'
                      }}>
                      {deb && <span style={{ opacity:.7, marginRight:3 }}>{deb}</span>}
                      {mi.titre}
                    </div>
                  )
                })}
              </div>
            )
          })}

          {/* Cellules vides après */}
          {Array.from({length:(7-((nbjours+premiers-1)%7||7))%7}).map((_,i)=>(
            <div key={`f${i}`} style={{ minHeight:100, borderRight:'1px solid var(--border)', borderBottom:'1px solid var(--border)', background:'rgba(0,0,0,.01)' }}/>
          ))}
        </div>
      </div>

      {/* Légende */}
      <div style={{ display:'flex', gap:16, marginTop:12, flexWrap:'wrap' }}>
        {[
          { color:accent, label:'À venir' },
          { color:'#94a3b8', label:'Passée' },
          { color:'#f59e0b', label:'Jours fériés' },
        ].map(l=>(
          <div key={l.label} style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, color:'var(--text-dim)' }}>
            <div style={{ width:12, height:12, borderRadius:3, background:l.color+'40', border:`1.5px solid ${l.color}` }}/>
            {l.label}
          </div>
        ))}
      </div>

      {/* Popup détail mission */}
      {popup && (
        <div style={{ position:'fixed', inset:0, zIndex:200 }} onClick={()=>setPopup(null)}>
          <div style={{
            position:'fixed',
            left: Math.min(popup.x, window.innerWidth-240),
            top: Math.min(popup.y, window.innerHeight-200),
            width:230, background:'var(--bg-card)', border:`1px solid ${accent}40`,
            borderRadius:12, padding:'14px 16px', boxShadow:'0 8px 32px var(--shadow)',
            animation:'popIn .15s ease', zIndex:201
          }} onClick={e=>e.stopPropagation()}>
            <div style={{ fontWeight:700, fontSize:14, color:'var(--text)', marginBottom:4 }}>{popup.mission.titre}</div>
            <div style={{ fontSize:12, color:'var(--text-dim)', marginBottom:8 }}>{getEtab(popup.mission.etablissement_id)?.nom||'—'}</div>
            <div style={{ fontSize:12, color:'var(--text-muted)' }}>
              🕐 {popup.mission.date_debut?.split('T')[1]?.slice(0,5)||'—'} → {popup.mission.date_fin?.split('T')[1]?.slice(0,5)||'—'}
            </div>
            {popup.mission.heures>0 && <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:2 }}>⏱ {popup.mission.heures}h</div>}
            {popup.mission.salaire_estime>0 && <div style={{ fontSize:14, fontWeight:700, color:accent, marginTop:6 }}>{fmtEur(popup.mission.salaire_estime)}</div>}
            <button onClick={()=>{ setPopup(null); window.location.href='/dashboard/missions' }} style={{ width:'100%', marginTop:10, padding:'7px', borderRadius:7, border:'none', background:`${accent}20`, color:accent, cursor:'pointer', fontSize:12, fontWeight:600 }}>
              Voir la mission →
            </button>
          </div>
        </div>
      )}

      <style>{'@keyframes popIn{from{opacity:0;transform:scale(.9)}to{opacity:1;transform:scale(1)}}'}</style>
    </div>
  )
}
