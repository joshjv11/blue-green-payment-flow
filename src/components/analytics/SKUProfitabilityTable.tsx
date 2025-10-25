import { useState, useMemo } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Download, RefreshCw, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { SKUProfitability } from '@/hooks/useProfitabilityData';
import { Badge } from '@/components/ui/badge';

interface Props {
  data: SKUProfitability[];
  onRefresh: () => void;
  loading?: boolean;
}

type SortField = keyof SKUProfitability;
type SortDirection = 'asc' | 'desc' | null;

export function SKUProfitabilityTable({ data, onRefresh, loading }: Props) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<SortField>('grossProfit');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 25;

  const filteredAndSorted = useMemo(() => {
    let result = [...data];

    // Filter by search
    if (searchTerm) {
      result = result.filter(
        item =>
          item.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.productName.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Sort
    if (sortDirection) {
      result.sort((a, b) => {
        const aVal = a[sortField];
        const bVal = b[sortField];
        const modifier = sortDirection === 'asc' ? 1 : -1;
        
        if (typeof aVal === 'number' && typeof bVal === 'number') {
          return (aVal - bVal) * modifier;
        }
        return String(aVal).localeCompare(String(bVal)) * modifier;
      });
    }

    return result;
  }, [data, searchTerm, sortField, sortDirection]);

  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredAndSorted.slice(start, start + itemsPerPage);
  }, [filteredAndSorted, currentPage]);

  const totalPages = Math.ceil(filteredAndSorted.length / itemsPerPage);

  const totals = useMemo(() => {
    return filteredAndSorted.reduce(
      (acc, item) => ({
        unitsSold: acc.unitsSold + item.unitsSold,
        totalRevenue: acc.totalRevenue + item.totalRevenue,
        totalCOGS: acc.totalCOGS + item.totalCOGS,
        grossProfit: acc.grossProfit + item.grossProfit
      }),
      { unitsSold: 0, totalRevenue: 0, totalCOGS: 0, grossProfit: 0 }
    );
  }, [filteredAndSorted]);

  const avgMargin = totals.totalRevenue > 0 
    ? ((totals.grossProfit / totals.totalRevenue) * 100).toFixed(1)
    : '0.0';

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : sortDirection === 'desc' ? null : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown className="h-4 w-4 ml-1 opacity-30" />;
    if (sortDirection === 'asc') return <ArrowUp className="h-4 w-4 ml-1" />;
    if (sortDirection === 'desc') return <ArrowDown className="h-4 w-4 ml-1" />;
    return <ArrowUpDown className="h-4 w-4 ml-1 opacity-30" />;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'HIGH': return 'bg-green-500/10 text-green-700 dark:text-green-400';
      case 'MEDIUM': return 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400';
      case 'LOW': return 'bg-red-500/10 text-red-700 dark:text-red-400';
      default: return 'bg-muted';
    }
  };

  const getRowColor = (margin: number) => {
    if (margin > 30) return 'bg-green-500/5';
    if (margin > 15) return 'bg-yellow-500/5';
    return 'bg-red-500/5';
  };

  const exportToCSV = () => {
    const headers = ['SKU', 'Product Name', 'Category', 'Units Sold', 'Revenue', 'COGS', 'Gross Profit', 'Margin %'];
    const rows = filteredAndSorted.map(item => [
      item.sku,
      item.productName,
      item.category,
      item.unitsSold,
      item.totalRevenue.toFixed(2),
      item.totalCOGS.toFixed(2),
      item.grossProfit.toFixed(2),
      item.profitMargin.toFixed(2)
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sku-profitability-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative flex-1 w-full sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search SKU or Product Name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportToCSV}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button variant="outline" size="sm" onClick={onRefresh} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="cursor-pointer" onClick={() => handleSort('sku')}>
                <div className="flex items-center">SKU {getSortIcon('sku')}</div>
              </TableHead>
              <TableHead className="cursor-pointer" onClick={() => handleSort('productName')}>
                <div className="flex items-center">Product Name {getSortIcon('productName')}</div>
              </TableHead>
              <TableHead className="cursor-pointer" onClick={() => handleSort('category')}>
                <div className="flex items-center">Category {getSortIcon('category')}</div>
              </TableHead>
              <TableHead className="cursor-pointer text-right" onClick={() => handleSort('unitsSold')}>
                <div className="flex items-center justify-end">Units Sold {getSortIcon('unitsSold')}</div>
              </TableHead>
              <TableHead className="cursor-pointer text-right" onClick={() => handleSort('totalRevenue')}>
                <div className="flex items-center justify-end">Revenue {getSortIcon('totalRevenue')}</div>
              </TableHead>
              <TableHead className="cursor-pointer text-right" onClick={() => handleSort('totalCOGS')}>
                <div className="flex items-center justify-end">COGS {getSortIcon('totalCOGS')}</div>
              </TableHead>
              <TableHead className="cursor-pointer text-right" onClick={() => handleSort('grossProfit')}>
                <div className="flex items-center justify-end">Gross Profit {getSortIcon('grossProfit')}</div>
              </TableHead>
              <TableHead className="cursor-pointer text-right" onClick={() => handleSort('profitMargin')}>
                <div className="flex items-center justify-end">Margin % {getSortIcon('profitMargin')}</div>
              </TableHead>
              <TableHead className="text-center">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData.map((item, idx) => (
              <TableRow key={idx} className={getRowColor(item.profitMargin)}>
                <TableCell className="font-mono text-sm">{item.sku}</TableCell>
                <TableCell className="font-medium">{item.productName}</TableCell>
                <TableCell>{item.category}</TableCell>
                <TableCell className="text-right">{item.unitsSold.toLocaleString()}</TableCell>
                <TableCell className="text-right">₹{item.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                <TableCell className="text-right">₹{item.totalCOGS.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                <TableCell className="text-right font-semibold">₹{item.grossProfit.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                <TableCell className="text-right font-semibold">{item.profitMargin.toFixed(1)}%</TableCell>
                <TableCell className="text-center">
                  <Badge variant="outline" className={getStatusColor(item.status)}>
                    {item.status}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
            
            {/* Totals Row */}
            <TableRow className="bg-muted/50 font-semibold border-t-2">
              <TableCell colSpan={3}>TOTALS</TableCell>
              <TableCell className="text-right">{totals.unitsSold.toLocaleString()}</TableCell>
              <TableCell className="text-right">₹{totals.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
              <TableCell className="text-right">₹{totals.totalCOGS.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
              <TableCell className="text-right">₹{totals.grossProfit.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
              <TableCell className="text-right">{avgMargin}%</TableCell>
              <TableCell />
            </TableRow>
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredAndSorted.length)} of {filteredAndSorted.length} products
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const page = i + 1;
                return (
                  <Button
                    key={page}
                    variant={currentPage === page ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setCurrentPage(page)}
                  >
                    {page}
                  </Button>
                );
              })}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
