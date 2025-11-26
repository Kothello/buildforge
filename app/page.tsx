'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to auth or dashboard based on session
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/auth/session')
        if (res.ok) {
          const session = await res.json()
          if (session?.user?.role === 'admin') {
            router.push('/admin')
          } else if (session?.user?.role === 'sales') {
            router.push('/sales')
          } else if (session?.user?.role === 'pm') {
            router.push('/projects')
          }
        } else {
          router.push('/api/login')
        }
      } catch (err) {
        router.push('/api/login')
      }
    }

    checkAuth()
  }, [router])

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="text-center">
        <div className="text-4xl font-bold text-white mb-4">SteelFlow One</div>
        <p className="text-muted-foreground">Loading...</p>
      </div>
    </div>
  )
}
