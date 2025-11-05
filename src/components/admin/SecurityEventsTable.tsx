import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Shield, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';

interface SecurityEvent {
  id: string;
  event_type: string;
  user_id: string | null;
  ip_address: string | null;
  severity: 'low' | 'medium' | 'high' | 'critical';
  created_at: string;
  metadata: Record<string, any>;
}

export function SecurityEventsTable() {
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [eventCounts, setEventCounts] = useState({
    last24h: 0,
    critical: 0,
    high: 0,
  });

  useEffect(() => {
    loadSecurityEvents();
  }, [severityFilter]);

  // Poll every 30 seconds for new events
  useEffect(() => {
    const interval = setInterval(loadSecurityEvents, 30000);
    return () => clearInterval(interval);
  }, [severityFilter]);

  const loadSecurityEvents = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_security_events', {
        p_severity: severityFilter === 'all' ? null : severityFilter,
        p_limit: 100,
      });

      if (error) {
        console.error('Error loading security events:', error);
        setEvents([]);
        return;
      }

      setEvents(data || []);
      
      // Calculate counts
      const last24h = (data || []).length;
      const critical = (data || []).filter(e => e.severity === 'critical').length;
      const high = (data || []).filter(e => e.severity === 'high').length;
      
      setEventCounts({ last24h, critical, high });
    } catch (error) {
      console.error('Error loading security events:', error);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  const getSeverityBadgeVariant = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'destructive';
      case 'high':
        return 'destructive';
      case 'medium':
        return 'secondary';
      case 'low':
        return 'outline';
      default:
        return 'outline';
    }
  };

  const formatEventType = (eventType: string) => {
    return eventType
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Security Events (Last 24 Hours)
        </CardTitle>
        <CardDescription>
          Monitor security events and abuse detection
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="p-3 border rounded-lg">
            <div className="text-xs text-muted-foreground mb-1">Total Events</div>
            <div className="text-2xl font-bold">{eventCounts.last24h}</div>
          </div>
          <div className="p-3 border rounded-lg border-red-500/50 bg-red-50 dark:bg-red-950/20">
            <div className="text-xs text-muted-foreground mb-1">Critical</div>
            <div className="text-2xl font-bold text-red-600">{eventCounts.critical}</div>
          </div>
          <div className="p-3 border rounded-lg border-orange-500/50 bg-orange-50 dark:bg-orange-950/20">
            <div className="text-xs text-muted-foreground mb-1">High</div>
            <div className="text-2xl font-bold text-orange-600">{eventCounts.high}</div>
          </div>
        </div>

        {/* Filter */}
        <div className="mb-4">
          <Select value={severityFilter} onValueChange={setSeverityFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by severity" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Severities</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Events Table */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No security events in the last 24 hours</p>
            <p className="text-sm mt-2">Security events will appear here when detected</p>
          </div>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Event Type</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>User ID</TableHead>
                  <TableHead>IP Address</TableHead>
                  <TableHead>Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {events.map((event) => (
                  <TableRow key={event.id}>
                    <TableCell className="text-sm">
                      {format(new Date(event.created_at), 'MMM dd, HH:mm:ss')}
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatEventType(event.event_type)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getSeverityBadgeVariant(event.severity)}>
                        {event.severity}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {event.user_id ? event.user_id.slice(0, 8) + '...' : 'N/A'}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {event.ip_address || 'N/A'}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-xs truncate">
                      {JSON.stringify(event.metadata || {})}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

