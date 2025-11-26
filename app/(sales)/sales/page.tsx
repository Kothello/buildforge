'use client'

import { useState } from 'react'

const LEAD_TEMPERATURES = ['hot', 'warm', 'new', 'follow-up', 'sleeping'] as const

export default function SalesPage() {
  const [selectedTemp, setSelectedTemp] = useState<typeof LEAD_TEMPERATURES[number]>('hot')

  return (
    <div className="flex h-screen bg-background">
      {/* Left Sidebar - My Leads */}
      <div className="w-80 border-r border-border bg-card/50 backdrop-blur overflow-y-auto">
        <div className="p-4 border-b border-border">
          <h2 className="text-lg font-semibold text-white">My Leads</h2>
          <p className="text-sm text-muted-foreground">Smart sorted daily</p>
        </div>

        {/* Temperature Filters */}
        <div className="p-4 space-y-2">
          {LEAD_TEMPERATURES.map((temp) => (
            <button
              key={temp}
              onClick={() => setSelectedTemp(temp)}
              className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                selectedTemp === temp
                  ? 'bg-accent text-white'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <span className="capitalize">{temp}</span>
            </button>
          ))}
        </div>

        {/* Leads List - Infinite Scroll */}
        <div className="p-4 space-y-3">
          {/* Placeholder leads */}
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="p-3 rounded-lg border border-border/50 bg-card hover:border-accent/50 cursor-pointer transition-colors"
            >
              <p className="font-medium text-white">Company {i}</p>
              <p className="text-xs text-muted-foreground">Contact Name</p>
              <div className="mt-2 flex justify-between items-center">
                <span className="text-xs px-2 py-1 rounded bg-accent/20 text-accent">
                  {selectedTemp}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-8">
        <div className="max-w-4xl">
          <h1 className="text-4xl font-bold text-white mb-4">Sales Dashboard</h1>
          <p className="text-muted-foreground mb-8">
            Select a lead from the list to view details and take action
          </p>

          {/* Placeholder: Lead Detail */}
          <div className="rounded-lg border border-border bg-card/50 backdrop-blur p-6">
            <div className="text-center text-muted-foreground">
              <p>Select a lead to begin</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <button className="px-6 py-3 bg-accent hover:bg-accent/90 text-white rounded-lg font-medium">
              Call
            </button>
            <button className="px-6 py-3 bg-accent hover:bg-accent/90 text-white rounded-lg font-medium">
              Text
            </button>
            <button className="px-6 py-3 bg-accent hover:bg-accent/90 text-white rounded-lg font-medium">
              Email
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
