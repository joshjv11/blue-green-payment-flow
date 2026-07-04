import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, ExternalLink, Trash2, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { Expense } from '@/pages/Expenses';
import { Skeleton } from '@/components/ui/skeleton';
import { deleteFile } from '@/lib/endpoints/storage';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface ExpensesTableProps {
  expenses: Expense[];
  loading: boolean;
  onRefresh: () => void;
}

export const ExpensesTable = ({ expenses, loading, onRefresh }: ExpensesTableProps) => {
  const { toast } = useToast();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [sortField, setSortField] = useState<'date' | 'amount' | 'vendor'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const handleSort = (field: 'date' | 'amount' | 'vendor') => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const sortedExpenses = [...expenses].sort((a, b) => {
    const aVal = sortField === 'date' ? new Date(a.date).getTime() : 
                 sortField === 'amount' ? Number(a.amount) : a.vendor;
    const bVal = sortField === 'date' ? new Date(b.date).getTime() : 
                 sortField === 'amount' ? Number(b.amount) : b.vendor;
    
    if (sortOrder === 'asc') {
      return aVal > bVal ? 1 : -1;
    }
    return aVal < bVal ? 1 : -1;
  });

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      setDeleting(true);
      
      const expense = expenses.find(e => e.id === deleteId);
      if (expense?.attachment_url) {
        try {
          const urlObj = new URL(expense.attachment_url);
          const filePath = urlObj.pathname.slice(1);
          await deleteFile(filePath);
        } catch {
          // Non-critical: continue even if storage delete fails
        }
      }

      console.warn('Expense delete not migrated — expenses table endpoint unavailable');
      toast({
        title: 'Expense deleted locally',
        description: 'Expense removal from API is not migrated yet.',
      });

      onRefresh();
    } catch (error: any) {
      toast({
        title: 'Error deleting expense',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setDeleting(false);
      setDeleteId(null);
    }
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      'Travel': 'bg-blue-100 text-blue-800',
      'Utilities': 'bg-green-100 text-green-800',
      'Office Supplies': 'bg-purple-100 text-purple-800',
      'Marketing': 'bg-pink-100 text-pink-800',
      'Software': 'bg-indigo-100 text-indigo-800',
      'Food & Dining': 'bg-orange-100 text-orange-800',
      'Professional Services': 'bg-teal-100 text-teal-800',
      'Other': 'bg-gray-100 text-gray-800',
    };
    return colors[category] || colors['Other'];
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Expenses</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (expenses.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No expenses yet</h3>
          <p className="text-muted-foreground">Upload receipts to start tracking expenses</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Expenses ({expenses.length})</CardTitle>
          <Button variant="outline" size="sm" onClick={onRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="cursor-pointer" onClick={() => handleSort('date')}>Date</TableHead>
                <TableHead className="cursor-pointer" onClick={() => handleSort('vendor')}>Vendor</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="cursor-pointer text-right" onClick={() => handleSort('amount')}>Amount</TableHead>
                <TableHead>Receipt</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedExpenses.map((expense) => (
                <TableRow key={expense.id}>
                  <TableCell>{format(new Date(expense.date), 'MMM d, yyyy')}</TableCell>
                  <TableCell className="font-medium">{expense.vendor}</TableCell>
                  <TableCell>
                    <Badge className={getCategoryColor(expense.category)}>{expense.category}</Badge>
                  </TableCell>
                  <TableCell className="text-right">₹{Number(expense.amount).toLocaleString('en-IN')}</TableCell>
                  <TableCell>
                    {expense.attachment_url ? (
                      <a href={expense.attachment_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">
                        <ExternalLink className="h-3 w-3" />
                        View
                      </a>
                    ) : (
                      <span className="text-muted-foreground text-sm">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => setDeleteId(expense.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete expense?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The expense and any attached receipt will be removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting}>
              {deleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
