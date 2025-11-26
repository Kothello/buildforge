'use client'

import { Button } from '@/components/ui/button'
import { Building2 } from 'lucide-react'

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-slate-950 flex items-center justify-center px-4">
      <div className="text-center max-w-2xl">
        <div className="flex justify-center mb-8">
          <div className="p-4 bg-accent/10 rounded-xl border border-accent/20 backdrop-blur">
            <Building2 className="w-16 h-16 text-accent" />
          </div>
        </div>

        <h1 className="text-5xl font-bold text-white mb-4">SteelFlow One</h1>
        <p className="text-xl text-muted-foreground mb-8">
          Premium CRM for the steel building industry
        </p>

        <div className="space-y-4">
          <a href="/api/auth/login">
            <Button size="lg" className="w-full bg-accent hover:bg-accent/90 text-white">
              Sign In with Replit
            </Button>
          </a>
          <p className="text-xs text-muted-foreground">
            Sign in to access your dashboard
          </p>
        </div>
      </div>
    </div>
  )
}
