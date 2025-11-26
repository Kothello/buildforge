'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function Home() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
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
          } else {
            router.push('/login')
          }
        } else {
          router.push('/login')
        }
      } catch (err) {
        router.push('/login')
      } finally {
        setIsLoading(false)
      }
    }

    checkAuth()
  }, [router])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
          <div className="text-2xl font-bold text-white mb-2">SteelFlow One</div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  return null
}
