import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { Navigation } from '@/components/Navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { AlertCircle, RefreshCw, Eye, Filter } from 'lucide-react';
import { format } from 'date-fns';

interface AppLog {
  id: string;
  created_at: string;
  user_id: string | null;
  level: 'info' | 'warn' | 'error';
  event: string;
  route: string | null;
  component: string | null;
  action: string | null;
  message: string | null;
  error_name: string | null;
  error_message: string | null;
  stack: string | null;
  status_code: number | null;
  context: Record<string, any>;
}

const AdminLogs = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [logs, setLogs] = useState<AppLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [levelFilter, setLevelFilter] = useState<string>('all');
  const [selectedLog, setSelectedLog] = useState<AppLog | null>(null);

  useEffect(() => {
    fetchLogs();
  }, [levelFilter]);

  const fetchLogs = async () => {
    if (!isSupabaseConfigured || !supabase) {
      toast({
        title: 'Supabase not configured',
        description: 'Cannot fetch logs',
        variant: 'destructive',
      });
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      // Call the security definer function
      const { data, error } = await supabase.rpc('admin_get_logs', {
        p_level: levelFilter === 'all' ? null : levelFilter,
        p_limit: 200,
      });

      if (error) {
        console.error('Failed to fetch logs:', error);
        
        if (error.message.includes('Only admins')) {
          toast({
            title: 'Access Denied',
            description: 'You must be an admin to view logs',
            variant: 'destructive',
          });
        } else {
          throw error;
        }
        return;
      }

      setLogs((data || []).map(log => ({
        ...log,
        level: (log.level as 'info' | 'warn' | 'error') || 'info',
        context: (log.context || {}) as Record<string, any>
      })));
      console.log(`✅ Fetched ${data?.length || 0} logs`);
    } catch (error: any) {
      console.error('Error fetching logs:', error);
      toast({
        title: 'Failed to load logs',
        description: error.message || 'An error occurred',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getLevelBadgeVariant = (level: string) => {
    switch (level) {
      case 'error':
        return 'destructive';
      case 'warn':
        return 'secondary';
      default:
        return 'default';
    }
  };

  const getLevelEmoji = (level: string) => {
    switch (level) {
      case 'error':
        return '🔴';
      case 'warn':
        return '⚠️';
      default:
        return '📊';
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="container mx-auto p-4 space-y-6">
        {/* Header */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                Application Logs
              </CardTitle>
              <div className="flex items-center gap-2">
                <Select value={levelFilter} onValueChange={setLevelFilter}>
                  <SelectTrigger className="w-32">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Levels</SelectItem>
                    <SelectItem value="error">Errors</SelectItem>
                    <SelectItem value="warn">Warnings</SelectItem>
                    <SelectItem value="info">Info</SelectItem>
                  </SelectContent>
                </Select>
                <Button onClick={fetchLogs} disabled={loading} size="sm">
                  <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Logs Table */}
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center p-8">
                <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : logs.length === 0 ? (
              <div className="text-center p-8 text-muted-foreground">
                No logs found for the selected filter.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Time</TableHead>
                      <TableHead>Level</TableHead>
                      <TableHead>Event</TableHead>
                      <TableHead>Route</TableHead>
                      <TableHead>Component</TableHead>
                      <TableHead>Message</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="whitespace-nowrap text-xs">
                          {format(new Date(log.created_at), 'MMM dd, HH:mm:ss')}
                        </TableCell>
                        <TableCell>
                          <Badge variant={getLevelBadgeVariant(log.level)}>
                            {getLevelEmoji(log.level)} {log.level.toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-xs">{log.event}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {log.route || '-'}
                        </TableCell>
                        <TableCell className="text-xs">{log.component || '-'}</TableCell>
                        <TableCell className="max-w-xs truncate text-xs">
                          {log.error_name && (
                            <span className="font-semibold text-destructive">
                              {log.error_name}:{' '}
                            </span>
                          )}
                          {log.error_message || log.message || '-'}
                        </TableCell>
                        <TableCell>
                          {log.status_code && (
                            <Badge variant="outline">{log.status_code}</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setSelectedLog(log)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-3xl max-h-[80vh]">
                              <DialogHeader>
                                <DialogTitle>Log Details</DialogTitle>
                              </DialogHeader>
                              <ScrollArea className="h-[60vh] pr-4">
                                <div className="space-y-4">
                                  <div>
                                    <h4 className="font-semibold mb-1">Timestamp</h4>
                                    <p className="text-sm text-muted-foreground">
                                      {format(
                                        new Date(log.created_at),
                                        'PPpp'
                                      )}
                                    </p>
                                  </div>
                                  
                                  {log.error_message && (
                                    <div>
                                      <h4 className="font-semibold mb-1 text-destructive">
                                        Error Message
                                      </h4>
                                      <p className="text-sm bg-destructive/10 p-2 rounded">
                                        {log.error_message}
                                      </p>
                                    </div>
                                  )}
                                  
                                  {log.stack && (
                                    <div>
                                      <h4 className="font-semibold mb-1">Stack Trace</h4>
                                      <pre className="text-xs bg-muted p-3 rounded overflow-x-auto">
                                        {log.stack}
                                      </pre>
                                    </div>
                                  )}
                                  
                                  {log.context && Object.keys(log.context).length > 0 && (
                                    <div>
                                      <h4 className="font-semibold mb-1">Context</h4>
                                      <pre className="text-xs bg-muted p-3 rounded overflow-x-auto">
                                        {JSON.stringify(log.context, null, 2)}
                                      </pre>
                                    </div>
                                  )}
                                  
                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <h4 className="font-semibold mb-1">User ID</h4>
                                      <p className="text-xs font-mono text-muted-foreground">
                                        {log.user_id || 'anonymous'}
                                      </p>
                                    </div>
                                    <div>
                                      <h4 className="font-semibold mb-1">Route</h4>
                                      <p className="text-xs text-muted-foreground">
                                        {log.route || '-'}
                                      </p>
                                    </div>
                                    <div>
                                      <h4 className="font-semibold mb-1">Component</h4>
                                      <p className="text-xs text-muted-foreground">
                                        {log.component || '-'}
                                      </p>
                                    </div>
                                    <div>
                                      <h4 className="font-semibold mb-1">Action</h4>
                                      <p className="text-xs text-muted-foreground">
                                        {log.action || '-'}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              </ScrollArea>
                            </DialogContent>
                          </Dialog>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminLogs;
