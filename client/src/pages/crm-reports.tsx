import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { DollarSign, TrendingUp, Users, Target, BarChart3 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";

interface Summary {
  totalPipelineValue: number;
  totalWonValue: number;
  newLeadsCount: number;
  winRate: number;
}

interface RevenueData {
  periodStart: string;
  periodEnd: string;
  totalWon: number;
}

interface DealsByStage {
  stageId: string;
  stageName: string;
  count: number;
  totalValue: number;
}

interface PerformanceByRep {
  userId: string;
  name: string;
  dealsCount: number;
  wonDealsCount: number;
  totalWon: number;
}

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8", "#82CA9D"];

export default function CrmReportsPage() {
  const [dateRange, setDateRange] = useState({
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    to: new Date().toISOString().split("T")[0],
  });
  const [interval, setInterval] = useState("month");

  const { data: summary, isLoading: summaryLoading } = useQuery<Summary>({
    queryKey: ["/api/reports/summary", dateRange.from, dateRange.to],
    queryFn: async () => {
      const res = await fetch(`/api/reports/summary?from=${dateRange.from}&to=${dateRange.to}`);
      return res.json();
    },
  });

  const { data: revenueData = [], isLoading: revenueLoading } = useQuery<RevenueData[]>({
    queryKey: ["/api/reports/revenue-over-time", interval],
    queryFn: async () => {
      const res = await fetch(`/api/reports/revenue-over-time?interval=${interval}`);
      return res.json();
    },
  });

  const { data: dealsByStage = [], isLoading: stagesLoading } = useQuery<DealsByStage[]>({
    queryKey: ["/api/reports/deals-by-stage"],
    queryFn: async () => {
      const res = await fetch("/api/reports/deals-by-stage");
      return res.json();
    },
  });

  const { data: performanceData = [], isLoading: performanceLoading } = useQuery<PerformanceByRep[]>({
    queryKey: ["/api/reports/performance-by-rep"],
    queryFn: async () => {
      const res = await fetch("/api/reports/performance-by-rep");
      return res.json();
    },
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
  };

  const formatShortCurrency = (amount: number) => {
    if (amount >= 1000000) return `$${(amount / 1000000).toFixed(1)}M`;
    if (amount >= 1000) return `$${(amount / 1000).toFixed(1)}K`;
    return `$${amount.toFixed(0)}`;
  };

  if (summaryLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 h-full overflow-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Reports & Analytics</h1>
          <p className="text-muted-foreground">Track your sales performance</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Label>From</Label>
            <Input
              type="date"
              value={dateRange.from}
              onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
              className="w-40"
              data-testid="input-date-from"
            />
          </div>
          <div className="flex items-center gap-2">
            <Label>To</Label>
            <Input
              type="date"
              value={dateRange.to}
              onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
              className="w-40"
              data-testid="input-date-to"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card data-testid="card-pipeline-value">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pipeline Value</p>
                <p className="text-2xl font-bold">{formatCurrency(summary?.totalPipelineValue || 0)}</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-won-value">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Won Value</p>
                <p className="text-2xl font-bold">{formatCurrency(summary?.totalWonValue || 0)}</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-new-leads">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">New Leads</p>
                <p className="text-2xl font-bold">{summary?.newLeadsCount || 0}</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <Users className="h-5 w-5 text-purple-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-win-rate">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Win Rate</p>
                <p className="text-2xl font-bold">{summary?.winRate || 0}%</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                <Target className="h-5 w-5 text-orange-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Revenue Over Time</CardTitle>
            <Select value={interval} onValueChange={setInterval}>
              <SelectTrigger className="w-32" data-testid="select-interval">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="week">Weekly</SelectItem>
                <SelectItem value="month">Monthly</SelectItem>
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent>
            {revenueLoading ? (
              <Skeleton className="h-64" />
            ) : revenueData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="periodStart"
                    stroke="hsl(var(--muted-foreground))"
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                  />
                  <YAxis
                    stroke="hsl(var(--muted-foreground))"
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                    tickFormatter={(value) => formatShortCurrency(value)}
                  />
                  <Tooltip
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="totalWon"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={{ fill: "hsl(var(--primary))" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                No revenue data available
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Deals by Stage</CardTitle>
          </CardHeader>
          <CardContent>
            {stagesLoading ? (
              <Skeleton className="h-64" />
            ) : dealsByStage.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={dealsByStage} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    type="number"
                    stroke="hsl(var(--muted-foreground))"
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                  />
                  <YAxis
                    type="category"
                    dataKey="stageName"
                    stroke="hsl(var(--muted-foreground))"
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                    width={100}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                No deals data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Performance by Rep</CardTitle>
        </CardHeader>
        <CardContent>
          {performanceLoading ? (
            <Skeleton className="h-64" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sales Rep</TableHead>
                  <TableHead className="text-right">Total Deals</TableHead>
                  <TableHead className="text-right">Won Deals</TableHead>
                  <TableHead className="text-right">Win Rate</TableHead>
                  <TableHead className="text-right">Total Won</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {performanceData.map((rep) => (
                  <TableRow key={rep.userId} data-testid={`rep-row-${rep.userId}`}>
                    <TableCell className="font-medium">{rep.name}</TableCell>
                    <TableCell className="text-right">{rep.dealsCount}</TableCell>
                    <TableCell className="text-right">{rep.wonDealsCount}</TableCell>
                    <TableCell className="text-right">
                      {rep.dealsCount > 0 ? Math.round((rep.wonDealsCount / rep.dealsCount) * 100) : 0}%
                    </TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(rep.totalWon)}</TableCell>
                  </TableRow>
                ))}
                {performanceData.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      No performance data available
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
