import type { Metadata } from 'next'
import Providers from './providers'
import './globals.css'

export const metadata: Metadata = {
  title: 'InterimPro',
  description: "Gestion de missions d'intérim médical",
  icons: { icon: '/favicon.svg', apple: '/favicon.svg' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <head><link rel="icon" type="image/svg+xml" href="/favicon.svg"/></head>
      <body><Providers>{children}</Providers></body>
    </html>
  )
}
