'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    // For now, bypass auth and go straight to sales dashboard
    router.push('/sales')
  }, [router])

  return null
}
