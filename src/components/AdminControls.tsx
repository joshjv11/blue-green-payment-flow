import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useSupabaseData } from '@/hooks/useSupabaseData';
import { formatINRCompact } from '@/utils/currency';
import { useTeams } from '@/hooks/useTeams';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Shield, Users, BarChart3, Settings, Crown, Download, FileText, Calendar, DollarSign } from 'lucide-react';
import { format } from 'date-fns';

interface TeamStats {
  totalBills: number;
  totalAmount: number;
  overdueBills: number;
  activeMembers: number;
}

interface UserActivity {
  user_id: string;
  full_name?: string;
  email: string;
  last_login?: string;
  bill_count: number;
  total_spent: number;
}

const AdminControls = () => {
  const { bills, userPlan } = useSupabaseData();
  const { teams, teamMembers, hasTeamPermission } = useTeams();
  const { toast } = useToast();
  
  const [selectedTeam, setSelectedTeam] = useState<string>('');
  const [teamStats, setTeamStats] = useState<Record<string, TeamStats>>({});
  const [userActivities, setUserActivities] = useState<UserActivity[]>([]);
  const [loading, setLoading] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportDateRange, setReportDateRange] = useState({ from: '', to: '' });

  // Only show admin controls for Pro/Enterprise users who are team admins/owners
  const isAdmin = userPlan?.plan !== 'free' && teams.some(team => hasTeamPermission(team.id, 'admin'));

  useEffect(() => {
    if (isAdmin) {
      fetchTeamStats();
      fetchUserActivities();
    }
  }, [isAdmin, teams]);

  const fetchTeamStats = async () => {
    if (!teams.length) return;

    try {
      setLoading(true);
      const stats: Record<string, TeamStats> = {};

      for (const team of teams) {
        if (!hasTeamPermission(team.id, 'admin')) continue;

        // Get team bills
        const { data: teamBills, error } = await supabase
          .from('bills')
          .select('*')
          .eq('team_id', team.id);

        if (error) throw error;

        const totalAmount = teamBills?.reduce((sum, bill) => sum + Number(bill.amount), 0) || 0;
        const overdueBills = teamBills?.filter(bill => bill.status === 'overdue').length || 0;
        const activeMembers = teamMembers[team.id]?.length || 0;

        stats[team.id] = {
          totalBills: teamBills?.length || 0,
          totalAmount,
          overdueBills,
          activeMembers
        };
      }

      setTeamStats(stats);
    } catch (error: any) {
      console.error('Error fetching team stats:', error);
      toast({
        title: "Error",
        description: "Failed to load team statistics",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchUserActivities = async () => {
    if (!selectedTeam) return;

    try {
      setLoading(true);

      // Get team members with their profile information
      const members = teamMembers[selectedTeam] || [];
      const activities: UserActivity[] = [];

      for (const member of members) {
        // Get user's bills count and spending
        const { data: userBills } = await supabase
          .from('bills')
          .select('amount, status')
          .eq('user_id', member.user_id)
          .eq('team_id', selectedTeam);

        const billCount = userBills?.length || 0;
        const totalSpent = userBills?.reduce((sum, bill) => sum + Number(bill.amount), 0) || 0;

        activities.push({
          user_id: member.user_id,
          full_name: member.profiles?.full_name,
          email: member.profiles?.email || '',
          bill_count: billCount,
          total_spent: totalSpent,
        });
      }

      setUserActivities(activities);
    } catch (error: any) {
      console.error('Error fetching user activities:', error);
      toast({
        title: "Error",
        description: "Failed to load user activities",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const generateTeamReport = async () => {
    if (!selectedTeam || !reportDateRange.from || !reportDateRange.to) {
      toast({
        title: "Missing Information",
        description: "Please select a team and date range",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);

      // Fetch bills for the selected team within date range
      const { data: reportBills, error } = await supabase
        .from('bills')
        .select('*')
        .eq('team_id', selectedTeam)
        .gte('due_date', reportDateRange.from)
        .lte('due_date', reportDateRange.to)
        .order('due_date', { ascending: true });

      if (error) throw error;

      // Generate CSV data
      const csvHeaders = [
        'Bill Name',
        'Amount',
        'Due Date',
        'Category',
        'Status',
        'Recurring',
        'User Name',
        'User Email',
        'Created Date',
        'Updated Date'
      ];

      const csvData = [
        csvHeaders.join(','),
        ...(reportBills?.map(bill => [
          `"${bill.name}"`,
          bill.amount,
          bill.due_date,
          bill.category,
          bill.status,
          bill.recurring,
          '"N/A"',
          '"N/A"',
          format(new Date(bill.created_at), 'yyyy-MM-dd'),
          format(new Date(bill.updated_at), 'yyyy-MM-dd')
        ].join(',')) || [])
      ].join('\n');

      // Download CSV
      const blob = new Blob([csvData], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `team-report-${selectedTeam}-${reportDateRange.from}-to-${reportDateRange.to}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast({
        title: "Report Generated",
        description: "Team report has been downloaded",
      });

      setIsReportModalOpen(false);
    } catch (error: any) {
      console.error('Error generating report:', error);
      toast({
        title: "Error",
        description: "Failed to generate team report",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground mb-2">Admin Controls</h2>
          <p className="text-muted-foreground">Administrative tools for team management</p>
        </div>

        <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10">
          <CardContent className="p-8 text-center">
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <Shield className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Admin Access Required</h3>
            <p className="text-muted-foreground mb-6">
              Admin controls are available to Pro/Enterprise users with team administrator privileges.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="p-4 bg-background rounded-lg">
                <Users className="h-6 w-6 text-primary mb-2 mx-auto" />
                <p className="font-medium">Team Management</p>
              </div>
              <div className="p-4 bg-background rounded-lg">
                <BarChart3 className="h-6 w-6 text-primary mb-2 mx-auto" />
                <p className="font-medium">Usage Analytics</p>
              </div>
              <div className="p-4 bg-background rounded-lg">
                <FileText className="h-6 w-6 text-primary mb-2 mx-auto" />
                <p className="font-medium">Billing Reports</p>
              </div>
            </div>
            <div className="space-y-2">
              <Button className="flex items-center gap-2">
                <Crown className="h-4 w-4" />
                Upgrade to Pro
              </Button>
              <p className="text-sm text-muted-foreground">
                or create a team and get admin privileges
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground mb-2">Admin Controls</h2>
          <p className="text-muted-foreground">Manage teams, users, and generate reports</p>
        </div>
        
        <Dialog open={isReportModalOpen} onOpenChange={setIsReportModalOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              Generate Report
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Generate Team Report</DialogTitle>
              <DialogDescription>
                Export detailed billing reports for your team within a specific date range.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="report-team">Select Team</Label>
                <Select value={selectedTeam} onValueChange={setSelectedTeam}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose team..." />
                  </SelectTrigger>
                  <SelectContent>
                    {teams.filter(team => hasTeamPermission(team.id, 'admin')).map(team => (
                      <SelectItem key={team.id} value={team.id}>
                        {team.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="from-date">From Date</Label>
                  <Input
                    id="from-date"
                    type="date"
                    value={reportDateRange.from}
                    onChange={(e) => setReportDateRange(prev => ({ ...prev, from: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="to-date">To Date</Label>
                  <Input
                    id="to-date"
                    type="date"
                    value={reportDateRange.to}
                    onChange={(e) => setReportDateRange(prev => ({ ...prev, to: e.target.value }))}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsReportModalOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={generateTeamReport}
                disabled={loading || !selectedTeam || !reportDateRange.from || !reportDateRange.to}
              >
                <FileText className="h-4 w-4 mr-2" />
                {loading ? 'Generating...' : 'Generate CSV'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Team Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {teams.filter(team => hasTeamPermission(team.id, 'admin')).map(team => {
          const stats = teamStats[team.id];
          return (
            <Card key={team.id} className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => setSelectedTeam(team.id)}>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  {team.name}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Total Bills</span>
                  <span className="font-medium">{stats?.totalBills || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Total Amount</span>
                  <span className="font-medium">{formatINRCompact(stats?.totalAmount || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Overdue</span>
                  <Badge variant={stats?.overdueBills ? 'destructive' : 'secondary'}>
                    {stats?.overdueBills || 0}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Members</span>
                  <span className="font-medium">{stats?.activeMembers || 0}</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Team Selection and User Activities */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Team Selection</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label>Select Team to Manage</Label>
                  <Select value={selectedTeam} onValueChange={(value) => {
                    setSelectedTeam(value);
                    fetchUserActivities();
                  }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose team..." />
                    </SelectTrigger>
                    <SelectContent>
                      {teams.filter(team => hasTeamPermission(team.id, 'admin')).map(team => (
                        <SelectItem key={team.id} value={team.id}>
                          {team.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                {selectedTeam && teamStats[selectedTeam] && (
                  <div className="space-y-3 pt-4 border-t">
                    <h4 className="font-medium">Team Summary</h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span>{teamStats[selectedTeam].totalBills} Bills</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                        <span>{formatINRCompact(teamStats[selectedTeam].totalAmount)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-red-500" />
                        <span>{teamStats[selectedTeam].overdueBills} Overdue</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span>{teamStats[selectedTeam].activeMembers} Members</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Team Member Activity</CardTitle>
            </CardHeader>
            <CardContent>
              {selectedTeam ? (
                userActivities.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Member</TableHead>
                        <TableHead>Bills Created</TableHead>
                        <TableHead>Total Spending</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {userActivities.map((activity) => (
                        <TableRow key={activity.user_id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">
                                {activity.full_name || 'Unknown User'}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {activity.email}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>{activity.bill_count}</TableCell>
                          <TableCell>{formatINRCompact(activity.total_spent)}</TableCell>
                          <TableCell>
                            <Badge variant={activity.bill_count > 0 ? 'default' : 'secondary'}>
                              {activity.bill_count > 0 ? 'Active' : 'Inactive'}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8">
                    <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-foreground mb-2">No Activity Data</h3>
                    <p className="text-muted-foreground">
                      {loading ? 'Loading team activity...' : 'No member activity found for this team.'}
                    </p>
                  </div>
                )
              ) : (
                <div className="text-center py-8">
                  <Settings className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">Select a Team</h3>
                  <p className="text-muted-foreground">
                    Choose a team from the dropdown to view member activities and generate reports.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AdminControls;