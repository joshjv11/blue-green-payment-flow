import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { useSupabaseData } from '@/hooks/useSupabaseData';
import { Upload, Download, CheckCircle, XCircle, AlertTriangle, FileText } from 'lucide-react';

interface BulkOperationResult {
  success: boolean;
  row: number;
  message: string;
  data?: any;
}

const BulkBillOperations = () => {
  const { addBill, bills } = useSupabaseData();
  const { toast } = useToast();
  
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importResults, setImportResults] = useState<BulkOperationResult[]>([]);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [importProgress, setImportProgress] = useState(0);

  // CSV template structure
  const csvTemplate = [
    'name,amount,due_date,category,recurring,notes',
    'Electric Bill,120.50,2024-02-15,utilities,true,Monthly electric bill',
    'Internet Service,79.99,2024-02-10,utilities,true,Monthly internet',
    'Car Insurance,250.00,2024-02-20,insurance,false,Semi-annual payment'
  ];

  const validateCsvRow = (row: any, rowIndex: number): { valid: boolean; errors: string[] } => {
    const errors: string[] = [];
    
    // Required fields
    if (!row.name?.trim()) {
      errors.push(`Row ${rowIndex}: Bill name is required`);
    }
    
    if (!row.amount || isNaN(parseFloat(row.amount))) {
      errors.push(`Row ${rowIndex}: Valid amount is required`);
    }
    
    if (!row.due_date) {
      errors.push(`Row ${rowIndex}: Due date is required`);
    } else {
      const date = new Date(row.due_date);
      if (isNaN(date.getTime())) {
        errors.push(`Row ${rowIndex}: Invalid due date format (use YYYY-MM-DD)`);
      }
    }
    
    if (!row.category?.trim()) {
      errors.push(`Row ${rowIndex}: Category is required`);
    }
    
    // Validate category values
    const validCategories = ['utilities', 'rent', 'insurance', 'subscription', 'loan', 'credit_card', 'other'];
    if (row.category && !validCategories.includes(row.category.toLowerCase())) {
      errors.push(`Row ${rowIndex}: Category must be one of: ${validCategories.join(', ')}`);
    }
    
    // Validate recurring field
    if (row.recurring && !['true', 'false', '1', '0', 'yes', 'no'].includes(row.recurring.toLowerCase())) {
      errors.push(`Row ${rowIndex}: Recurring must be true/false or yes/no`);
    }
    
    return { valid: errors.length === 0, errors };
  };

  const parseCsvFile = (file: File): Promise<any[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const text = e.target?.result as string;
          const lines = text.split('\n').filter(line => line.trim());
          
          if (lines.length < 2) {
            reject(new Error('CSV file must contain at least a header row and one data row'));
            return;
          }
          
          const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
          const requiredHeaders = ['name', 'amount', 'due_date', 'category'];
          
          const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
          if (missingHeaders.length > 0) {
            reject(new Error(`Missing required columns: ${missingHeaders.join(', ')}`));
            return;
          }
          
          const data = lines.slice(1).map((line, index) => {
            const values = line.split(',').map(v => v.trim());
            const row: any = {};
            
            headers.forEach((header, i) => {
              row[header] = values[i] || '';
            });
            
            return row;
          });
          
          resolve(data);
        } catch (error) {
          reject(error);
        }
      };
      
      reader.onerror = () => {
        reject(new Error('Failed to read CSV file'));
      };
      
      reader.readAsText(file);
    });
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      
      if (!file.name.endsWith('.csv')) {
        toast({
          title: "Invalid File",
          description: "Please select a CSV file",
          variant: "destructive",
        });
        return;
      }
      
      setCsvFile(file);
      setImportResults([]);
      setValidationErrors([]);
    }
  };

  const handleImport = async () => {
    if (!csvFile) return;
    
    try {
      setIsImporting(true);
      setImportProgress(0);
      
      // Parse CSV
      const data = await parseCsvFile(csvFile);
      setImportProgress(20);
      
      // Validate all rows
      const allErrors: string[] = [];
      const validatedData = data.map((row, index) => {
        const { valid, errors } = validateCsvRow(row, index + 2); // +2 for header and 0-based index
        allErrors.push(...errors);
        return { ...row, valid };
      });
      
      if (allErrors.length > 0) {
        setValidationErrors(allErrors);
        setIsImporting(false);
        return;
      }
      
      setImportProgress(40);
      
      // Import valid rows
      const results: BulkOperationResult[] = [];
      const validRows = validatedData.filter(row => row.valid);
      
      for (let i = 0; i < validRows.length; i++) {
        const row = validRows[i];
        
        try {
          const billData = {
            name: row.name.trim(),
            amount: parseFloat(row.amount),
            due_date: row.due_date,
            category: row.category.toLowerCase(),
            recurring: ['true', '1', 'yes'].includes(row.recurring?.toLowerCase() || 'false'),
            status: 'unpaid' as const,
            notes: row.notes || null,
          };
          
          await addBill(billData);
          
          results.push({
            success: true,
            row: i + 2,
            message: 'Successfully imported',
            data: billData
          });
        } catch (error: any) {
          results.push({
            success: false,
            row: i + 2,
            message: error.message || 'Failed to import'
          });
        }
        
        setImportProgress(40 + (i + 1) / validRows.length * 60);
      }
      
      setImportResults(results);
      
      const successCount = results.filter(r => r.success).length;
      const failureCount = results.filter(r => !r.success).length;
      
      toast({
        title: "Import Complete",
        description: `${successCount} bills imported successfully${failureCount > 0 ? `, ${failureCount} failed` : ''}`,
      });
      
    } catch (error: any) {
      toast({
        title: "Import Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
      setImportProgress(100);
    }
  };

  const downloadTemplate = () => {
    const csvContent = csvTemplate.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'bills_template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Bulk Bill Operations</h2>
        <p className="text-muted-foreground">Import multiple bills from CSV files with validation</p>
      </div>

      {/* Template Download */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            CSV Template
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Download our CSV template to ensure your file has the correct format and required columns.
            </p>
            <div className="bg-muted p-4 rounded-lg">
              <p className="font-medium mb-2">Required columns:</p>
              <ul className="text-sm space-y-1">
                <li><code>name</code> - Bill name (required)</li>
                <li><code>amount</code> - Bill amount as decimal (required)</li>
                <li><code>due_date</code> - Due date in YYYY-MM-DD format (required)</li>
                <li><code>category</code> - utilities, rent, insurance, subscription, loan, credit_card, other (required)</li>
                <li><code>recurring</code> - true/false or yes/no (optional, defaults to false)</li>
                <li><code>notes</code> - Additional notes (optional)</li>
              </ul>
            </div>
            <Button onClick={downloadTemplate} variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Download CSV Template
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* File Upload */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Import Bills from CSV
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label htmlFor="csv-file">Select CSV File</Label>
              <Input
                id="csv-file"
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                disabled={isImporting}
              />
            </div>
            
            {csvFile && (
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div>
                  <p className="font-medium">{csvFile.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {(csvFile.size / 1024).toFixed(1)} KB
                  </p>
                </div>
                <Button 
                  onClick={handleImport} 
                  disabled={isImporting}
                  className="flex items-center gap-2"
                >
                  <Upload className="h-4 w-4" />
                  {isImporting ? 'Importing...' : 'Import Bills'}
                </Button>
              </div>
            )}
            
            {isImporting && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Import Progress</span>
                  <span>{Math.round(importProgress)}%</span>
                </div>
                <Progress value={importProgress} />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <XCircle className="h-5 w-5" />
              Validation Errors
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {validationErrors.map((error, index) => (
                <div key={index} className="flex items-center gap-2 text-sm">
                  <AlertTriangle className="h-4 w-4 text-destructive flex-shrink-0" />
                  <span>{error}</span>
                </div>
              ))}
            </div>
            <p className="text-sm text-muted-foreground mt-4">
              Please fix these errors and try importing again.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Import Results */}
      {importResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Import Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex gap-4">
                <Badge className="bg-green-100 text-green-800">
                  {importResults.filter(r => r.success).length} Successful
                </Badge>
                <Badge className="bg-red-100 text-red-800">
                  {importResults.filter(r => !r.success).length} Failed
                </Badge>
              </div>
              
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Row</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Message</TableHead>
                    <TableHead>Bill Name</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {importResults.map((result, index) => (
                    <TableRow key={index}>
                      <TableCell>{result.row}</TableCell>
                      <TableCell>
                        <Badge className={result.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                          {result.success ? 'Success' : 'Failed'}
                        </Badge>
                      </TableCell>
                      <TableCell>{result.message}</TableCell>
                      <TableCell>{result.data?.name || 'N/A'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default BulkBillOperations;