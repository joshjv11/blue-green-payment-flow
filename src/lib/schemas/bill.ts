import { z } from 'zod';

export const billFormSchema = z.object({
  name: z.string().min(1, 'Bill name is required').max(200, 'Bill name is too long'),
  amount: z.string()
    .min(1, 'Amount is required')
    .refine((val) => {
      const num = parseFloat(val);
      return !isNaN(num) && num > 0;
    }, 'Amount must be a positive number')
    .refine((val) => {
      const num = parseFloat(val);
      return num <= 10000000; // Max 1 crore
    }, 'Amount is too large'),
  due_date: z.string().min(1, 'Due date is required'),
  category: z.enum(['utilities', 'rent', 'insurance', 'subscription', 'loan', 'credit_card', 'other'], {
    errorMap: () => ({ message: 'Invalid category' })
  }),
  recurring: z.boolean().default(false),
  status: z.enum(['unpaid', 'paid', 'overdue']).default('unpaid'),
  notes: z.string().max(1000, 'Notes are too long').optional().nullable(),
  email_reminder: z.boolean().default(true),
  reminder_days: z.number().int().min(0).max(30).default(1),
});

export type BillFormData = z.infer<typeof billFormSchema>;
