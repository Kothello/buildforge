'use client'

const STAGES = [
  { id: 'engineering', label: 'Engineering' },
  { id: 'permitting', label: 'Permitting' },
  { id: 'production', label: 'Production' },
  { id: 'delivery', label: 'Delivery' },
  { id: 'install', label: 'Install' },
  { id: 'paid', label: 'Paid' },
]

export default function ProjectsPage() {
  return (
    <div className="min-h-screen bg-background p-8">
      <h1 className="text-4xl font-bold text-white mb-8">Project Management</h1>

      {/* Kanban Board */}
      <div className="overflow-x-auto">
        <div className="flex gap-6 min-w-min">
          {STAGES.map((stage) => (
            <div
              key={stage.id}
              className="w-96 rounded-lg border border-border bg-card/50 backdrop-blur p-4"
            >
              <h2 className="font-semibold text-white mb-4">{stage.label}</h2>

              {/* Droppable Area */}
              <div className="space-y-3 min-h-[400px]">
                {/* Placeholder: Project Card */}
                <div className="p-4 rounded-lg border border-border/50 bg-card hover:border-accent/50 cursor-grab active:cursor-grabbing">
                  <p className="font-medium text-white">Building Project</p>
                  <p className="text-xs text-muted-foreground mt-1">40' × 60' × 14'</p>
                  <p className="text-xs text-accent mt-2">$45,000</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
