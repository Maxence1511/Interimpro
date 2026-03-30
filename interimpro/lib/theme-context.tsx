'use client'
import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

export type ThemeContextType = {
  accent: string
  darkMode: boolean
  setAccent: (c: string) => void
  setDarkMode: (v: boolean) => void
  savePrefs: () => Promise<void>
}

const ThemeContext = createContext<ThemeContextType>({
  accent: '#e879f9', darkMode: true,
  setAccent: () => {}, setDarkMode: () => {}, savePrefs: async () => {},
})

export function useTheme() { return useContext(ThemeContext) }

function applyTheme(accent: string, dark: boolean) {
  const root = document.documentElement
  root.style.setProperty('--accent', accent)
  // Dériver les variantes de couleur accent
  root.style.setProperty('--accent-dim', hexToRgba(accent, 0.12))
  root.style.setProperty('--accent-border', hexToRgba(accent, 0.25))

  if (dark) {
    root.style.setProperty('--bg', '#0f172a')
    root.style.setProperty('--bg-card', '#1e2433')
    root.style.setProperty('--bg-input', '#252d3d')
    root.style.setProperty('--bg-hover', '#2a3447')
    root.style.setProperty('--text', '#f1f5f9')
    root.style.setProperty('--text-muted', '#94a3b8')
    root.style.setProperty('--text-dim', '#64748b')
    root.style.setProperty('--border', '#2a3447')
    root.style.setProperty('--sidebar-bg', '#0f172a')
    root.style.setProperty('--topbar-border', '#1e293b')
  } else {
    root.style.setProperty('--bg', '#f8fafc')
    root.style.setProperty('--bg-card', '#ffffff')
    root.style.setProperty('--bg-input', '#f1f5f9')
    root.style.setProperty('--bg-hover', '#e2e8f0')
    root.style.setProperty('--text', '#0f172a')
    root.style.setProperty('--text-muted', '#475569')
    root.style.setProperty('--text-dim', '#94a3b8')
    root.style.setProperty('--border', '#e2e8f0')
    root.style.setProperty('--sidebar-bg', '#1e293b')
    root.style.setProperty('--topbar-border', '#e2e8f0')
  }
}

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1,3),16)
  const g = parseInt(hex.slice(3,5),16)
  const b = parseInt(hex.slice(5,7),16)
  return `rgba(${r},${g},${b},${alpha})`
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [accent, setAccentState] = useState('#e879f9')
  const [darkMode, setDarkModeState] = useState(true)
  const supabase = createClient()

  // Charger les préfs depuis Supabase au montage
  useEffect(() => {
    const loadPrefs = async () => {
      // D'abord appliquer depuis localStorage pour éviter le flash
      const cached = localStorage.getItem('interimpro_prefs')
      if (cached) {
        try {
          const p = JSON.parse(cached)
          setAccentState(p.accent || '#e879f9')
          setDarkModeState(p.darkMode !== false)
          applyTheme(p.accent || '#e879f9', p.darkMode !== false)
        } catch {}
      } else {
        applyTheme('#e879f9', true)
      }

      // Puis charger depuis Supabase
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase.from('user_preferences').select('*').eq('user_id', user.id).single()
      if (data) {
        const a = data.couleur_theme || '#e879f9'
        const d = data.mode_sombre !== false
        setAccentState(a)
        setDarkModeState(d)
        applyTheme(a, d)
        localStorage.setItem('interimpro_prefs', JSON.stringify({ accent: a, darkMode: d }))
      }
    }
    loadPrefs()
  }, [])

  const setAccent = useCallback((c: string) => {
    setAccentState(c)
    applyTheme(c, darkMode)
  }, [darkMode])

  const setDarkMode = useCallback((v: boolean) => {
    setDarkModeState(v)
    applyTheme(accent, v)
  }, [accent])

  const savePrefs = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const payload = { couleur_theme: accent, mode_sombre: darkMode, user_id: user.id }
    const { data: ex } = await supabase.from('user_preferences').select('id').eq('user_id', user.id).single()
    if (ex) await supabase.from('user_preferences').update(payload).eq('user_id', user.id)
    else await supabase.from('user_preferences').insert({ ...payload, objectif_heures_mensuel: 152, langue: 'fr' })
    localStorage.setItem('interimpro_prefs', JSON.stringify({ accent, darkMode }))
  }, [accent, darkMode])

  return (
    <ThemeContext.Provider value={{ accent, darkMode, setAccent, setDarkMode, savePrefs }}>
      {children}
    </ThemeContext.Provider>
  )
}
