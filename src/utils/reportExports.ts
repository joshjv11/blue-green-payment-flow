import { format } from 'date-fns';
import { ProfitLossData, BalanceSheetData, CashFlowData, formatCurrency, DateRange } from './financialCalculations';

export const exportProfitLossToCSV = (data: ProfitLossData, dateRange: DateRange) => {
  const rows = [
    ['Profit & Loss Statement'],
    [`Period: ${format(dateRange.start, 'MMM dd, yyyy')} - ${format(dateRange.end, 'MMM dd, yyyy')}`],
    [''],
    ['Revenue', data.revenue.toFixed(2)],
    ['Cost of Goods Sold', data.cogs.toFixed(2)],
    ['Gross Profit', data.grossProfit.toFixed(2)],
    [''],
    ['Operating Expenses'],
    ...Object.entries(data.operatingExpenses.byCategory).map(([cat, amt]) => [`  ${cat}`, amt.toFixed(2)]),
    ['Total Operating Expenses', data.operatingExpenses.total.toFixed(2)],
    [''],
    ['Operating Income', data.operatingIncome.toFixed(2)],
    ['Net Profit', data.netProfit.toFixed(2)]
  ];

  const csvContent = rows.map(row => row.join(',')).join('\n');
  downloadCSV(csvContent, `profit-loss-${format(new Date(), 'yyyy-MM-dd')}.csv`);
};

export const exportBalanceSheetToCSV = (data: BalanceSheetData, dateRange: DateRange) => {
  const rows = [
    ['Balance Sheet'],
    [`As of: ${format(dateRange.end, 'MMM dd, yyyy')}`],
    [''],
    ['ASSETS'],
    ['Inventory', data.assets.inventory.toFixed(2)],
    ['Accounts Receivable', data.assets.receivables.toFixed(2)],
    ['Total Assets', data.assets.total.toFixed(2)],
    [''],
    ['LIABILITIES'],
    ['Accounts Payable', data.liabilities.payables.toFixed(2)],
    ['Total Liabilities', data.liabilities.total.toFixed(2)],
    [''],
    ['EQUITY'],
    ['Retained Earnings', data.equity.retainedEarnings.toFixed(2)],
    ['Total Equity', data.equity.total.toFixed(2)],
    [''],
    ['Total Liabilities + Equity', (data.liabilities.total + data.equity.total).toFixed(2)]
  ];

  const csvContent = rows.map(row => row.join(',')).join('\n');
  downloadCSV(csvContent, `balance-sheet-${format(new Date(), 'yyyy-MM-dd')}.csv`);
};

export const exportCashFlowToCSV = (data: CashFlowData, dateRange: DateRange) => {
  const rows = [
    ['Cash Flow Statement'],
    [`Period: ${format(dateRange.start, 'MMM dd, yyyy')} - ${format(dateRange.end, 'MMM dd, yyyy')}`],
    [''],
    ['OPERATING ACTIVITIES'],
    ['Cash from Sales', data.operating.salesReceipts.toFixed(2)],
    ['Cash for Purchases', (-data.operating.purchasePayments).toFixed(2)],
    ['Cash for Expenses', (-data.operating.expensePayments).toFixed(2)],
    ['Net Operating Cash Flow', data.operating.net.toFixed(2)],
    [''],
    ['INVESTING ACTIVITIES'],
    ['Inventory Purchases', (-data.investing.inventoryPurchases).toFixed(2)],
    ['Net Investing Cash Flow', data.investing.net.toFixed(2)],
    [''],
    ['FINANCING ACTIVITIES'],
    ['Equity Contributions', data.financing.equity.toFixed(2)],
    ['Net Financing Cash Flow', data.financing.net.toFixed(2)],
    [''],
    ['NET CASH FLOW', data.netCashFlow.toFixed(2)]
  ];

  const csvContent = rows.map(row => row.join(',')).join('\n');
  downloadCSV(csvContent, `cash-flow-${format(new Date(), 'yyyy-MM-dd')}.csv`);
};

const downloadCSV = (content: string, filename: string) => {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const exportProfitLossToPDF = (data: ProfitLossData, dateRange: DateRange) => {
  const htmlContent = generateProfitLossPDF(data, dateRange);
  printPDF(htmlContent);
};

export const exportBalanceSheetToPDF = (data: BalanceSheetData, dateRange: DateRange) => {
  const htmlContent = generateBalanceSheetPDF(data, dateRange);
  printPDF(htmlContent);
};

export const exportCashFlowToPDF = (data: CashFlowData, dateRange: DateRange) => {
  const htmlContent = generateCashFlowPDF(data, dateRange);
  printPDF(htmlContent);
};

const printPDF = (htmlContent: string) => {
  const blob = new Blob([htmlContent], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const printWindow = window.open(url, '_blank');
  
  if (printWindow) {
    printWindow.onload = () => {
      printWindow.print();
    };
  }
};

const generateProfitLossPDF = (data: ProfitLossData, dateRange: DateRange) => {
  const profitMargin = data.revenue > 0 ? ((data.netProfit / data.revenue) * 100).toFixed(1) : '0.0';
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Profit & Loss Statement</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        h1 { color: #333; margin-bottom: 5px; }
        .period { color: #666; margin-bottom: 30px; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th { background-color: #f5f5f5; padding: 12px; text-align: left; border-bottom: 2px solid #ddd; }
        td { padding: 10px 12px; border-bottom: 1px solid #eee; }
        .indent { padding-left: 30px; }
        .total { font-weight: bold; background-color: #f9f9f9; }
        .net-profit { font-size: 18px; background-color: #e8f5e9; }
        .negative { color: #d32f2f; }
        .positive { color: #2e7d32; }
      </style>
    </head>
    <body>
      <h1>Profit & Loss Statement</h1>
      <div class="period">Period: ${format(dateRange.start, 'MMM dd, yyyy')} - ${format(dateRange.end, 'MMM dd, yyyy')}</div>
      
      <table>
        <tr>
          <td><strong>Revenue</strong></td>
          <td style="text-align: right; color: #2e7d32;"><strong>${formatCurrency(data.revenue)}</strong></td>
        </tr>
        <tr>
          <td class="indent">Less: Cost of Goods Sold</td>
          <td style="text-align: right; color: #d32f2f;">(${formatCurrency(data.cogs)})</td>
        </tr>
        <tr class="total">
          <td>Gross Profit</td>
          <td style="text-align: right;">${formatCurrency(data.grossProfit)}</td>
        </tr>
        <tr>
          <td colspan="2"><br><strong>Operating Expenses</strong></td>
        </tr>
        ${Object.entries(data.operatingExpenses.byCategory).map(([cat, amt]) => `
          <tr>
            <td class="indent">${cat}</td>
            <td style="text-align: right; color: #d32f2f;">(${formatCurrency(amt)})</td>
          </tr>
        `).join('')}
        <tr class="total">
          <td class="indent">Total Operating Expenses</td>
          <td style="text-align: right; color: #d32f2f;">(${formatCurrency(data.operatingExpenses.total)})</td>
        </tr>
        <tr class="net-profit">
          <td><strong>Net Profit</strong></td>
          <td style="text-align: right;" class="${data.netProfit >= 0 ? 'positive' : 'negative'}">
            <strong>${data.netProfit < 0 ? '-' : ''}${formatCurrency(data.netProfit)}</strong>
          </td>
        </tr>
        <tr>
          <td colspan="2" style="text-align: right; padding-top: 10px; color: #666;">
            Profit Margin: ${profitMargin}%
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
};

const generateBalanceSheetPDF = (data: BalanceSheetData, dateRange: DateRange) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Balance Sheet</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        h1 { color: #333; margin-bottom: 5px; }
        .period { color: #666; margin-bottom: 30px; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th { background-color: #f5f5f5; padding: 12px; text-align: left; border-bottom: 2px solid #ddd; }
        td { padding: 10px 12px; border-bottom: 1px solid #eee; }
        .indent { padding-left: 30px; }
        .total { font-weight: bold; background-color: #f9f9f9; }
        .section-header { font-weight: bold; background-color: #e0e0e0; }
      </style>
    </head>
    <body>
      <h1>Balance Sheet</h1>
      <div class="period">As of: ${format(dateRange.end, 'MMM dd, yyyy')}</div>
      
      <table>
        <tr class="section-header">
          <td colspan="2">ASSETS</td>
        </tr>
        <tr>
          <td class="indent">Inventory</td>
          <td style="text-align: right;">${formatCurrency(data.assets.inventory)}</td>
        </tr>
        <tr>
          <td class="indent">Accounts Receivable</td>
          <td style="text-align: right;">${formatCurrency(data.assets.receivables)}</td>
        </tr>
        <tr class="total">
          <td>Total Assets</td>
          <td style="text-align: right; color: #1976d2;"><strong>${formatCurrency(data.assets.total)}</strong></td>
        </tr>
        
        <tr><td colspan="2"><br></td></tr>
        
        <tr class="section-header">
          <td colspan="2">LIABILITIES</td>
        </tr>
        <tr>
          <td class="indent">Accounts Payable</td>
          <td style="text-align: right;">${formatCurrency(data.liabilities.payables)}</td>
        </tr>
        <tr class="total">
          <td>Total Liabilities</td>
          <td style="text-align: right; color: #d32f2f;"><strong>${formatCurrency(data.liabilities.total)}</strong></td>
        </tr>
        
        <tr><td colspan="2"><br></td></tr>
        
        <tr class="section-header">
          <td colspan="2">EQUITY</td>
        </tr>
        <tr>
          <td class="indent">Retained Earnings</td>
          <td style="text-align: right;">${formatCurrency(data.equity.retainedEarnings)}</td>
        </tr>
        <tr class="total">
          <td>Total Equity</td>
          <td style="text-align: right; color: #7b1fa2;"><strong>${formatCurrency(data.equity.total)}</strong></td>
        </tr>
        
        <tr><td colspan="2"><br></td></tr>
        
        <tr class="total" style="background-color: #e8f5e9;">
          <td><strong>Total Liabilities + Equity</strong></td>
          <td style="text-align: right;"><strong>${formatCurrency(data.liabilities.total + data.equity.total)}</strong></td>
        </tr>
      </table>
    </body>
    </html>
  `;
};

const generateCashFlowPDF = (data: CashFlowData, dateRange: DateRange) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Cash Flow Statement</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        h1 { color: #333; margin-bottom: 5px; }
        .period { color: #666; margin-bottom: 30px; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th { background-color: #f5f5f5; padding: 12px; text-align: left; border-bottom: 2px solid #ddd; }
        td { padding: 10px 12px; border-bottom: 1px solid #eee; }
        .indent { padding-left: 30px; }
        .total { font-weight: bold; background-color: #f9f9f9; }
        .section-header { font-weight: bold; background-color: #e0e0e0; }
        .net-cash { font-size: 18px; background-color: #e8f5e9; }
        .negative { color: #d32f2f; }
        .positive { color: #2e7d32; }
      </style>
    </head>
    <body>
      <h1>Cash Flow Statement</h1>
      <div class="period">Period: ${format(dateRange.start, 'MMM dd, yyyy')} - ${format(dateRange.end, 'MMM dd, yyyy')}</div>
      
      <table>
        <tr class="section-header">
          <td colspan="2">OPERATING ACTIVITIES</td>
        </tr>
        <tr>
          <td class="indent">Cash from Sales</td>
          <td style="text-align: right; color: #2e7d32;">${formatCurrency(data.operating.salesReceipts)}</td>
        </tr>
        <tr>
          <td class="indent">Cash for Purchases</td>
          <td style="text-align: right; color: #d32f2f;">(${formatCurrency(data.operating.purchasePayments)})</td>
        </tr>
        <tr>
          <td class="indent">Cash for Expenses</td>
          <td style="text-align: right; color: #d32f2f;">(${formatCurrency(data.operating.expensePayments)})</td>
        </tr>
        <tr class="total">
          <td>Net Operating Cash Flow</td>
          <td style="text-align: right;" class="${data.operating.net >= 0 ? 'positive' : 'negative'}">
            ${data.operating.net < 0 ? '-' : ''}${formatCurrency(data.operating.net)}
          </td>
        </tr>
        
        <tr><td colspan="2"><br></td></tr>
        
        <tr class="section-header">
          <td colspan="2">INVESTING ACTIVITIES</td>
        </tr>
        <tr>
          <td class="indent">Inventory Purchases</td>
          <td style="text-align: right; color: #d32f2f;">(${formatCurrency(data.investing.inventoryPurchases)})</td>
        </tr>
        <tr class="total">
          <td>Net Investing Cash Flow</td>
          <td style="text-align: right;" class="${data.investing.net >= 0 ? 'positive' : 'negative'}">
            ${data.investing.net < 0 ? '-' : ''}${formatCurrency(data.investing.net)}
          </td>
        </tr>
        
        <tr><td colspan="2"><br></td></tr>
        
        <tr class="section-header">
          <td colspan="2">FINANCING ACTIVITIES</td>
        </tr>
        <tr>
          <td class="indent">Equity Contributions</td>
          <td style="text-align: right;">${formatCurrency(data.financing.equity)}</td>
        </tr>
        <tr class="total">
          <td>Net Financing Cash Flow</td>
          <td style="text-align: right;" class="${data.financing.net >= 0 ? 'positive' : 'negative'}">
            ${data.financing.net < 0 ? '-' : ''}${formatCurrency(data.financing.net)}
          </td>
        </tr>
        
        <tr><td colspan="2"><br></td></tr>
        
        <tr class="net-cash">
          <td><strong>NET CASH FLOW</strong></td>
          <td style="text-align: right;" class="${data.netCashFlow >= 0 ? 'positive' : 'negative'}">
            <strong>${data.netCashFlow < 0 ? '-' : ''}${formatCurrency(data.netCashFlow)}</strong>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
};
