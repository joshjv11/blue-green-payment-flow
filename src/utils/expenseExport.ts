import { format } from 'date-fns';
import { Expense } from '@/pages/Expenses';

export const exportExpensesToCSV = (expenses: Expense[]) => {
  const headers = ['Date', 'Vendor', 'Category', 'Amount', 'GST', 'Total', 'Notes'];
  
  const rows = expenses.map(expense => [
    format(new Date(expense.date), 'yyyy-MM-dd'),
    expense.vendor,
    expense.category,
    Number(expense.amount).toFixed(2),
    Number(expense.gst).toFixed(2),
    (Number(expense.amount) + Number(expense.gst)).toFixed(2),
    expense.notes || ''
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `expenses_${format(new Date(), 'yyyy-MM-dd')}.csv`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const exportExpensesToPDF = (expenses: Expense[]) => {
  // Create a simple HTML table for PDF export
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Expense Report</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          margin: 40px;
        }
        h1 {
          color: #333;
          margin-bottom: 10px;
        }
        .meta {
          color: #666;
          margin-bottom: 30px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 20px;
        }
        th {
          background-color: #f5f5f5;
          padding: 12px;
          text-align: left;
          border-bottom: 2px solid #ddd;
          font-weight: bold;
        }
        td {
          padding: 10px 12px;
          border-bottom: 1px solid #eee;
        }
        tr:hover {
          background-color: #f9f9f9;
        }
        .amount {
          text-align: right;
          font-weight: 500;
        }
        .total-row {
          background-color: #f0f0f0;
          font-weight: bold;
        }
        .category-badge {
          display: inline-block;
          padding: 4px 8px;
          border-radius: 4px;
          background-color: #e0e0e0;
          font-size: 12px;
        }
      </style>
    </head>
    <body>
      <h1>Expense Report</h1>
      <div class="meta">
        Generated on ${format(new Date(), 'MMMM dd, yyyy')} • ${expenses.length} transaction(s)
      </div>
      
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Vendor</th>
            <th>Category</th>
            <th style="text-align: right;">Amount</th>
            <th style="text-align: right;">GST</th>
            <th style="text-align: right;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${expenses.map(expense => `
            <tr>
              <td>${format(new Date(expense.date), 'MMM dd, yyyy')}</td>
              <td>${expense.vendor}</td>
              <td><span class="category-badge">${expense.category}</span></td>
              <td class="amount">₹${Number(expense.amount).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td>
              <td class="amount">₹${Number(expense.gst).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td>
              <td class="amount">₹${(Number(expense.amount) + Number(expense.gst)).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td>
            </tr>
          `).join('')}
          <tr class="total-row">
            <td colspan="3">Total</td>
            <td class="amount">₹${expenses.reduce((sum, e) => sum + Number(e.amount), 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td>
            <td class="amount">₹${expenses.reduce((sum, e) => sum + Number(e.gst), 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td>
            <td class="amount">₹${expenses.reduce((sum, e) => sum + Number(e.amount) + Number(e.gst), 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td>
          </tr>
        </tbody>
      </table>
    </body>
    </html>
  `;

  const blob = new Blob([htmlContent], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const printWindow = window.open(url, '_blank');
  
  if (printWindow) {
    printWindow.onload = () => {
      printWindow.print();
    };
  }
};
