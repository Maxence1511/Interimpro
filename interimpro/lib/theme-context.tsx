'use client'
import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { getSupabase } from '@/lib/supabase/client'
import type { Lang } from '@/lib/i18n'

type Ctx = {
  accent: string; darkMode: boolean; lang: Lang; objectif: number; userId: string | null
  setAccent: (c: string) => void; setDarkMode: (v: boolean) => void
  setLang: (l: Lang) => void; setObjectif: (n: number) => void
  savePrefs: () => Promise<void>
}

const Ctx = createContext<Ctx>({
  accent:'#e879f9', darkMode:true, lang:'fr', objectif:152, userId:null,
  setAccent:()=>{}, setDarkMode:()=>{}, setLang:()=>{}, setObjectif:()=>{}, savePrefs:async()=>{}
})

export const useTheme = () => useContext(Ctx)

function rgba(hex: string, a: number) {
  try { const r=parseInt(hex.slice(1,3),16),g=parseInt(hex.slice(3,5),16),b=parseInt(hex.slice(5,7),16); return `rgba(${r},${g},${b},${a})` }
  catch { return `rgba(232,121,249,${a})` }
}

export function applyTheme(accent: string, dark: boolean) {
  if (typeof document === 'undefined') return
  const r = document.documentElement
  r.style.setProperty('--accent', accent)
  r.style.setProperty('--accent-dim', rgba(accent,.12))
  r.style.setProperty('--accent-border', rgba(accent,.28))
  r.style.setProperty('--accent-hover', rgba(accent,.06))
  if (dark) {
    r.style.setProperty('--bg', '#0f172a'); r.style.setProperty('--bg-card', '#1e2433')
    r.style.setProperty('--bg-input', '#252d3d'); r.style.setProperty('--bg-hover', '#2a3447')
    r.style.setProperty('--bg-modal', '#1a2235'); r.style.setProperty('--text', '#f1f5f9')
    r.style.setProperty('--text-muted', '#94a3b8'); r.style.setProperty('--text-dim', '#64748b')
    r.style.setProperty('--border', '#2a3447'); r.style.setProperty('--topbar-border', '#1e293b')
    r.style.setProperty('--shadow', 'rgba(0,0,0,.6)'); r.style.setProperty('--overlay', 'rgba(0,0,0,.7)')
    r.setAttribute('data-theme', 'dark')
  } else {
    r.style.setProperty('--bg', '#f1f5f9'); r.style.setProperty('--bg-card', '#ffffff')
    r.style.setProperty('--bg-input', '#e8edf2'); r.style.setProperty('--bg-hover', '#dde3ea')
    r.style.setProperty('--bg-modal', '#ffffff'); r.style.setProperty('--text', '#0f172a')
    r.style.setProperty('--text-muted', '#475569'); r.style.setProperty('--text-dim', '#94a3b8')
    r.style.setProperty('--border', '#e2e8f0'); r.style.setProperty('--topbar-border', '#e2e8f0')
    r.style.setProperty('--shadow', 'rgba(0,0,0,.1)'); r.style.setProperty('--overlay', 'rgba(0,0,0,.4)')
    r.setAttribute('data-theme', 'light')
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [accent, _setA] = useState('#e879f9')
  const [darkMode, _setD] = useState(true)
  const [lang, _setL] = useState<Lang>('fr')
  const [objectif, _setO] = useState(152)
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    // Cache local immédiat
    try {
      const c = localStorage.getItem('ip_t')
      if (c) {
        const p = JSON.parse(c)
        _setA(p.a||'#e879f9'); _setD(p.d!==false)
        if(p.l) _setL(p.l); if(p.o) _setO(p.o)
        applyTheme(p.a||'#e879f9', p.d!==false)
      } else { applyTheme('#e879f9', true) }
    } catch { applyTheme('#e879f9', true) }

    const sb = getSupabase()
    let prefsLoaded = false

    const { data: { subscription } } = sb.auth.onAuthStateChange(async (event, session) => {
      setUserId(session?.user?.id || null)
      if (!session?.user?.id || prefsLoaded) return
      prefsLoaded = true
      const { data } = await sb.from('user_preferences')
        .select('couleur_theme,mode_sombre,langue,objectif_heures_mensuel')
        .eq('user_id', session.user.id).maybeSingle()
      if (!data) return
      const a=data.couleur_theme||'#e879f9', d=data.mode_sombre!==false
      const l=(data.langue||'fr') as Lang, o=Number(data.objectif_heures_mensuel)||152
      _setA(a); _setD(d); _setL(l); _setO(o)
      applyTheme(a, d)
      localStorage.setItem('ip_t', JSON.stringify({a,d,l,o}))
    })

    return () => subscription.unsubscribe()
  }, [])

  const setAccent = useCallback((c:string) => { _setA(c); applyTheme(c, darkMode) }, [darkMode])
  const setDarkMode = useCallback((v:boolean) => { _setD(v); applyTheme(accent, v) }, [accent])
  const setLang = useCallback((l:Lang) => _setL(l), [])
  const setObjectif = useCallback((n:number) => _setO(n), [])

  const savePrefs = useCallback(async () => {
    if (!userId) return
    const sb = getSupabase()
    const payload = { user_id:userId, couleur_theme:accent, mode_sombre:darkMode, langue:lang, objectif_heures_mensuel:objectif }
    const { data:ex } = await sb.from('user_preferences').select('id').eq('user_id',userId).maybeSingle()
    if (ex) await sb.from('user_preferences').update(payload).eq('user_id',userId)
    else await sb.from('user_preferences').insert(payload)
    localStorage.setItem('ip_t', JSON.stringify({a:accent,d:darkMode,l:lang,o:objectif}))
  }, [accent,darkMode,lang,objectif,userId])

  return <Ctx.Provider value={{accent,darkMode,lang,objectif,userId,setAccent,setDarkMode,setLang,setObjectif,savePrefs}}>{children}</Ctx.Provider>
}
