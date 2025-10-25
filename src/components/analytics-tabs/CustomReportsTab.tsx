import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, Download, Calendar as CalendarIcon, Filter, Plus } from 'lucide-react';
import { format } from 'date-fns';

const CustomReportsTab = () => {
  const [dateFrom, setDateFrom] = useState<Date>();
  const [dateTo, setDateTo] = useState<Date>();

  const savedReports = [
    {
      id: 1,
      name: 'Monthly Sales Report',
      type: 'Sales',
      schedule: 'Monthly',
      lastRun: '2024-06-01',
      format: 'PDF',
    },
    {
      id: 2,
      name: 'Inventory Valuation',
      type: 'Inventory',
      schedule: 'Weekly',
      lastRun: '2024-06-15',
      format: 'Excel',
    },
    {
      id: 3,
      name: 'Customer Lifetime Value',
      type: 'Customers',
      schedule: 'Quarterly',
      lastRun: '2024-04-01',
      format: 'PDF',
    },
    {
      id: 4,
      name: 'Profit & Loss Statement',
      type: 'Financial',
      schedule: 'Monthly',
      lastRun: '2024-06-01',
      format: 'PDF',
    },
  ];

  const reportTemplates = [
    { name: 'Sales Performance', category: 'Sales', fields: 12 },
    { name: 'Inventory Analysis', category: 'Inventory', fields: 8 },
    { name: 'Customer Insights', category: 'Customers', fields: 15 },
    { name: 'Financial Summary', category: 'Financial', fields: 10 },
    { name: 'Product Performance', category: 'Products', fields: 9 },
    { name: 'Order Analysis', category: 'Orders', fields: 11 },
  ];

  return (
    <div className="space-y-6">
      {/* Report Builder */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Create Custom Report
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Report Type */}
            <div>
              <label className="text-sm font-medium mb-2 block">Report Type</label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select report type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sales">Sales Report</SelectItem>
                  <SelectItem value="inventory">Inventory Report</SelectItem>
                  <SelectItem value="customer">Customer Report</SelectItem>
                  <SelectItem value="financial">Financial Report</SelectItem>
                  <SelectItem value="custom">Custom Report</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Format */}
            <div>
              <label className="text-sm font-medium mb-2 block">Export Format</label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select format" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pdf">PDF</SelectItem>
                  <SelectItem value="excel">Excel (.xlsx)</SelectItem>
                  <SelectItem value="csv">CSV</SelectItem>
                  <SelectItem value="json">JSON</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">From Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateFrom ? format(dateFrom, 'PPP') : 'Select date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={dateFrom} onSelect={setDateFrom} />
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">To Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateTo ? format(dateTo, 'PPP') : 'Select date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={dateTo} onSelect={setDateTo} />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button className="flex-1">
              <FileText className="h-4 w-4 mr-2" />
              Generate Report
            </Button>
            <Button variant="outline">
              <Filter className="h-4 w-4 mr-2" />
              Advanced Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Report Templates */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Templates</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {reportTemplates.map((template) => (
              <button
                key={template.name}
                className="p-4 border rounded-lg text-left hover:border-primary transition-colors"
              >
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-semibold">{template.name}</h4>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground mb-2">{template.category}</p>
                <Badge variant="outline" className="text-xs">
                  {template.fields} fields
                </Badge>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Saved Reports */}
      <Card>
        <CardHeader>
          <CardTitle>Saved Reports</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {savedReports.map((report) => (
              <div
                key={report.id}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium">{report.name}</h4>
                    <Badge variant="secondary">{report.type}</Badge>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>Schedule: {report.schedule}</span>
                    <span>Last run: {report.lastRun}</span>
                    <span>Format: {report.format}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    Run Now
                  </Button>
                  <Button variant="ghost" size="sm">
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Report Schedule */}
      <Card>
        <CardHeader>
          <CardTitle>Scheduled Reports</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <p className="font-medium">Daily Sales Summary</p>
                <p className="text-sm text-muted-foreground">Delivered to email at 9:00 AM</p>
              </div>
              <Badge variant="default">Active</Badge>
            </div>
            
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <p className="font-medium">Weekly Inventory Report</p>
                <p className="text-sm text-muted-foreground">Delivered every Monday at 8:00 AM</p>
              </div>
              <Badge variant="default">Active</Badge>
            </div>
            
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <p className="font-medium">Monthly P&L Statement</p>
                <p className="text-sm text-muted-foreground">Delivered on 1st of each month</p>
              </div>
              <Badge variant="outline">Paused</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CustomReportsTab;
