/**
 * Utility functions to format invoice/sale/purchase details for WhatsApp messages
 */

export interface OrderLine {
  product_name: string;
  description?: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  tax_amount?: number;
  total_amount: number;
  gst_rate?: number;
}

export interface SalesOrder {
  id: string;
  invoice_number: string;
  customer_name: string;
  transaction_date: string;
  subtotal?: number;
  tax_amount?: number;
  grand_total?: number;
  total_amount?: number; // Fallback if grand_total is missing
  payment_status: string;
  amount_paid?: number;
  balance_due?: number;
  customer_gstin?: string;
  customer_address?: string;
  notes?: string;
  billing_snapshot?: any;
}

export interface PurchaseOrder {
  id: string;
  invoice_number: string;
  supplier_name: string;
  transaction_date: string;
  subtotal?: number;
  tax_amount?: number;
  grand_total?: number;
  total_amount?: number; // Fallback if grand_total is missing
  payment_status: string;
  amount_paid?: number;
  balance_due?: number;
  supplier_gstin?: string;
  supplier_address?: string;
  notes?: string;
}

/**
 * Format invoice details for WhatsApp message
 */
export function formatInvoiceForWhatsApp(
  order: SalesOrder | PurchaseOrder,
  orderLines: OrderLine[] = [],
  type: 'sale' | 'purchase' = 'sale'
): string {
  const isSale = type === 'sale';
  const customerName = isSale 
    ? (order as SalesOrder).customer_name 
    : (order as PurchaseOrder).supplier_name;
  
  let message = `🧾 *${isSale ? 'INVOICE' : 'PURCHASE ORDER'}*\n\n`;
  
  // Header
  message += `*${isSale ? 'Invoice' : 'Order'} No:* ${order.invoice_number || 'N/A'}\n`;
  
  if (order.transaction_date) {
    try {
      message += `*Date:* ${new Date(order.transaction_date).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      })}\n`;
    } catch (e) {
      message += `*Date:* ${order.transaction_date}\n`;
    }
  }
  
  message += `*${isSale ? 'Customer' : 'Supplier'}:* ${customerName || 'N/A'}\n`;
  
  // GSTIN if available
  if (isSale && (order as SalesOrder).customer_gstin) {
    message += `*GSTIN:* ${(order as SalesOrder).customer_gstin}\n`;
  } else if (!isSale && (order as PurchaseOrder).supplier_gstin) {
    message += `*GSTIN:* ${(order as PurchaseOrder).supplier_gstin}\n`;
  }
  
  message += `\n━━━━━━━━━━━━━━━━━━━━\n`;
  message += `*ITEMS*\n\n`;
  
  // Items list
  if (orderLines.length > 0) {
    orderLines.forEach((line, index) => {
      const productName = line.product_name || 'Item';
      const quantity = line.quantity ?? 1;
      const unitPrice = line.unit_price ?? 0;
      const totalAmount = line.total_amount ?? line.subtotal ?? 0;
      
      message += `${index + 1}. *${productName}*\n`;
      if (line.description && line.description !== productName) {
        message += `   ${line.description}\n`;
      }
      message += `   Qty: ${quantity} × ₹${unitPrice.toFixed(2)}\n`;
      if (line.gst_rate && line.gst_rate > 0) {
        message += `   GST: ${line.gst_rate}%\n`;
      }
      message += `   *Amount: ₹${totalAmount.toFixed(2)}*\n\n`;
    });
  } else {
    message += `No items found\n\n`;
  }
  
  message += `━━━━━━━━━━━━━━━━━━━━\n`;
  
  // Summary
  message += `*SUMMARY*\n\n`;
  const subtotal = order.subtotal ?? order.total_amount ?? 0;
  const taxAmount = order.tax_amount ?? 0;
  const grandTotal = order.grand_total ?? order.total_amount ?? 0;
  
  message += `Subtotal: ₹${subtotal.toFixed(2)}\n`;
  if (taxAmount > 0) {
    message += `Tax (GST): ₹${taxAmount.toFixed(2)}\n`;
  }
  message += `*Grand Total: ₹${grandTotal.toFixed(2)}*\n\n`;
  
  // Payment status
  if (isSale) {
    const sale = order as SalesOrder;
    message += `*Payment Status:* ${sale.payment_status.toUpperCase()}\n`;
    if (sale.amount_paid !== undefined && sale.amount_paid > 0) {
      message += `Amount Paid: ₹${sale.amount_paid.toFixed(2)}\n`;
    }
    if (sale.balance_due !== undefined && sale.balance_due > 0) {
      message += `Balance Due: ₹${sale.balance_due.toFixed(2)}\n`;
    }
  } else {
    message += `*Payment Status:* ${order.payment_status.toUpperCase()}\n`;
    const purchase = order as PurchaseOrder;
    if (purchase.amount_paid !== undefined && purchase.amount_paid > 0) {
      message += `Amount Paid: ₹${purchase.amount_paid.toFixed(2)}\n`;
    }
    if (purchase.balance_due !== undefined && purchase.balance_due > 0) {
      message += `Balance Due: ₹${purchase.balance_due.toFixed(2)}\n`;
    }
  }
  
  // Notes
  if (order.notes) {
    message += `\n*Notes:*\n${order.notes}\n`;
  }
  
  message += `\n━━━━━━━━━━━━━━━━━━━━\n`;
  message += `Thank you for your business! 🙏\n`;
  
  if (isSale && (order as SalesOrder).payment_status !== 'paid') {
    message += `\nPlease make the payment at your earliest convenience.`;
  }
  
  return message;
}

/**
 * Format a simple invoice summary (for quick messages)
 */
export function formatInvoiceSummary(
  order: SalesOrder | PurchaseOrder,
  type: 'sale' | 'purchase' = 'sale'
): string {
  const isSale = type === 'sale';
  const customerName = isSale 
    ? (order as SalesOrder).customer_name 
    : (order as PurchaseOrder).supplier_name;
  
  const grandTotal = order.grand_total ?? order.total_amount ?? 0;
  const paymentStatus = order.payment_status || 'UNPAID';
  
  let message = `🧾 *${isSale ? 'Invoice' : 'Purchase Order'}*\n\n`;
  message += `*${isSale ? 'Invoice' : 'Order'} No:* ${order.invoice_number || 'N/A'}\n`;
  message += `*${isSale ? 'Customer' : 'Supplier'}:* ${customerName || 'N/A'}\n`;
  
  if (order.transaction_date) {
    try {
      message += `*Date:* ${new Date(order.transaction_date).toLocaleDateString('en-IN')}\n`;
    } catch (e) {
      message += `*Date:* ${order.transaction_date}\n`;
    }
  }
  
  message += `*Amount:* ₹${grandTotal.toFixed(2)}\n`;
  message += `*Status:* ${paymentStatus.toUpperCase()}\n\n`;
  message += `Thank you for your business! 🙏`;
  
  return message;
}

