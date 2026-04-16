import { useQuery } from "@tanstack/react-query";
import { authedFetch } from "@/lib/authedFetch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Users, AlertCircle, Lock } from "lucide-react";
import { useAuth } from "@/lib/auth";

interface SalesRep {
  id: string;
  name: string;
  leadCount: number;
}

interface SalesRepsResponse {
  reps: SalesRep[];
}

export function LeadDistribution() {
  const { user } = useAuth();
  
  // Only managers/admins can view this panel
  const isManagerOrAdmin = user?.role === "ADMIN" || user?.role === "MANAGER";

  const { data: salesRepsData, isLoading, error } = useQuery<SalesRepsResponse>({
    queryKey: ['/api/users/sales-reps'],
    queryFn: async () => {
      const response = await authedFetch('/api/users/sales-reps');
      if (!response.ok) {
        if (response.status === 403) {
          throw new Error('FORBIDDEN');
        }
        throw new Error('Failed to fetch sales reps');
      }
      return response.json();
    },
    enabled: isManagerOrAdmin, // Only fetch if user is manager/admin
    retry: false, // Don't retry on 403
  });
  
  const salesReps = salesRepsData?.reps || [];
  
  // Show role-gated message for non-managers
  if (!isManagerOrAdmin) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Lead Distribution
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <Lock className="h-8 w-8 mb-2" />
            <p className="text-sm">Team distribution is available to managers</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!salesReps || salesReps.length === 0) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <AlertCircle className="w-8 h-8" />
            <p>No sales representatives found</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="w-5 h-5" />
          Lead Distribution
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-4 font-semibold">Sales Rep</th>
                <th className="text-center py-3 px-4 font-semibold">Lead Count</th>
              </tr>
            </thead>
            <tbody>
              {salesReps.map((rep) => (
                <tr key={rep.id} className="border-b hover:bg-muted/50">
                  <td className="py-3 px-4">
                    <div className="font-medium">{rep.name}</div>
                  </td>
                  <td className="text-center py-3 px-4">
                    <span className="text-lg font-bold text-primary">
                      {rep.leadCount}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Summary */}
        <div className="mt-6 grid grid-cols-2 gap-4">
          <div className="text-center p-4 bg-muted rounded-lg">
            <div className="text-2xl font-bold">
              {salesReps.reduce((sum, rep) => sum + rep.leadCount, 0)}
            </div>
            <div className="text-sm text-muted-foreground">Total Leads</div>
          </div>
          <div className="text-center p-4 bg-muted rounded-lg">
            <div className="text-2xl font-bold">
              {salesReps.length}
            </div>
            <div className="text-sm text-muted-foreground">Active Reps</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
