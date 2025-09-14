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

export const exportBillsAsJSON = (bills: Bill[]): string => {
  const exportData = {
    version: '1.0',
    exported_at: new Date().toISOString(),
    bills: bills.map(bill => ({
      ...bill,
      amount: Number(bill.amount), // Ensure numeric type
    }))
  };
  return JSON.stringify(exportData, null, 2);
};

export const exportBillsAsCSV = (bills: Bill[]): string => {
  const headers = [
    'name',
    'amount',
    'due_date',
    'category',
    'recurring',
    'status',
    'notes',
    'created_at',
    'updated_at'
  ];
  
  const csvRows = [
    headers.join(','),
    ...bills.map(bill => [
      `"${bill.name.replace(/"/g, '""')}"`, // Escape quotes
      bill.amount,
      bill.due_date,
      bill.category,
      bill.recurring,
      bill.status,
      `"${(bill.notes || '').replace(/"/g, '""')}"`, // Escape quotes and handle null
      bill.created_at,
      bill.updated_at
    ].join(','))
  ];
  
  return csvRows.join('\n');
};

export const downloadFile = (content: string, filename: string, mimeType: string) => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export const parseCSV = (csvContent: string): Partial<Bill>[] => {
  const lines = csvContent.trim().split('\n');
  if (lines.length < 2) {
    throw new Error('CSV file must have a header row and at least one data row');
  }
  
  const headers = lines[0].split(',').map(h => h.trim());
  const requiredHeaders = ['name', 'amount', 'due_date', 'category', 'status'];
  
  // Check if required headers exist
  const missingHeaders = requiredHeaders.filter(header => !headers.includes(header));
  if (missingHeaders.length > 0) {
    throw new Error(`Missing required columns: ${missingHeaders.join(', ')}`);
  }
  
  return lines.slice(1).map((line, index) => {
    const values = parseCSVLine(line);
    if (values.length !== headers.length) {
      throw new Error(`Row ${index + 2} has ${values.length} columns, expected ${headers.length}`);
    }
    
    const bill: any = {};
    headers.forEach((header, i) => {
      let value = values[i].trim();
      
      // Remove surrounding quotes if present
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.slice(1, -1).replace(/""/g, '"');
      }
      
      switch (header) {
        case 'amount':
          bill[header] = parseFloat(value);
          if (isNaN(bill[header])) {
            throw new Error(`Invalid amount in row ${index + 2}: ${value}`);
          }
          break;
        case 'recurring':
          bill[header] = value.toLowerCase() === 'true';
          break;
        case 'status':
          if (!['unpaid', 'paid', 'overdue'].includes(value)) {
            throw new Error(`Invalid status in row ${index + 2}: ${value}. Must be 'unpaid', 'paid', or 'overdue'`);
          }
          bill[header] = value;
          break;
        case 'due_date':
        case 'created_at':
        case 'updated_at':
          // Validate date format
          if (value && isNaN(Date.parse(value))) {
            throw new Error(`Invalid date in row ${index + 2}, column ${header}: ${value}`);
          }
          bill[header] = value;
          break;
        case 'notes':
          bill[header] = value || null;
          break;
        default:
          bill[header] = value;
      }
    });
    
    return bill;
  });
};

// Helper function to parse CSV line with proper quote handling
const parseCSVLine = (line: string): string[] => {
  const result = [];
  let current = '';
  let inQuotes = false;
  let i = 0;
  
  while (i < line.length) {
    const char = line[i];
    
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // Escaped quote
        current += '"';
        i += 2;
      } else {
        // Start or end of quoted field
        inQuotes = !inQuotes;
        i++;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
      i++;
    } else {
      current += char;
      i++;
    }
  }
  
  result.push(current);
  return result;
};

export const parseJSON = (jsonContent: string): Partial<Bill>[] => {
  try {
    const data = JSON.parse(jsonContent);
    
    // Handle different JSON formats
    let bills = [];
    if (Array.isArray(data)) {
      bills = data;
    } else if (data.bills && Array.isArray(data.bills)) {
      bills = data.bills;
    } else {
      throw new Error('Invalid JSON format. Expected an array of bills or an object with a "bills" property');
    }
    
    return bills.map((bill: any, index: number) => {
      if (!bill.name || !bill.amount || !bill.due_date || !bill.category || !bill.status) {
        throw new Error(`Bill ${index + 1} is missing required fields: name, amount, due_date, category, status`);
      }
      
      if (!['unpaid', 'paid', 'overdue'].includes(bill.status)) {
        throw new Error(`Bill ${index + 1} has invalid status: ${bill.status}. Must be 'unpaid', 'paid', or 'overdue'`);
      }
      
      if (isNaN(Number(bill.amount))) {
        throw new Error(`Bill ${index + 1} has invalid amount: ${bill.amount}`);
      }
      
      if (isNaN(Date.parse(bill.due_date))) {
        throw new Error(`Bill ${index + 1} has invalid due_date: ${bill.due_date}`);
      }
      
      return {
        ...bill,
        amount: Number(bill.amount),
        recurring: Boolean(bill.recurring),
        notes: bill.notes || null
      };
    });
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error('Invalid JSON format');
    }
    throw error;
  }
};

export const validateBillData = (bills: Partial<Bill>[]): string[] => {
  const errors: string[] = [];
  const categories = ['utilities', 'rent', 'insurance', 'subscription', 'loan', 'credit_card', 'other'];
  
  bills.forEach((bill, index) => {
    if (!bill.name?.trim()) {
      errors.push(`Bill ${index + 1}: Name is required`);
    }
    
    if (!bill.amount || bill.amount <= 0) {
      errors.push(`Bill ${index + 1}: Amount must be a positive number`);
    }
    
    if (!bill.due_date) {
      errors.push(`Bill ${index + 1}: Due date is required`);
    }
    
    if (!bill.category || !categories.includes(bill.category)) {
      errors.push(`Bill ${index + 1}: Category must be one of: ${categories.join(', ')}`);
    }
    
    if (!bill.status || !['unpaid', 'paid', 'overdue'].includes(bill.status)) {
      errors.push(`Bill ${index + 1}: Status must be 'unpaid', 'paid', or 'overdue'`);
    }
  });
  
  return errors;
};