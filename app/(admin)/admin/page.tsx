'use client'

export default function AdminPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-4 py-8">
        <h1 className="text-4xl font-bold text-white mb-8">Admin Control Panel</h1>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Pricing Rules */}
          <div className="rounded-lg border border-border bg-card p-6">
            <h2 className="text-xl font-semibold text-white mb-2">Pricing Rules</h2>
            <p className="text-muted-foreground mb-4">Manage pricing calculations and rules</p>
            <button className="w-full bg-accent hover:bg-accent/90 text-white px-4 py-2 rounded-lg">
              Configure
            </button>
          </div>

          {/* Global Settings */}
          <div className="rounded-lg border border-border bg-card p-6">
            <h2 className="text-xl font-semibold text-white mb-2">Global Settings</h2>
            <p className="text-muted-foreground mb-4">Auto-assignment, webhooks, automations</p>
            <button className="w-full bg-accent hover:bg-accent/90 text-white px-4 py-2 rounded-lg">
              Configure
            </button>
          </div>

          {/* User Management */}
          <div className="rounded-lg border border-border bg-card p-6">
            <h2 className="text-xl font-semibold text-white mb-2">User Management</h2>
            <p className="text-muted-foreground mb-4">Roles, permissions, and assignments</p>
            <button className="w-full bg-accent hover:bg-accent/90 text-white px-4 py-2 rounded-lg">
              Manage
            </button>
          </div>

          {/* All Leads */}
          <div className="rounded-lg border border-border bg-card p-6 md:col-span-2 lg:col-span-3">
            <h2 className="text-xl font-semibold text-white mb-2">System Overview</h2>
            <p className="text-muted-foreground">View all leads across all representatives</p>
          </div>
        </div>
      </div>
    </div>
  )
}
