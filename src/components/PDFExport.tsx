import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useSupabaseData } from '@/hooks/useSupabaseData';
import { useTeams } from '@/hooks/useTeams';
import { useToast } from '@/hooks/use-toast';
import { RefreshCw, FileText, Download, BarChart3, DollarSign, Calendar, Users } from 'lucide-react';
import { format, parseISO, startOfMonth, endOfMonth, subMonths } from 'date-fns';

interface PDFExportProps {
  bills?: any[];
  teamId?: string;
}

const PDFExport = ({ bills, teamId }: PDFExportProps) => {
  const { bills: allBills, userPlan } = useSupabaseData();
  const { teams } = useTeams();
  const { toast } = useToast();
  
  const [isOpen, setIsOpen] = useState(false);
  const [reportType, setReportType] = useState<'analytics' | 'bills' | 'team'>('analytics');
  const [selectedTeam, setSelectedTeam] = useState(teamId || '');
  const [dateRange, setDateRange] = useState({ from: '', to: '' });
  const [includeCharts, setIncludeCharts] = useState(true);
  const [includeSummary, setIncludeSummary] = useState(true);
  const [includeDetails, setIncludeDetails] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);

  const billsToExport = bills || allBills;

  // Only show for Pro/Enterprise users
  if (userPlan?.plan === 'free') {
    return (
      <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10">
        <CardContent className="p-6 text-center">
          <FileText className="h-12 w-12 text-primary mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">PDF Export - Pro Feature</h3>
          <p className="text-muted-foreground mb-4">
            Generate professional PDF reports with charts, analytics, and detailed bill summaries.
          </p>
          <Button className="flex items-center gap-2">
            Upgrade to Pro
          </Button>
        </CardContent>
      </Card>
    );
  }

  const generatePDFReport = async () => {
    setIsGenerating(true);
    
    try {
      // Filter bills based on selected criteria
      let filteredBills = billsToExport;
      
      if (selectedTeam) {
        filteredBills = filteredBills.filter(bill => bill.team_id === selectedTeam);
      }
      
      if (dateRange.from && dateRange.to) {
        filteredBills = filteredBills.filter(bill => {
          const billDate = parseISO(bill.due_date);
          return billDate >= new Date(dateRange.from) && billDate <= new Date(dateRange.to);
        });
      }

      // Generate HTML content for PDF
      const htmlContent = generateReportHTML(filteredBills);
      
      // Create a new window for PDF generation
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        throw new Error('Pop-up blocked. Please allow pop-ups for this site.');
      }
      
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      
      // Trigger print dialog
      printWindow.focus();
      printWindow.print();
      
      // Close the window after printing
      printWindow.addEventListener('afterprint', () => {
        printWindow.close();
      });

      toast({
        title: "PDF Generated",
        description: "Your report is ready for download or printing",
      });
      
      setIsOpen(false);
    } catch (error: any) {
      toast({
        title: "Export Failed",
        description: error.message || "Failed to generate PDF report",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const generateReportHTML = (bills: any[]) => {
    const totalAmount = bills.reduce((sum, bill) => sum + Number(bill.amount), 0);
    const paidBills = bills.filter(bill => bill.status === 'paid');
    const overdueBills = bills.filter(bill => bill.status === 'overdue');
    const upcomingBills = bills.filter(bill => bill.status === 'unpaid');

    // Group by category
    const categoryTotals = bills.reduce((acc, bill) => {
      const amount = Number(bill.amount);
      acc[bill.category] = (acc[bill.category] || 0) + amount;
      return acc;
    }, {} as Record<string, number>);

    // Group by month
    const monthlyTotals = bills.reduce((acc, bill) => {
      const month = format(parseISO(bill.due_date), 'yyyy-MM');
      const amount = Number(bill.amount);
      acc[month] = (acc[month] || 0) + amount;
      return acc;
    }, {} as Record<string, number>);

    const selectedTeamName = selectedTeam ? teams.find(t => t.id === selectedTeam)?.name : 'All Teams';
    const reportTitle = reportType === 'team' ? `${selectedTeamName} Report` : 'Financial Analytics Report';
    const reportDate = new Date().toLocaleDateString();

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${reportTitle}</title>
        <style>
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            margin: 0;
            padding: 20px;
            color: #333;
            line-height: 1.6;
          }
          .header {
            text-align: center;
            border-bottom: 2px solid #e2e8f0;
            padding-bottom: 20px;
            margin-bottom: 30px;
          }
          .header h1 {
            color: #1e293b;
            font-size: 28px;
            margin-bottom: 5px;
          }
          .header p {
            color: #64748b;
            font-size: 14px;
          }
          .summary-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 20px;
            margin-bottom: 30px;
          }
          .summary-card {
            padding: 20px;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            text-align: center;
            background: #f8fafc;
          }
          .summary-card h3 {
            margin: 0 0 10px 0;
            color: #475569;
            font-size: 14px;
            text-transform: uppercase;
          }
          .summary-card .value {
            font-size: 24px;
            font-weight: bold;
            color: #1e293b;
          }
          .section {
            margin: 30px 0;
            page-break-inside: avoid;
          }
          .section h2 {
            color: #1e293b;
            border-bottom: 1px solid #e2e8f0;
            padding-bottom: 10px;
            margin-bottom: 20px;
          }
          .table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
          }
          .table th,
          .table td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #e2e8f0;
          }
          .table th {
            background: #f1f5f9;
            font-weight: 600;
            color: #475569;
          }
          .table tr:hover {
            background: #f8fafc;
          }
          .status-badge {
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: 500;
            text-transform: uppercase;
          }
          .status-paid {
            background: #dcfce7;
            color: #166534;
          }
          .status-unpaid {
            background: #dbeafe;
            color: #1d4ed8;
          }
          .status-overdue {
            background: #fee2e2;
            color: #dc2626;
          }
          .chart-section {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 30px;
            margin: 30px 0;
          }
          .chart-card {
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 20px;
          }
          .chart-card h3 {
            margin-top: 0;
            color: #1e293b;
          }
          .chart-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 8px 0;
            border-bottom: 1px solid #f1f5f9;
          }
          .chart-item:last-child {
            border-bottom: none;
          }
          .chart-bar {
            height: 20px;
            background: #3b82f6;
            border-radius: 4px;
            margin: 0 10px;
            min-width: 20px;
          }
          @media print {
            body {
              margin: 0;
              padding: 15px;
            }
            .page-break {
              page-break-before: always;
            }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${reportTitle}</h1>
          <p>Generated on ${reportDate}</p>
          ${dateRange.from && dateRange.to ? `<p>Period: ${dateRange.from} to ${dateRange.to}</p>` : ''}
          ${selectedTeam ? `<p>Team: ${selectedTeamName}</p>` : ''}
        </div>

        ${includeSummary ? `
        <div class="section">
          <h2>Summary</h2>
          <div class="summary-grid">
            <div class="summary-card">
              <h3>Total Bills</h3>
              <div class="value">${bills.length}</div>
            </div>
            <div class="summary-card">
              <h3>Total Amount</h3>
              <div class="value">$${totalAmount.toFixed(2)}</div>
            </div>
            <div class="summary-card">
              <h3>Paid Bills</h3>
              <div class="value">${paidBills.length}</div>
            </div>
            <div class="summary-card">
              <h3>Overdue Bills</h3>
              <div class="value">${overdueBills.length}</div>
            </div>
          </div>
        </div>
        ` : ''}

        ${includeCharts ? `
        <div class="section">
          <h2>Analytics</h2>
          <div class="chart-section">
            <div class="chart-card">
              <h3>Spending by Category</h3>
              ${Object.entries(categoryTotals).map(([category, amount]) => {
                const percentage = (amount / totalAmount) * 100;
                return `
                  <div class="chart-item">
                    <span>${category.charAt(0).toUpperCase() + category.slice(1)}</span>
                    <div style="display: flex; align-items: center; flex: 1;">
                      <div class="chart-bar" style="width: ${percentage}%;"></div>
                      <span style="margin-left: 10px;">$${amount.toFixed(2)}</span>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
            
            <div class="chart-card">
              <h3>Monthly Spending</h3>
              ${Object.entries(monthlyTotals).map(([month, amount]) => {
                const percentage = (amount / Math.max(...Object.values(monthlyTotals))) * 100;
                return `
                  <div class="chart-item">
                    <span>${format(new Date(month + '-01'), 'MMM yyyy')}</span>
                    <div style="display: flex; align-items: center; flex: 1;">
                      <div class="chart-bar" style="width: ${percentage}%;"></div>
                      <span style="margin-left: 10px;">$${amount.toFixed(2)}</span>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        </div>
        ` : ''}

        ${includeDetails ? `
        <div class="section page-break">
          <h2>Bill Details</h2>
          <table class="table">
            <thead>
              <tr>
                <th>Bill Name</th>
                <th>Amount</th>
                <th>Due Date</th>
                <th>Category</th>
                <th>Status</th>
                <th>Recurring</th>
              </tr>
            </thead>
            <tbody>
              ${bills.map(bill => `
                <tr>
                  <td>${bill.name}</td>
                  <td>$${Number(bill.amount).toFixed(2)}</td>
                  <td>${format(parseISO(bill.due_date), 'MMM dd, yyyy')}</td>
                  <td>${bill.category.charAt(0).toUpperCase() + bill.category.slice(1)}</td>
                  <td>
                    <span class="status-badge status-${bill.status}">
                      ${bill.status}
                    </span>
                  </td>
                  <td>${bill.recurring ? 'Yes' : 'No'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        ` : ''}

        <div class="section" style="margin-top: 50px; text-align: center; color: #64748b; font-size: 12px;">
          <p>Generated by InvoiceFlow - Professional Bill Management</p>
        </div>
      </body>
      </html>
    `;
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="flex items-center gap-2">
          <FileText className="h-4 w-4" />
          Export PDF
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Export PDF Report</DialogTitle>
          <DialogDescription>
            Generate a professional PDF report with analytics and bill details.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label>Report Type</Label>
            <Select value={reportType} onValueChange={(value: 'analytics' | 'bills' | 'team') => setReportType(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="analytics">Analytics Report</SelectItem>
                <SelectItem value="bills">Bills Summary</SelectItem>
                <SelectItem value="team">Team Report</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {reportType === 'team' && teams.length > 0 && (
            <div>
              <Label>Select Team</Label>
              <Select value={selectedTeam} onValueChange={setSelectedTeam}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose team..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Teams</SelectItem>
                  {teams.map(team => (
                    <SelectItem key={team.id} value={team.id}>
                      {team.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>From Date</Label>
              <Input
                type="date"
                value={dateRange.from}
                onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))}
              />
            </div>
            <div>
              <Label>To Date</Label>
              <Input
                type="date"
                value={dateRange.to}
                onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))}
              />
            </div>
          </div>

          <div className="space-y-3">
            <Label>Include in Report</Label>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="summary" 
                  checked={includeSummary}
                  onCheckedChange={(checked) => setIncludeSummary(!!checked)}
                />
                <Label htmlFor="summary" className="text-sm">Summary Statistics</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="charts" 
                  checked={includeCharts}
                  onCheckedChange={(checked) => setIncludeCharts(!!checked)}
                />
                <Label htmlFor="charts" className="text-sm">Charts & Analytics</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="details" 
                  checked={includeDetails}
                  onCheckedChange={(checked) => setIncludeDetails(!!checked)}
                />
                <Label htmlFor="details" className="text-sm">Detailed Bill List</Label>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
          <Button 
            onClick={generatePDFReport}
            disabled={isGenerating}
            className="flex items-center gap-2"
          >
            {isGenerating ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                Generate PDF
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PDFExport;