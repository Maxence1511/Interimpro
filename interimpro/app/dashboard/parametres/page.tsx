'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

// Les paramètres sont maintenant une popup accessible depuis la sidebar
// Cette page redirige vers le dashboard
export default function ParametresPage() {
  const router = useRouter()
  useEffect(() => { router.replace('/dashboard') }, [])
  return null
}
