'use client'
import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Lang } from '@/lib/i18n'

export type ThemeContextType = {
  accent: string
  darkMode: boolean
  lang: Lang
  objectif: number
  setAccent: (c: string) => void
  setDarkMode: (v: boolean) => void
  setLang: (l: Lang) => void
  setObjectif: (n: number) => void
  savePrefs: () => Promise<void>
  userId: string | null
}

const ThemeContext = createContext<ThemeContextType>({
  accent: '#e879f9', darkMode: true, lang: 'fr', objectif: 152, userId: null,
  setAccent: () => {}, setDarkMode: () => {}, setLang: () => {}, setObjectif: () => {}, savePrefs: async () => {},
})

export function useTheme() { return useContext(ThemeContext) }

function hexToRgba(hex: string, alpha: number): string {
  try {
    const r = parseInt(hex.slice(1,3),16)
    const g = parseInt(hex.slice(3,5),16)
    const b = parseInt(hex.slice(5,7),16)
    return `rgba(${r},${g},${b},${alpha})`
  } catch { return `rgba(232,121,249,${alpha})` }
}

export function applyTheme(accent: string, dark: boolean) {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  root.style.setProperty('--accent', accent)
  root.style.setProperty('--accent-dim', hexToRgba(accent, 0.12))
  root.style.setProperty('--accent-border', hexToRgba(accent, 0.28))
  root.style.setProperty('--accent-hover', hexToRgba(accent, 0.06))
  if (dark) {
    root.style.setProperty('--bg', '#0f172a')
    root.style.setProperty('--bg-card', '#1e2433')
    root.style.setProperty('--bg-input', '#252d3d')
    root.style.setProperty('--bg-hover', '#2a3447')
    root.style.setProperty('--bg-modal', '#1e2433')
    root.style.setProperty('--text', '#f1f5f9')
    root.style.setProperty('--text-muted', '#94a3b8')
    root.style.setProperty('--text-dim', '#64748b')
    root.style.setProperty('--border', '#2a3447')
    root.style.setProperty('--sidebar-bg', '#0f172a')
    root.style.setProperty('--topbar-border', '#1e293b')
    root.style.setProperty('--shadow', 'rgba(0,0,0,0.5)')
    root.style.setProperty('--overlay', 'rgba(0,0,0,0.65)')
    root.setAttribute('data-theme', 'dark')
  } else {
    root.style.setProperty('--bg', '#f0f4f8')
    root.style.setProperty('--bg-card', '#ffffff')
    root.style.setProperty('--bg-input', '#f1f5f9')
    root.style.setProperty('--bg-hover', '#e2e8f0')
    root.style.setProperty('--bg-modal', '#ffffff')
    root.style.setProperty('--text', '#0f172a')
    root.style.setProperty('--text-muted', '#475569')
    root.style.setProperty('--text-dim', '#94a3b8')
    root.style.setProperty('--border', '#e2e8f0')
    root.style.setProperty('--sidebar-bg', '#1e293b')
    root.style.setProperty('--topbar-border', '#e2e8f0')
    root.style.setProperty('--shadow', 'rgba(0,0,0,0.1)')
    root.style.setProperty('--overlay', 'rgba(0,0,0,0.4)')
    root.setAttribute('data-theme', 'light')
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [accent, setAccentState] = useState('#e879f9')
  const [darkMode, setDarkModeState] = useState(true)
  const [lang, setLangState] = useState<Lang>('fr')
  const [objectif, setObjectifState] = useState(152)
  const [userId, setUserId] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    // Flash prevention: apply cached theme immediately
    const cached = localStorage.getItem('ip_prefs')
    if (cached) {
      try {
        const p = JSON.parse(cached)
        const a = p.accent || '#e879f9'
        const d = p.darkMode !== false
        setAccentState(a); setDarkModeState(d)
        if (p.lang) setLangState(p.lang as Lang)
        if (p.objectif) setObjectifState(p.objectif)
        applyTheme(a, d)
      } catch { applyTheme('#e879f9', true) }
    } else {
      applyTheme('#e879f9', true)
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_e, session) => {
      if (!session?.user) return
      const uid = session.user.id
      setUserId(uid)
      const { data } = await supabase.from('user_preferences').select('*').eq('user_id', uid).single()
      if (data) {
        const a = data.couleur_theme || '#e879f9'
        const d = data.mode_sombre !== false
        const l = (data.langue || 'fr') as Lang
        const o = data.objectif_heures_mensuel || 152
        setAccentState(a); setDarkModeState(d); setLangState(l); setObjectifState(o)
        applyTheme(a, d)
        localStorage.setItem('ip_prefs', JSON.stringify({ accent: a, darkMode: d, lang: l, objectif: o }))
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  const setAccent = useCallback((c: string) => {
    setAccentState(c); applyTheme(c, darkMode)
  }, [darkMode])

  const setDarkMode = useCallback((v: boolean) => {
    setDarkModeState(v); applyTheme(accent, v)
  }, [accent])

  const setLang = useCallback((l: Lang) => { setLangState(l) }, [])
  const setObjectif = useCallback((n: number) => { setObjectifState(n) }, [])

  const savePrefs = useCallback(async () => {
    if (!userId) return
    const payload = { couleur_theme: accent, mode_sombre: darkMode, langue: lang, objectif_heures_mensuel: objectif, user_id: userId }
    const { data: ex } = await supabase.from('user_preferences').select('id').eq('user_id', userId).single()
    if (ex) await supabase.from('user_preferences').update(payload).eq('user_id', userId)
    else await supabase.from('user_preferences').insert(payload)
    localStorage.setItem('ip_prefs', JSON.stringify({ accent, darkMode, lang, objectif }))
  }, [accent, darkMode, lang, objectif, userId])

  return (
    <ThemeContext.Provider value={{ accent, darkMode, lang, objectif, setAccent, setDarkMode, setLang, setObjectif, savePrefs, userId }}>
      {children}
    </ThemeContext.Provider>
  )
}
