import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2 } from "lucide-react";

export default function ProjectsPage() {
  const { data: projects = [], isLoading } = useQuery({
    queryKey: ["/api/projects"],
    queryFn: () => fetch("/api/projects").then(r => r.json()),
  });

  const statuses = ["planning", "design", "permitting", "production", "installation", "completed"];
  const columns = statuses.map(status => ({
    id: status,
    label: status.charAt(0).toUpperCase() + status.slice(1),
    projects: projects.filter((p: any) => p.status === status),
  }));

  return (
    <div className="h-full overflow-auto p-3 sm:p-6">
      <div className="flex items-center gap-2 mb-6">
        <Building2 className="w-5 h-5 text-primary" />
        <h1 className="text-2xl font-bold">Projects</h1>
      </div>

      {isLoading ? (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-40 bg-card/50 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <div className="flex gap-4 min-w-full pb-4">
            {columns.map((column) => (
              <div key={column.id} className="flex-shrink-0 w-72 sm:w-80">
                <h3 className="font-semibold text-sm mb-3 text-muted-foreground">
                  {column.label} ({column.projects.length})
                </h3>
                <div className="space-y-3">
                  {column.projects.map((project: any) => (
                    <Card key={project.id} className="bg-card/50 backdrop-blur-sm hover-elevate cursor-move transition">
                      <CardContent className="pt-4 pb-4">
                        <div className="space-y-2">
                          <div>
                            <p className="font-medium text-sm truncate">
                              {project.lead?.companyName || "Project"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {project.lead?.contactName}
                            </p>
                          </div>
                          <Badge variant="outline" className="text-xs w-fit">
                            ${project.lead?.totalPrice || "0"}
                          </Badge>
                          {project.notes && (
                            <p className="text-xs text-foreground line-clamp-2">{project.notes}</p>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  {column.projects.length === 0 && (
                    <div className="h-32 border-2 border-dashed border-border/50 rounded-lg flex items-center justify-center text-center text-xs text-muted-foreground">
                      Drop projects here
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
