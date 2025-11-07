import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/lib/supabase';
import { Loader2, Users, TrendingUp, AlertTriangle, Mail, Download } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

interface UserInsight {
  user_id: string;
  email: string;
  plan: string;
  total_bills: number;
  total_invoices: number;
  last_active: string | null;
}

export function UserInsightsTable() {
  const { toast } = useToast();
  const [insights, setInsights] = useState<UserInsight[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<string>('churn_risk_score');

  useEffect(() => {
    loadUserInsights();
  }, [sortBy]);

  const loadUserInsights = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_admin_user_insights');

      if (error) {
        console.error('Error loading user insights:', error);
        setInsights([]);
        return;
      }

      setInsights((data as UserInsight[]) || []);
    } catch (error) {
      console.error('Error loading user insights:', error);
      setInsights([]);
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    if (insights.length === 0) {
      toast({
        title: 'No Data',
        description: 'No user insights to export',
        variant: 'destructive',
      });
      return;
    }

    const headers = ['Email', 'Plan', 'Last Activity', 'Total Bills', 'Total Invoices'];
    const rows = insights.map(insight => [
      insight.email,
      insight.plan || 'free',
      insight.last_active ? format(new Date(insight.last_active), 'yyyy-MM-dd HH:mm') : 'Never',
      insight.total_bills.toString(),
      insight.total_invoices.toString(),
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `user-insights-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    toast({
      title: 'Export Complete',
      description: 'User insights exported to CSV',
    });
  };

  const getChurnRiskBadge = (score: number) => {
    if (score >= 70) return <Badge variant="destructive">High Risk</Badge>;
    if (score >= 40) return <Badge variant="secondary">Medium Risk</Badge>;
    return <Badge variant="outline">Low Risk</Badge>;
  };

  const getEngagementBadge = (score: number) => {
    if (score >= 70) return <Badge variant="default">High</Badge>;
    if (score >= 40) return <Badge variant="secondary">Medium</Badge>;
    return <Badge variant="outline">Low</Badge>;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              User Insights & Predictive Analytics
            </CardTitle>
            <CardDescription>
              Engagement scores, churn risk, and upsell opportunities
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="churn_risk_score">Sort by Churn Risk</SelectItem>
                <SelectItem value="engagement_score">Sort by Engagement</SelectItem>
                <SelectItem value="upsell_candidate">Sort by Upsell Potential</SelectItem>
                <SelectItem value="last_activity">Sort by Last Activity</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={exportToCSV} title="Export to CSV">
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : insights.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No user insights data available</p>
          </div>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Engagement</TableHead>
                  <TableHead>Churn Risk</TableHead>
                  <TableHead>Upsell</TableHead>
                  <TableHead>Last Activity</TableHead>
                  <TableHead>Bills</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {insights.map((insight) => (
                  <TableRow key={insight.user_id}>
                    <TableCell className="font-medium">{insight.email}</TableCell>
                    <TableCell>
                      <Badge variant={insight.plan === 'premium' ? 'default' : insight.plan === 'pro' ? 'secondary' : 'outline'}>
                        {insight.plan || 'free'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getEngagementBadge(insight.engagement_score)}
                        <span className="text-xs text-muted-foreground">
                          {insight.engagement_score}/100
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getChurnRiskBadge(insight.churn_risk_score)}
                        <span className="text-xs text-muted-foreground">
                          {insight.churn_risk_score}/100
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {insight.upsell_candidate ? (
                        <Badge variant="default" className="gap-1">
                          <TrendingUp className="h-3 w-3" />
                          Candidate
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      {insight.last_activity 
                        ? format(new Date(insight.last_activity), 'MMM dd, yyyy')
                        : 'Never'}
                    </TableCell>
                    <TableCell>{insight.total_bills}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            window.open(`mailto:${insight.email}?subject=InvoiceFlow%20Upgrade%20Offer`, '_blank');
                          }}
                          title="Send Email"
                        >
                          <Mail className="h-4 w-4" />
                        </Button>
                      </div>
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

