import type { Metadata } from 'next'
import './globals.css'
import { ThemeProvider } from '@/lib/theme-context'

export const metadata: Metadata = { title: 'InterimPro', description: 'Gérez vos missions d\'intérim médical' }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
