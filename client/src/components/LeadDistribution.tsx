import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { authedFetch } from "@/lib/authedFetch";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Users, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface SalesRep {
  id: string;
  name: string;
  email: string;
  leadsAvailable: number;
  leadsReserved: number;
  onBreak: boolean;
  breakType: string | null;
}

export function LeadDistribution() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: salesReps, isLoading } = useQuery<SalesRep[]>({
    queryKey: ['/api/users/sales-reps'],
    queryFn: async () => {
      const response = await authedFetch('/api/users/sales-reps');
      if (!response.ok) throw new Error('Failed to fetch sales reps');
      return response.json();
    }
  });

  const releaseMutation = useMutation({
    mutationFn: async (repId: string) => {
      const response = await authedFetch(`/api/leads/release/${repId}`, {
        method: 'POST',
      });
      if (!response.ok) throw new Error('Failed to release leads');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users/sales-reps'] });
      toast({
        title: "Leads Released",
        description: "Reserved leads have been returned to the pool",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to release leads",
        variant: "destructive",
      });
    }
  });

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
                <th className="text-center py-3 px-4 font-semibold">Available</th>
                <th className="text-center py-3 px-4 font-semibold">Reserved</th>
                <th className="text-center py-3 px-4 font-semibold">Status</th>
                <th className="text-center py-3 px-4 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {salesReps.map((rep) => (
                <tr key={rep.id} className="border-b hover:bg-muted/50">
                  <td className="py-3 px-4">
                    <div>
                      <div className="font-medium">{rep.name}</div>
                      <div className="text-sm text-muted-foreground">{rep.email}</div>
                    </div>
                  </td>
                  <td className="text-center py-3 px-4">
                    <span className="text-lg font-bold text-green-600">
                      {rep.leadsAvailable}
                    </span>
                  </td>
                  <td className="text-center py-3 px-4">
                    <span className="text-lg font-bold text-yellow-600">
                      {rep.leadsReserved}
                    </span>
                  </td>
                  <td className="text-center py-3 px-4">
                    {rep.onBreak ? (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                        {rep.breakType || 'On Break'}
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Active
                      </span>
                    )}
                  </td>
                  <td className="text-center py-3 px-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => releaseMutation.mutate(rep.id)}
                      disabled={rep.leadsReserved === 0 || releaseMutation.isPending}
                    >
                      {releaseMutation.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        'Release'
                      )}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Summary */}
        <div className="mt-6 grid grid-cols-3 gap-4">
          <div className="text-center p-4 bg-muted rounded-lg">
            <div className="text-2xl font-bold">
              {salesReps.reduce((sum, rep) => sum + rep.leadsAvailable, 0)}
            </div>
            <div className="text-sm text-muted-foreground">Total Available</div>
          </div>
          <div className="text-center p-4 bg-muted rounded-lg">
            <div className="text-2xl font-bold">
              {salesReps.reduce((sum, rep) => sum + rep.leadsReserved, 0)}
            </div>
            <div className="text-sm text-muted-foreground">Total Reserved</div>
          </div>
          <div className="text-center p-4 bg-muted rounded-lg">
            <div className="text-2xl font-bold">
              {salesReps.filter(rep => !rep.onBreak).length}
            </div>
            <div className="text-sm text-muted-foreground">Active Reps</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
