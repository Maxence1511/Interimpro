import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'InterimPro — Gestion de missions infirmières',
  description: 'Gérez vos missions d\'intérim médical facilement',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  )
}
