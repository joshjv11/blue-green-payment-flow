import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, ExternalLink, Trash2, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { Expense } from '@/pages/Expenses';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/lib/supabase';
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
      
      // Get expense to delete attachment
      const expense = expenses.find(e => e.id === deleteId);
      if (expense?.attachment_url) {
        // Extract file path from URL and delete from storage
        const fileName = expense.attachment_url.split('/').pop();
        if (fileName) {
          await supabase.storage.from('receipts').remove([fileName]);
        }
      }

      const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', deleteId);

      if (error) throw error;

      toast({
        title: 'Expense deleted',
        description: 'The expense has been removed successfully',
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
            {[...Array(5)].map((_, i) => (
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
        <CardHeader>
          <CardTitle>Expenses</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No expenses found</p>
            <p className="text-sm text-muted-foreground mt-1">
              Upload your first receipt to get started
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Expenses</CardTitle>
          <Button variant="ghost" size="sm" onClick={onRefresh}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort('date')}
                  >
                    Date {sortField === 'date' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort('vendor')}
                  >
                    Vendor {sortField === 'vendor' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead 
                    className="text-right cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort('amount')}
                  >
                    Amount {sortField === 'amount' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </TableHead>
                  <TableHead className="text-right">GST</TableHead>
                  <TableHead className="text-center">Receipt</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedExpenses.map((expense) => (
                  <TableRow key={expense.id}>
                    <TableCell className="font-medium">
                      {format(new Date(expense.date), 'dd MMM yyyy')}
                    </TableCell>
                    <TableCell>{expense.vendor}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={getCategoryColor(expense.category)}>
                        {expense.category}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      ₹{Number(expense.amount).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      ₹{Number(expense.gst).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-center">
                      {expense.attachment_url ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          asChild
                        >
                          <a href={expense.attachment_url} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </Button>
                      ) : (
                        <span className="text-muted-foreground text-sm">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteId(expense.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Expense</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this expense? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
