import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { trackFeatureUsage } from '@/lib/analytics';
import { Download, Upload, FileText, Database, AlertCircle, CheckCircle } from 'lucide-react';
import { 
  exportBillsAsJSON, 
  exportBillsAsCSV, 
  downloadFile, 
  parseCSV, 
  parseJSON, 
  validateBillData 
} from '@/utils/exportImport';

interface Bill {
  id: string;
  user_id: string;
  name: string;
  amount: number;
  due_date: string;
  category: string;
  recurring: boolean;
  status: 'unpaid' | 'paid' | 'overdue';
  notes: string | null;
  created_at: string;
  updated_at: string;
}

interface ExportImportProps {
  bills: Bill[];
  onImportBills: (bills: Partial<Bill>[]) => void;
  userId: string;
}

const ExportImport: React.FC<ExportImportProps> = ({ bills, onImportBills, userId }) => {
  const { toast } = useToast();
  const [importing, setImporting] = useState(false);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);

  const handleExportJSON = () => {
    try {
      const jsonContent = exportBillsAsJSON(bills);
      const filename = `bills-export-${new Date().toISOString().split('T')[0]}.json`;
      downloadFile(jsonContent, filename, 'application/json');
      
      // Track export
      trackFeatureUsage('export', 'export', { format: 'json', count: bills.length });
      
      toast({
        title: "Export successful",
        description: `Downloaded ${bills.length} bills as JSON`,
      });
    } catch (error) {
      toast({
        title: "Export failed",
        description: "Failed to export bills as JSON",
        variant: "destructive",
      });
    }
  };

  const handleExportCSV = () => {
    try {
      const csvContent = exportBillsAsCSV(bills);
      const filename = `bills-export-${new Date().toISOString().split('T')[0]}.csv`;
      downloadFile(csvContent, filename, 'text/csv');
      
      // Track export
      trackFeatureUsage('export', 'export', { format: 'csv', count: bills.length });
      
      toast({
        title: "Export successful",
        description: `Downloaded ${bills.length} bills as CSV`,
      });
    } catch (error) {
      toast({
        title: "Export failed",
        description: "Failed to export bills as CSV",
        variant: "destructive",
      });
    }
  };

  const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setImportErrors([]);
    setImportSuccess(null);

    try {
      const content = await file.text();
      let parsedBills: Partial<Bill>[] = [];

      if (file.name.endsWith('.json')) {
        parsedBills = parseJSON(content);
      } else if (file.name.endsWith('.csv')) {
        parsedBills = parseCSV(content);
      } else {
        throw new Error('Unsupported file format. Please use CSV or JSON files.');
      }

      // Validate the parsed data
      const validationErrors = validateBillData(parsedBills);
      if (validationErrors.length > 0) {
        setImportErrors(validationErrors);
        return;
      }

      // Add missing fields
      const billsWithDefaults = parsedBills.map(bill => ({
        ...bill,
        id: bill.id || crypto.randomUUID(),
        user_id: userId,
        created_at: bill.created_at || new Date().toISOString(),
        updated_at: bill.updated_at || new Date().toISOString(),
        recurring: bill.recurring || false,
        notes: bill.notes || null
      })) as Bill[];

      onImportBills(billsWithDefaults);
      setImportSuccess(`Successfully imported ${billsWithDefaults.length} bills`);
      
      toast({
        title: "Import successful",
        description: `Imported ${billsWithDefaults.length} bills from ${file.name}`,
      });

      // Clear the input
      event.target.value = '';
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setImportErrors([errorMessage]);
      
      toast({
        title: "Import failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Export Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Export Bills
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Export all your bills and payment history to backup or transfer your data.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={handleExportJSON}
              disabled={bills.length === 0}
              className="flex items-center gap-2"
            >
              <Database className="h-4 w-4" />
              Export as JSON ({bills.length} bills)
            </Button>
            
            <Button
              onClick={handleExportCSV}
              disabled={bills.length === 0}
              variant="outline"
              className="flex items-center gap-2"
            >
              <FileText className="h-4 w-4" />
              Export as CSV ({bills.length} bills)
            </Button>
          </div>

          {bills.length === 0 && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                No bills to export. Add some bills first.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Import Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Import Bills
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Import bills from a CSV or JSON file. The file should include columns for name, amount, due_date, category, and status.
          </p>
          
          <div className="space-y-2">
            <Label htmlFor="file-import">Choose file (CSV or JSON)</Label>
            <Input
              id="file-import"
              type="file"
              accept=".csv,.json"
              onChange={handleFileImport}
              disabled={importing}
            />
          </div>

          {importing && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Processing file...
              </AlertDescription>
            </Alert>
          )}

          {importSuccess && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                {importSuccess}
              </AlertDescription>
            </Alert>
          )}

          {importErrors.length > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-1">
                  <p className="font-medium">Import failed with the following errors:</p>
                  <ul className="list-disc list-inside space-y-1">
                    {importErrors.map((error, index) => (
                      <li key={index} className="text-sm">{error}</li>
                    ))}
                  </ul>
                </div>
              </AlertDescription>
            </Alert>
          )}

          <div className="bg-muted p-4 rounded-lg">
            <h4 className="text-sm font-medium mb-2">Required CSV columns:</h4>
            <div className="text-xs text-muted-foreground space-y-1">
              <p><strong>name:</strong> Bill name (text)</p>
              <p><strong>amount:</strong> Amount in dollars (number)</p>
              <p><strong>due_date:</strong> Due date (YYYY-MM-DD format)</p>
              <p><strong>category:</strong> utilities, rent, insurance, subscription, loan, credit_card, or other</p>
              <p><strong>status:</strong> unpaid, paid, or overdue</p>
              <p><strong>recurring:</strong> true or false (optional)</p>
              <p><strong>notes:</strong> Additional notes (optional)</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ExportImport;