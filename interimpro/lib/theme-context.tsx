'use client'
import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Lang } from '@/lib/i18n'

export type ThemeContextType = {
  accent: string; darkMode: boolean; lang: Lang; objectif: number; userId: string | null
  setAccent: (c: string) => void; setDarkMode: (v: boolean) => void
  setLang: (l: Lang) => void; setObjectif: (n: number) => void; savePrefs: () => Promise<void>
}

const ThemeContext = createContext<ThemeContextType>({
  accent: '#e879f9', darkMode: true, lang: 'fr', objectif: 152, userId: null,
  setAccent: () => {}, setDarkMode: () => {}, setLang: () => {}, setObjectif: () => {}, savePrefs: async () => {},
})

export function useTheme() { return useContext(ThemeContext) }

function hexToRgba(hex: string, a: number) {
  try { const r=parseInt(hex.slice(1,3),16),g=parseInt(hex.slice(3,5),16),b=parseInt(hex.slice(5,7),16); return `rgba(${r},${g},${b},${a})` }
  catch { return `rgba(232,121,249,${a})` }
}

export function applyTheme(accent: string, dark: boolean) {
  if (typeof document === 'undefined') return
  const r = document.documentElement
  r.style.setProperty('--accent', accent)
  r.style.setProperty('--accent-dim', hexToRgba(accent, 0.12))
  r.style.setProperty('--accent-border', hexToRgba(accent, 0.28))
  r.style.setProperty('--accent-hover', hexToRgba(accent, 0.06))
  if (dark) {
    r.style.setProperty('--bg', '#0f172a'); r.style.setProperty('--bg-card', '#1e2433')
    r.style.setProperty('--bg-input', '#252d3d'); r.style.setProperty('--bg-hover', '#2a3447')
    r.style.setProperty('--bg-modal', '#1a2235'); r.style.setProperty('--text', '#f1f5f9')
    r.style.setProperty('--text-muted', '#94a3b8'); r.style.setProperty('--text-dim', '#64748b')
    r.style.setProperty('--border', '#2a3447'); r.style.setProperty('--topbar-border', '#1e293b')
    r.style.setProperty('--shadow', 'rgba(0,0,0,0.6)'); r.style.setProperty('--overlay', 'rgba(0,0,0,0.7)')
    r.setAttribute('data-theme', 'dark')
  } else {
    r.style.setProperty('--bg', '#f1f5f9'); r.style.setProperty('--bg-card', '#ffffff')
    r.style.setProperty('--bg-input', '#f0f4f8'); r.style.setProperty('--bg-hover', '#e2e8f0')
    r.style.setProperty('--bg-modal', '#ffffff'); r.style.setProperty('--text', '#0f172a')
    r.style.setProperty('--text-muted', '#475569'); r.style.setProperty('--text-dim', '#94a3b8')
    r.style.setProperty('--border', '#e2e8f0'); r.style.setProperty('--topbar-border', '#e2e8f0')
    r.style.setProperty('--shadow', 'rgba(0,0,0,0.1)'); r.style.setProperty('--overlay', 'rgba(0,0,0,0.4)')
    r.setAttribute('data-theme', 'light')
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [accent, setAccentState] = useState('#e879f9')
  const [darkMode, setDarkModeState] = useState(true)
  const [lang, setLangState] = useState<Lang>('fr')
  const [objectif, setObjectifState] = useState(152)
  const [userId, setUserId] = useState<string | null>(null)
  const loaded = useRef(false)
  const supabase = createClient()

  useEffect(() => {
    // Appliquer le cache immédiatement pour éviter le flash
    try {
      const cached = localStorage.getItem('ip_theme')
      if (cached) {
        const p = JSON.parse(cached)
        const a = p.accent || '#e879f9'; const d = p.darkMode !== false
        setAccentState(a); setDarkModeState(d)
        if (p.lang) setLangState(p.lang)
        if (p.objectif) setObjectifState(p.objectif)
        applyTheme(a, d)
      } else { applyTheme('#e879f9', true) }
    } catch { applyTheme('#e879f9', true) }

    // UN SEUL listener auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_e, session) => {
      if (!session?.user) { setUserId(null); return }
      const uid = session.user.id
      setUserId(uid)
      if (loaded.current) return
      loaded.current = true
      const { data } = await supabase.from('user_preferences')
        .select('couleur_theme,mode_sombre,langue,objectif_heures_mensuel')
        .eq('user_id', uid).maybeSingle()
      if (data) {
        const a = data.couleur_theme || '#e879f9'; const d = data.mode_sombre !== false
        const l = (data.langue || 'fr') as Lang; const o = Number(data.objectif_heures_mensuel) || 152
        setAccentState(a); setDarkModeState(d); setLangState(l); setObjectifState(o)
        applyTheme(a, d)
        localStorage.setItem('ip_theme', JSON.stringify({ accent: a, darkMode: d, lang: l, objectif: o }))
      }
    })
    return () => subscription.unsubscribe()
  }, []) // [] = une seule fois

  const setAccent = useCallback((c: string) => { setAccentState(c); applyTheme(c, darkMode) }, [darkMode])
  const setDarkMode = useCallback((v: boolean) => { setDarkModeState(v); applyTheme(accent, v) }, [accent])
  const setLang = useCallback((l: Lang) => setLangState(l), [])
  const setObjectif = useCallback((n: number) => setObjectifState(n), [])

  const savePrefs = useCallback(async () => {
    if (!userId) return
    const payload = { user_id: userId, couleur_theme: accent, mode_sombre: darkMode, langue: lang, objectif_heures_mensuel: objectif }
    const { data: ex } = await supabase.from('user_preferences').select('id').eq('user_id', userId).maybeSingle()
    if (ex) await supabase.from('user_preferences').update(payload).eq('user_id', userId)
    else await supabase.from('user_preferences').insert(payload)
    localStorage.setItem('ip_theme', JSON.stringify({ accent, darkMode, lang, objectif }))
  }, [accent, darkMode, lang, objectif, userId])

  return (
    <ThemeContext.Provider value={{ accent, darkMode, lang, objectif, userId, setAccent, setDarkMode, setLang, setObjectif, savePrefs }}>
      {children}
    </ThemeContext.Provider>
  )
}
