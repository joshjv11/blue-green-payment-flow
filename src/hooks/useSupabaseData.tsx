import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

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

export const useSupabaseData = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [bills, setBills] = useState<Bill[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [userPlan, setUserPlan] = useState<UserPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  // Fetch all user data
  const fetchData = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Fetch bills (personal and team bills)
      const { data: billsData, error: billsError } = await supabase
        .from('bills')
        .select('*')
        .or(`user_id.eq.${user.id},team_id.in.(${await getUserTeamIds()})`)
        .order('due_date', { ascending: true });

      if (billsError) throw billsError;

      // Fetch teams
      const { data: teamsData, error: teamsError } = await supabase
        .from('teams')
        .select(`
          *,
          team_members!inner(user_id)
        `)
        .or(`owner_id.eq.${user.id},team_members.user_id.eq.${user.id}`);

      if (teamsError) throw teamsError;

      // Fetch user plan
      const { data: planData, error: planError } = await supabase
        .from('user_plans')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (planError && planError.code !== 'PGRST116') throw planError;

        setBills(billsData?.map(bill => ({
          ...bill,
          priority: bill.priority as 'low' | 'medium' | 'high',
          reminder_days_before: bill.reminder_days_before || 1,
          auto_reminder_enabled: bill.auto_reminder_enabled !== false
        })) || []);
        setTeams(teamsData || []);
        setUserPlan(planData as UserPlan);

    } catch (error: any) {
      console.error('Error fetching data:', error);
      toast({
        title: "Sync Error",
        description: "Failed to sync data from cloud database",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Get user's team IDs for filtering
  const getUserTeamIds = async (): Promise<string> => {
    if (!user) return '';
    
    const { data } = await supabase
      .from('team_members')
      .select('team_id')
      .eq('user_id', user.id);

    return data?.map(tm => tm.team_id).join(',') || '';
  };

  // Sync localStorage data to Supabase
  const syncLocalStorageData = async () => {
    if (!user) return;

    try {
      setSyncing(true);

      // Get localStorage bills
      const localBillsKey = `bills_${user.id}`;
      const localBills = localStorage.getItem(localBillsKey);
      
      if (localBills) {
        const parsedBills = JSON.parse(localBills);
        
        if (parsedBills.length > 0) {
          // Insert bills into Supabase
          const { error } = await supabase
            .from('bills')
            .upsert(parsedBills.map((bill: any) => ({
              ...bill,
              amount: parseFloat(bill.amount),
              due_date: bill.due_date.split('T')[0], // Convert to date format
            })));

          if (error) throw error;

          // Clear localStorage after successful sync
          localStorage.removeItem(localBillsKey);
          
          toast({
            title: "Data Synced",
            description: `${parsedBills.length} bills synced to cloud database`,
          });
        }
      }

      // Plan sync removed - now handled by user_entitlements_v1 view

    } catch (error: any) {
      console.error('Error syncing data:', error);
      toast({
        title: "Sync Failed",
        description: "Failed to sync local data to cloud",
        variant: "destructive",
      });
    } finally {
      setSyncing(false);
    }
  };

  // Add bill with automatic reminder scheduling
  const addBill = async (billData: Omit<Bill, 'id' | 'user_id' | 'created_at' | 'updated_at'> & {
    priority?: 'low' | 'medium' | 'high';
    reminder_days_before?: number;
    auto_reminder_enabled?: boolean;
  }) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('bills')
        .insert({
          ...billData,
          user_id: user.id,
          amount: parseFloat(billData.amount.toString()),
          priority: billData.priority || 'medium',
          reminder_days_before: billData.reminder_days_before || 1,
          auto_reminder_enabled: billData.auto_reminder_enabled !== false,
        })
        .select()
        .single();

      if (error) throw error;

      setBills(prev => [...prev, {
        ...data,
        priority: data.priority as 'low' | 'medium' | 'high',
        reminder_days_before: data.reminder_days_before || 1,
        auto_reminder_enabled: data.auto_reminder_enabled !== false
      }]);
      
      toast({
        title: "Bill Added",
        description: "Bill has been saved to your account",
      });

      // Automatically schedule reminder if enabled and due date exists
      if (data.auto_reminder_enabled && data.due_date) {
        try {
          console.log('🔔 Scheduling automatic reminder for bill:', data.name);
          
          const { error: reminderError } = await supabase.functions.invoke('schedule-individual-reminder', {
            body: {
              bill_id: data.id,
              reminder_days_before: data.reminder_days_before || 1,
              priority: data.priority || 'medium'
            }
          });

          if (reminderError) {
            console.error('❌ Failed to schedule reminder:', reminderError);
            toast({
              title: "Reminder Scheduling Failed",
              description: "Bill saved, but reminder scheduling failed. You can manually set it up later.",
              variant: "destructive",
            });
          } else {
            console.log('✅ Reminder scheduled successfully for bill:', data.name);
            toast({
              title: "Bill Added with Reminder",
              description: `Bill saved and reminder scheduled for ${data.reminder_days_before} day(s) before due date`,
            });
          }
        } catch (reminderError: any) {
          console.error('❌ Reminder scheduling error:', reminderError);
          toast({
            title: "Reminder Setup Warning",
            description: "Bill saved successfully, but automatic reminder setup failed",
            variant: "destructive",
          });
        }
      }

      return data;
    } catch (error: any) {
      console.error('Error adding bill:', error);
      toast({
        title: "Error",
        description: "Failed to add bill",
        variant: "destructive",
      });
      throw error;
    }
  };

  // Update bill
  const updateBill = async (id: string, updates: Partial<Bill>) => {
    try {
      const { data, error } = await supabase
        .from('bills')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      setBills(prev => prev.map(bill => bill.id === id ? {
        ...data,
        priority: data.priority as 'low' | 'medium' | 'high',
        reminder_days_before: data.reminder_days_before || 1,
        auto_reminder_enabled: data.auto_reminder_enabled !== false
      } : bill));
      
      return data;
    } catch (error: any) {
      console.error('Error updating bill:', error);
      toast({
        title: "Error",
        description: "Failed to update bill",
        variant: "destructive",
      });
      throw error;
    }
  };

  // Delete bill
  const deleteBill = async (id: string) => {
    try {
      const { error } = await supabase
        .from('bills')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setBills(prev => prev.filter(bill => bill.id !== id));
      
      toast({
        title: "Bill Deleted",
        description: "Bill has been removed from your account",
      });
    } catch (error: any) {
      console.error('Error deleting bill:', error);
      toast({
        title: "Error",
        description: "Failed to delete bill",
        variant: "destructive",
      });
      throw error;
    }
  };

  // Track AI query usage
  const trackAIQuery = async (queryType: string, queryContent: string, responseContent: string) => {
    if (!user || !userPlan) return false;

    try {
      // Check if user has queries remaining
      if (userPlan.ai_queries_used >= userPlan.ai_queries_limit && userPlan.plan === 'free') {
        return false;
      }

      // Log the query
      await supabase
        .from('ai_query_log')
        .insert({
          user_id: user.id,
          query_type: queryType,
          query_content: queryContent,
          response_content: responseContent,
        });

      // Update usage count for free users
      if (userPlan.plan === 'free') {
        const { data: updatedPlan } = await supabase
          .from('user_plans')
          .update({
            ai_queries_used: userPlan.ai_queries_used + 1,
          })
          .eq('user_id', user.id)
          .select()
          .single();

        if (updatedPlan) {
          setUserPlan(updatedPlan as UserPlan);
        }
      }

      return true;
    } catch (error: any) {
      console.error('Error tracking AI query:', error);
      return false;
    }
  };

  // Check if user can make AI query
  const canMakeAIQuery = (): boolean => {
    if (!userPlan) return false;
    return userPlan.plan !== 'free' || userPlan.ai_queries_used < userPlan.ai_queries_limit;
  };

  // Get AI queries remaining
  const getAIQueriesRemaining = (): number => {
    if (!userPlan || userPlan.plan !== 'free') return Infinity;
    return Math.max(0, userPlan.ai_queries_limit - userPlan.ai_queries_used);
  };

  useEffect(() => {
    if (user) {
      fetchData();
      // Auto-sync localStorage data on first load
      syncLocalStorageData();
    }
  }, [user]);

    // Create smart health check mechanism
    const runHealthCheck = async () => {
      try {
        const { error } = await supabase.functions.invoke('reminder-health-check');
        if (error) {
          console.error('Health check failed:', error);
        }
      } catch (error) {
        console.error('Health check error:', error);
      }
    };

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