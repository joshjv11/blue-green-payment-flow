import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';
import * as invoicesApi from '@/lib/endpoints/invoices';
import type { Invoice } from '@/lib/endpoints/invoices';

export interface Bill {
  id: string;
  user_id: string;
  team_id?: string;
  name: string;
  amount: number;
  due_date: string;
  category: string;
  recurring: boolean;
  status: 'unpaid' | 'paid' | 'overdue';
  notes?: string;
  created_at: string;
  updated_at: string;
  priority?: 'low' | 'medium' | 'high';
  reminder_days_before?: number;
  auto_reminder_enabled?: boolean;
}

export interface Team {
  id: string;
  name: string;
  description?: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
}

export interface TeamMember {
  id: string;
  team_id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  invited_by?: string;
  joined_at?: string;
  created_at: string;
}

export interface UserPlan {
  id: string;
  user_id: string;
  plan: 'free' | 'pro' | 'enterprise';
  ai_queries_used: number;
  ai_queries_limit: number;
  ai_queries_reset_date: string;
  created_at: string;
  updated_at: string;
}

function mapInvoiceToBill(inv: Invoice, userId: string): Bill {
  let status: Bill['status'] = 'unpaid';
  if (inv.status === 'paid') status = 'paid';
  else if (inv.status === 'sent' || inv.status === 'partiallypaid') {
    const due = inv.duedate ? new Date(inv.duedate) : null;
    if (due && due < new Date()) status = 'overdue';
  }
  return {
    id: inv.id,
    user_id: userId,
    name: inv.customername || inv.invoicenumber || 'Invoice',
    amount: Number(inv.amount || 0),
    due_date: inv.duedate || inv.issuedate || new Date().toISOString().slice(0, 10),
    category: 'other',
    recurring: false,
    status,
    notes: undefined,
    created_at: inv.createdat || new Date().toISOString(),
    updated_at: inv.updatedat || new Date().toISOString(),
    reminder_days_before: 1,
    auto_reminder_enabled: false,
  };
}

const DEFAULT_USER_PLAN = (userId: string): UserPlan => ({
  id: 'local',
  user_id: userId,
  plan: 'pro',
  ai_queries_used: 0,
  ai_queries_limit: 1000,
  ai_queries_reset_date: new Date().toISOString(),
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
});

export const useAppData = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [bills, setBills] = useState<Bill[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [userPlan, setUserPlan] = useState<UserPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const fetchData = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const invoices = await invoicesApi.listInvoices();
      setBills(invoices.map((inv) => mapInvoiceToBill(inv, user.id)));
      console.warn('Teams and user_plans not migrated — returning empty/default data');
      setTeams([]);
      setUserPlan(DEFAULT_USER_PLAN(user.id));
    } catch (error: unknown) {
      console.error('Error fetching data:', error);
      toast({
        title: 'Sync Error',
        description: 'Failed to sync data from API',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const syncLocalStorageData = async () => {
    console.warn('Local storage bill sync not migrated');
  };

  const addBill = async (
    billData: Omit<Bill, 'id' | 'user_id' | 'created_at' | 'updated_at'> & {
      priority?: 'low' | 'medium' | 'high';
      reminder_days_before?: number;
      auto_reminder_enabled?: boolean;
    }
  ) => {
    if (!user) return;
    console.warn('Direct bill insert not migrated — use invoices API with customer');
    toast({ title: 'Not available', description: 'Bill creation via legacy hook is disabled.', variant: 'destructive' });
    throw new Error('Bill creation not migrated');
  };

  const updateBill = async (id: string, updates: Partial<Bill>) => {
    try {
      const inv = await invoicesApi.updateInvoice(id, {
        amount: updates.amount,
        duedate: updates.due_date,
        status: updates.status === 'paid' ? 'paid' : updates.status === 'overdue' ? 'sent' : 'draft',
      });
      const mapped = mapInvoiceToBill(inv, user!.id);
      setBills((prev) => prev.map((bill) => (bill.id === id ? mapped : bill)));
      return mapped;
    } catch (error: unknown) {
      console.error('Error updating bill:', error);
      toast({ title: 'Error', description: 'Failed to update bill', variant: 'destructive' });
      throw error;
    }
  };

  const deleteBill = async (id: string) => {
    try {
      await invoicesApi.deleteInvoice(id);
      setBills((prev) => prev.filter((bill) => bill.id !== id));
      toast({ title: 'Bill Deleted', description: 'Bill has been removed from your account' });
    } catch (error: unknown) {
      console.error('Error deleting bill:', error);
      toast({ title: 'Error', description: 'Failed to delete bill', variant: 'destructive' });
      throw error;
    }
  };

  const trackAIQuery = async () => true;
  const canMakeAIQuery = (): boolean => true;
  const getAIQueriesRemaining = (): number => Infinity;

  const runHealthCheck = async () => {
    console.warn('Reminder health check not migrated');
  };

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  return {
    bills,
    teams,
    userPlan,
    loading,
    syncing,
    fetchData,
    syncLocalStorageData,
    addBill,
    updateBill,
    deleteBill,
    trackAIQuery,
    canMakeAIQuery,
    getAIQueriesRemaining,
    runHealthCheck,
  };
};
