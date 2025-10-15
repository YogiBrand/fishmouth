import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'

const ThemeContext = createContext({
  theme: 'dark',
  setTheme: () => {},
  toggleTheme: () => {},
})

const prefersDark = () =>
  typeof window !== 'undefined' &&
  window.matchMedia &&
  window.matchMedia('(prefers-color-scheme: dark)').matches

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    if (typeof window === 'undefined') return 'dark'
    const stored = window.localStorage.getItem('fm_admin_theme')
    if (stored === 'light' || stored === 'dark') return stored
    return prefersDark() ? 'dark' : 'light'
  })

  useEffect(() => {
    if (typeof document === 'undefined') return
    document.documentElement.setAttribute('data-theme', theme)
    window.localStorage.setItem('fm_admin_theme', theme)
  }, [theme])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const listener = (event) => {
      if (!window.localStorage.getItem('fm_admin_theme')) {
        setTheme(event.matches ? 'dark' : 'light')
      }
    }
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    media.addEventListener('change', listener)
    return () => media.removeEventListener('change', listener)
  }, [])

  const value = useMemo(
    () => ({
      theme,
      setTheme,
      toggleTheme: () => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark')),
    }),
    [theme]
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export const useTheme = () => useContext(ThemeContext)
