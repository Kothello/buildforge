import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { authedFetch } from "@/lib/authedFetch";
import { normalizeArray } from "@/lib/normalize";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { 
  Calendar as CalendarIcon, 
  Plus, 
  CheckCircle2, 
  AlertCircle, 
  ChevronLeft, 
  ChevronRight,
  Clock,
  User,
  List,
  CalendarDays
} from "lucide-react";
import { useState, useMemo } from "react";
import { Link } from "wouter";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isToday, isPast, addMonths, subMonths, addDays, startOfDay, endOfDay } from "date-fns";
import { useLeadNavigation } from "@/hooks/useLeadNavigation";

interface Callback {
  id: string;
  leadId: string;
  scheduledAt: string;
  completed: boolean;
  notes?: string;
  lead?: {
    id: string;
    companyName?: string;
    contactName?: string;
    firstName?: string;
    lastName?: string;
    state?: string;
  };
  user?: {
    name: string;
  };
}

interface Lead {
  id: string;
  companyName?: string;
  contactName?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
}

interface ScheduleFormData {
  leadId: string;
  scheduledAt: string;
  notes: string;
}

interface EditFormData {
  scheduledAt: string;
  notes: string;
  completed?: boolean;
}

export default function CallbackCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<'month' | 'list'>('month');
  const [filter, setFilter] = useState<'all' | 'today' | 'next7days'>('all');
  const [listSort, setListSort] = useState<'time' | 'name'>('time');
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedCallback, setSelectedCallback] = useState<Callback | null>(null);
  const [formData, setFormData] = useState<ScheduleFormData>({
    leadId: '',
    scheduledAt: '',
    notes: ''
  });
  const [editFormData, setEditFormData] = useState<EditFormData>({
    scheduledAt: '',
    notes: '',
    completed: false
  });
  
  const { getLeadPath } = useLeadNavigation();
  
  const { data: callbacksResponse, isLoading } = useQuery<Callback[]>({
    queryKey: ["/api/callbacks"],
    queryFn: () => authedFetch("/api/callbacks").then(r => r.json()),
  });
  
  // Defensive: ensure callbacks is always an array
  const callbacks = Array.isArray(callbacksResponse) 
    ? callbacksResponse 
    : (callbacksResponse as any)?.callbacks ?? [];

  const { data: leads = [] } = useQuery<Lead[]>({
    queryKey: ["/api/leads"],
    queryFn: async () => {
      const res = await fetch("/api/leads", { credentials: 'include' });
      if (!res.ok) return [];
      const data = await res.json();
      return normalizeArray<Lead>(data);
    },
  });

  // Helper function to get display name for a callback
  // BUGFIX: Prioritize company name so callbacks show business context
  // Format: "Company Name" or "Company Name (Contact)" or just "Contact Name"
  function getCallbackDisplayName(cb: Callback): string {
    const embeddedLead = cb.lead;
    const listLead = leads.find((l) => l.id === cb.leadId);
    const lead = embeddedLead || listLead;
    if (!lead) return "Lead";
    
    const companyName = lead.companyName?.trim();
    const contactName = lead.contactName?.trim();
    const first = lead.firstName?.trim() || "";
    const last = lead.lastName?.trim() || "";
    const fullName = `${first} ${last}`.trim();
    
    // Prefer company name with optional contact in parentheses
    if (companyName) {
      const contact = contactName || fullName;
      if (contact && contact !== companyName) {
        return `${companyName} (${contact})`;
      }
      return companyName;
    }
    
    // Fallback to contact name if no company
    if (contactName) return contactName;
    if (fullName) return fullName;
    return "Lead";
  }

  const completeMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest("PATCH", `/api/callbacks/${id}`, { completed: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/callbacks"] });
    },
  });

  const scheduleMutation = useMutation({
    mutationFn: (data: ScheduleFormData) =>
      apiRequest("POST", "/api/callbacks", {
        leadId: data.leadId,
        scheduledAt: data.scheduledAt,
        notes: data.notes,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/callbacks"] });
      queryClient.invalidateQueries({ queryKey: ["crm-callbacks"] });
      setShowScheduleDialog(false);
      setFormData({ leadId: '', scheduledAt: '', notes: '' });
    },
  });

  const editMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: EditFormData }) =>
      apiRequest("PATCH", `/api/callbacks/${id}`, data),
    onSuccess: (_, variables) => {
      // Invalidate callback queries
      queryClient.invalidateQueries({ queryKey: ["/api/callbacks"] });
      queryClient.invalidateQueries({ queryKey: ["crm-callbacks"] });
      
      // BUGFIX: Invalidate lead history so "History" section updates after saving callback notes
      // The backend creates a lead history entry (server/routes/callbackRoutes.ts:179-196)
      // but the frontend wasn't invalidating the history query, so changes didn't appear
      if (selectedCallback?.leadId) {
        queryClient.invalidateQueries({ queryKey: ["/api/leads", selectedCallback.leadId, "history"] });
        queryClient.invalidateQueries({ queryKey: ["/api/leads", selectedCallback.leadId] });
      }
      
      setShowEditDialog(false);
      setSelectedCallback(null);
    },
  });

  // Generate calendar days
  const calendarDays = useMemo(() => {
    const start = startOfMonth(currentDate);
    const end = endOfMonth(currentDate);
    const days = eachDayOfInterval({ start, end });
    
    // Pad beginning to start on Sunday
    const startDay = start.getDay();
    const paddingDays = Array(startDay).fill(null);
    
    return [...paddingDays, ...days];
  }, [currentDate]);

  // Filter callbacks based on selected filter
  // Must be defined before useMemo calls that use it
  const getFilteredCallbacks = () => {
    const now = new Date();
    const todayStart = startOfDay(now);
    const todayEnd = endOfDay(now);
    const next7DaysEnd = endOfDay(addDays(now, 7));
    
    let filtered = callbacks.filter((cb: Callback) => !cb.completed);
    
    if (filter === 'today') {
      filtered = filtered.filter((cb: Callback) => {
        const cbDate = new Date(cb.scheduledAt);
        return cbDate >= todayStart && cbDate <= todayEnd;
      });
    } else if (filter === 'next7days') {
      filtered = filtered.filter((cb: Callback) => {
        const cbDate = new Date(cb.scheduledAt);
        return cbDate >= now && cbDate <= next7DaysEnd;
      });
    } else {
      // 'all' - show all non-completed callbacks (including overdue)
      filtered = filtered;
    }
    
    return filtered;
  };

  // Group callbacks by date (respecting filter)
  const callbacksByDate = useMemo(() => {
    const grouped: Record<string, Callback[]> = {};
    const filtered = getFilteredCallbacks();
    filtered.forEach((cb: Callback) => {
      const dateKey = format(new Date(cb.scheduledAt), 'yyyy-MM-dd');
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(cb);
    });
    return grouped;
  }, [callbacks, filter]);

  // Get callbacks for a specific day
  const getCallbacksForDay = (day: Date) => {
    const dateKey = format(day, 'yyyy-MM-dd');
    return callbacksByDate[dateKey] || [];
  };

  // Get callback color based on status
  const getCallbackColor = (callback: Callback) => {
    const scheduledDate = new Date(callback.scheduledAt);
    if (callback.completed) return 'bg-gray-400';
    if (isPast(scheduledDate) && !isToday(scheduledDate)) return 'bg-red-500';
    if (isToday(scheduledDate)) return 'bg-orange-500';
    return 'bg-blue-500';
  };

  const upcomingCallbacks = useMemo(() => {
    let filtered = getFilteredCallbacks();
    
    // Sort by time or name
    if (listSort === 'time') {
      filtered.sort((a: Callback, b: Callback) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
    } else {
      filtered.sort((a: Callback, b: Callback) => {
        const nameA = a.lead?.companyName || '';
        const nameB = b.lead?.companyName || '';
        return nameA.localeCompare(nameB);
      });
    }
    
    return filtered;
  }, [callbacks, filter, listSort]);

  const handleScheduleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.leadId && formData.scheduledAt) {
      scheduleMutation.mutate(formData);
    }
  };

  const resetForm = () => {
    setFormData({ leadId: '', scheduledAt: '', notes: '' });
    setShowScheduleDialog(false);
  };

  const handleCallbackClick = (callback: Callback, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Don't open edit dialog for completed callbacks - just navigate to lead
    if (callback.completed) {
      return;
    }
    
    setSelectedCallback(callback);
    setEditFormData({
      scheduledAt: format(new Date(callback.scheduledAt), "yyyy-MM-dd'T'HH:mm"),
      notes: callback.notes || '',
      completed: callback.completed
    });
    setShowEditDialog(true);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCallback) return;
    
    editMutation.mutate({
      id: selectedCallback.id,
      data: editFormData
    });
  };

  const resetEditForm = () => {
    setEditFormData({ scheduledAt: '', notes: '', completed: false });
    setSelectedCallback(null);
    setShowEditDialog(false);
  };

  const handleDayClick = (day: Date) => {
    // Format date to datetime-local input format (YYYY-MM-DDTHH:MM)
    // Default to 9:00 AM
    const defaultTime = new Date(day);
    defaultTime.setHours(9, 0, 0, 0);
    const formatted = format(defaultTime, "yyyy-MM-dd'T'HH:mm");
    
    setFormData({ leadId: '', scheduledAt: formatted, notes: '' });
    setShowScheduleDialog(true);
  };

  return (
    <div className="h-full overflow-auto p-3 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-2">
          <CalendarIcon className="w-5 h-5 text-primary" />
          <h1 className="text-2xl font-bold">Callback Calendar</h1>
        </div>
        <div className="flex items-center gap-2">
          {/* View Toggle */}
          <div className="flex gap-1 border rounded-lg p-1">
            <Button
              variant={view === 'month' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setView('month')}
              className="gap-1.5 text-xs"
            >
              <CalendarDays className="h-3 w-3" />
              Month
            </Button>
            <Button
              variant={view === 'list' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setView('list')}
              className="gap-1.5 text-xs"
            >
              <List className="h-3 w-3" />
              List
            </Button>
          </div>
          <Button 
            size="sm" 
            variant="default"
            onClick={() => setShowScheduleDialog(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            Schedule
          </Button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="flex gap-2">
          <Button
            variant={filter === 'today' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('today')}
          >
            Today
          </Button>
          <Button
            variant={filter === 'next7days' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('next7days')}
          >
            Next 7 Days
          </Button>
          <Button
            variant={filter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('all')}
          >
            All
          </Button>
        </div>

        {view === 'list' && (
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-sm text-muted-foreground">Sort by:</span>
            <Select value={listSort} onValueChange={(value: 'time' | 'name') => setListSort(value)}>
              <SelectTrigger className="w-[130px] h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="time">Time</SelectItem>
                <SelectItem value="name">Lead Name</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-card/50 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : view === 'list' ? (
        /* List View */
        upcomingCallbacks.length === 0 ? (
          <Card className="bg-card/50 backdrop-blur-sm">
            <CardContent className="pt-8 pb-8 text-center text-muted-foreground">
              <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No upcoming callbacks scheduled</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 sm:gap-4">
            {upcomingCallbacks.map((callback: Callback) => {
              const scheduledDate = new Date(callback.scheduledAt);
              const isOverdue = isPast(scheduledDate) && !isToday(scheduledDate);
              const isTodayCallback = isToday(scheduledDate);
              
              return (
                <Card 
                  key={callback.id} 
                  className={`
                    bg-card/50 backdrop-blur-sm hover:shadow-lg transition-all
                    ${isOverdue ? 'border-red-500/50 bg-red-500/5' : ''}
                    ${isTodayCallback ? 'border-orange-500/50 bg-orange-500/5' : ''}
                  `}
                >
                  <CardContent className="pt-4 pb-4">
                    <div className="flex items-start gap-3">
                      {/* Checkbox for quick complete */}
                      <div className="pt-1">
                        <input
                          type="checkbox"
                          checked={callback.completed}
                          onChange={() => completeMutation.mutate(callback.id)}
                          disabled={completeMutation.isPending}
                          className="w-4 h-4 cursor-pointer"
                          title="Mark as complete"
                        />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <Link href={getLeadPath(callback.leadId)}>
                            <h3 className="font-semibold text-sm sm:text-base truncate hover:underline cursor-pointer">
                              {callback.lead?.companyName || "Lead"}
                            </h3>
                          </Link>
                          {isOverdue && (
                            <Badge variant="destructive" className="flex-shrink-0">
                              Overdue
                            </Badge>
                          )}
                          {isTodayCallback && (
                            <Badge className="flex-shrink-0 bg-orange-500">
                              Today
                            </Badge>
                          )}
                          {!isOverdue && !isTodayCallback && (
                            <Badge variant={callback.completed ? "outline" : "default"} className="flex-shrink-0">
                              {callback.completed ? "Done" : "Upcoming"}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-xs sm:text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {format(scheduledDate, 'MMM d, yyyy h:mm a')}
                          </div>
                          {callback.lead?.contactName && (
                            <div className="flex items-center gap-1">
                              <User className="w-3 h-3" />
                              {callback.lead.contactName}
                            </div>
                          )}
                        </div>
                        {callback.notes && (
                          <p className="text-xs sm:text-sm text-foreground mt-2">
                            {callback.notes}
                          </p>
                        )}
                      </div>
                      
                      {!callback.completed && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedCallback(callback);
                            setEditFormData({
                              scheduledAt: format(scheduledDate, "yyyy-MM-dd'T'HH:mm"),
                              notes: callback.notes || '',
                              completed: callback.completed
                            });
                            setShowEditDialog(true);
                          }}
                          className="flex-shrink-0"
                        >
                          Edit
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )
      ) : (
        /* Month Calendar View */
        <Card className="bg-card/50 backdrop-blur-sm">
          <CardContent className="pt-6">
            {/* Calendar Header */}
            <div className="flex items-center justify-between mb-6">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentDate(subMonths(currentDate, 1))}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <h2 className="text-xl font-bold">
                {format(currentDate, 'MMMM yyyy')}
              </h2>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentDate(addMonths(currentDate, 1))}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-2">
              {/* Day headers */}
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                <div key={day} className="text-center font-semibold text-sm py-2">
                  {day}
                </div>
              ))}

              {/* Calendar days */}
              {calendarDays.map((day, index) => {
                if (!day) {
                  return <div key={`empty-${index}`} className="min-h-[100px]" />;
                }

                const dayCallbacks = getCallbacksForDay(day);
                const isCurrentMonth = isSameMonth(day, currentDate);
                const isDayToday = isToday(day);

                return (
                  <div
                    key={day.toISOString()}
                    className={`
                      min-h-[100px] border rounded-lg p-2 transition-all
                      ${isCurrentMonth ? 'bg-background' : 'bg-muted/30'}
                      ${isDayToday ? 'ring-2 ring-primary' : ''}
                      hover:shadow-md cursor-pointer
                    `}
                    onClick={(e) => {
                      // Only open schedule dialog if clicking on empty space (not on a callback)
                      if (e.target === e.currentTarget || (e.target as HTMLElement).classList.contains('day-header')) {
                        handleDayClick(day);
                      }
                    }}
                  >
                    <div 
                      className={`
                        day-header text-sm font-semibold mb-1
                        ${isDayToday ? 'text-primary' : ''}
                        ${!isCurrentMonth ? 'text-muted-foreground' : ''}
                      `}
                    >
                      {format(day, 'd')}
                    </div>

                    {/* Callbacks for this day */}
                    <div className="space-y-1">
                      {dayCallbacks.slice(0, 3).map((callback) => {
                        const scheduledDate = new Date(callback.scheduledAt);
                        const isOverdue = isPast(scheduledDate) && !isToday(scheduledDate);
                        const isTodayCallback = isToday(scheduledDate);
                        
                        return (
                          <div
                            key={callback.id}
                            className={`
                              text-xs p-1 rounded cursor-pointer
                              hover:opacity-80 transition-opacity
                              ${getCallbackColor(callback)} text-white
                              ${isOverdue && !callback.completed ? 'ring-1 ring-red-300 ring-offset-1' : ''}
                              ${isTodayCallback && !callback.completed ? 'ring-1 ring-orange-300 ring-offset-1' : ''}
                            `}
                            title={`${getCallbackDisplayName(callback)} - ${format(scheduledDate, 'h:mm a')}${callback.completed ? ' (Completed)' : isOverdue ? ' (Overdue - Click to edit)' : ' - Click to edit'}`}
                            onClick={(e) => handleCallbackClick(callback, e)}
                          >
                            <div className="truncate font-medium">
                              {format(scheduledDate, 'h:mm a')}
                              {isOverdue && !callback.completed && ' ⚠️'}
                            </div>
                            <div className="truncate">
                              {getCallbackDisplayName(callback)}
                            </div>
                          </div>
                        );
                      })}
                      {dayCallbacks.length > 3 && (
                        <div className="text-xs text-muted-foreground text-center">
                          +{dayCallbacks.length - 3} more
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Legend */}
            <div className="flex flex-wrap items-center gap-4 mt-6 pt-4 border-t">
              <div className="text-sm font-medium">Legend:</div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-red-500"></div>
                <span className="text-xs">Overdue</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-orange-500"></div>
                <span className="text-xs">Today</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-blue-500"></div>
                <span className="text-xs">Upcoming</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-gray-400"></div>
                <span className="text-xs">Completed</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Schedule Callback Dialog */}
      <Dialog open={showScheduleDialog} onOpenChange={setShowScheduleDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Schedule Callback</DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleScheduleSubmit} className="space-y-4">
            <div>
              <label htmlFor="lead" className="text-sm font-medium">
                Lead
              </label>
              <Select
                value={formData.leadId}
                onValueChange={(value) => setFormData(prev => ({ ...prev, leadId: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a lead..." />
                </SelectTrigger>
                <SelectContent>
                  {leads.map((lead) => (
                    <SelectItem key={lead.id} value={lead.id}>
                      <div className="flex flex-col">
                        <span className="font-medium">{lead.companyName}</span>
                        <span className="text-xs text-muted-foreground">
                          {lead.contactName}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label htmlFor="scheduledAt" className="text-sm font-medium">
                Date & Time
              </label>
              <Input
                id="scheduledAt"
                type="datetime-local"
                value={formData.scheduledAt}
                onChange={(e) => setFormData(prev => ({ ...prev, scheduledAt: e.target.value }))}
                required
              />
            </div>

            <div>
              <label htmlFor="notes" className="text-sm font-medium">
                Notes (optional)
              </label>
              <Textarea
                id="notes"
                placeholder="Add any notes about this callback..."
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                rows={3}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={resetForm}
                disabled={scheduleMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!formData.leadId || !formData.scheduledAt || scheduleMutation.isPending}
              >
                {scheduleMutation.isPending ? "Scheduling..." : "Schedule Callback"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Callback Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Callback</DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleEditSubmit} className="space-y-4">
            {selectedCallback && (
              <div className="bg-muted p-3 rounded-lg">
                <div className="text-sm font-medium">{getCallbackDisplayName(selectedCallback)}</div>
                <div className="text-xs text-muted-foreground">
                  {selectedCallback.lead?.companyName || 'Company not available'}
                </div>
              </div>
            )}

            <div>
              <label htmlFor="edit-scheduledAt" className="text-sm font-medium">
                Date & Time
              </label>
              <Input
                id="edit-scheduledAt"
                type="datetime-local"
                value={editFormData.scheduledAt}
                onChange={(e) => setEditFormData(prev => ({ ...prev, scheduledAt: e.target.value }))}
                required
              />
            </div>

            <div>
              <label htmlFor="edit-notes" className="text-sm font-medium">
                Notes
              </label>
              <Textarea
                id="edit-notes"
                placeholder="Add any notes about this callback..."
                value={editFormData.notes}
                onChange={(e) => setEditFormData(prev => ({ ...prev, notes: e.target.value }))}
                rows={3}
              />
            </div>

            <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
              <input
                type="checkbox"
                id="edit-completed"
                checked={editFormData.completed}
                onChange={(e) => setEditFormData(prev => ({ ...prev, completed: e.target.checked }))}
                className="w-4 h-4"
              />
              <label htmlFor="edit-completed" className="text-sm cursor-pointer">
                Mark as completed
              </label>
            </div>

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={resetEditForm}
                disabled={editMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  if (selectedCallback) {
                    window.location.href = getLeadPath(selectedCallback.leadId);
                  }
                }}
                disabled={editMutation.isPending}
              >
                View Lead
              </Button>
              <Button
                type="submit"
                disabled={!editFormData.scheduledAt || editMutation.isPending}
              >
                {editMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
