import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

interface StreakShield {
  id: string;
  shield_type: 'basic' | 'premium' | 'insurance';
  earned_method: string;
  used_at: string | null;
  expires_at: string;
  is_active: boolean;
}

export const useStreakProtection = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [shields, setShields] = useState<StreakShield[]>([]);
  const [loading, setLoading] = useState(false);
  const [timeUntilExpiry, setTimeUntilExpiry] = useState<number | null>(null);
  const [streakExpiresAt, setStreakExpiresAt] = useState<Date | null>(null);

  useEffect(() => {
    if (user) {
      fetchShields();
      fetchStreakExpiration();
    }
  }, [user]);

  // Update countdown every second
  useEffect(() => {
    if (!streakExpiresAt) return;

    const interval = setInterval(() => {
      const now = new Date();
      const diff = streakExpiresAt.getTime() - now.getTime();
      setTimeUntilExpiry(diff > 0 ? diff : 0);
    }, 1000);

    return () => clearInterval(interval);
  }, [streakExpiresAt]);

  const fetchShields = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('streak_shields')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .is('used_at', null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setShields((data || []) as StreakShield[]);
    } catch (error) {
      console.error('Error fetching shields:', error);
    }
  };

  const fetchStreakExpiration = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('user_rewards')
        .select('streak_expires_at, last_activity_date')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;

      if (data?.streak_expires_at) {
        setStreakExpiresAt(new Date(data.streak_expires_at));
      } else if (data?.last_activity_date) {
        // Calculate expiration from last activity
        const lastActivity = new Date(data.last_activity_date);
        const expiry = new Date(lastActivity);
        expiry.setDate(expiry.getDate() + 2);
        expiry.setHours(23, 59, 59);
        setStreakExpiresAt(expiry);
      }
    } catch (error) {
      console.error('Error fetching streak expiration:', error);
    }
  };

  const purchaseShield = async (shieldType: 'basic' | 'premium' | 'insurance') => {
    if (!user) return;

    const costs = {
      basic: 50,
      premium: 150,
      insurance: 500,
    };

    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('purchase_streak_shield', {
        p_user_id: user.id,
        p_shield_type: shieldType,
        p_xp_cost: costs[shieldType],
      });

      if (error) throw error;

      toast({
        title: '🛡️ Shield Purchased!',
        description: `Your ${shieldType} streak shield is ready to use.`,
      });

      await fetchShields();
      return data;
    } catch (error: any) {
      toast({
        title: 'Purchase Failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const useShield = async (shieldType: 'basic' | 'premium' | 'insurance' = 'basic') => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('use_streak_shield', {
        p_user_id: user.id,
        p_shield_type: shieldType,
      });

      if (error) throw error;

      const result = data as any;
      toast({
        title: '🛡️ Streak Protected!',
        description: `Your ${result.streak_saved}-day streak has been saved!`,
      });

      await fetchShields();
      await fetchStreakExpiration();
      return data;
    } catch (error: any) {
      toast({
        title: 'Failed to use shield',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getShieldCounts = () => {
    return {
      basic: shields.filter(s => s.shield_type === 'basic').length,
      premium: shields.filter(s => s.shield_type === 'premium').length,
      insurance: shields.filter(s => s.shield_type === 'insurance').length,
      total: shields.length,
    };
  };

  const formatTimeRemaining = () => {
    if (timeUntilExpiry === null) return null;
    if (timeUntilExpiry <= 0) return 'EXPIRED!';

    const hours = Math.floor(timeUntilExpiry / (1000 * 60 * 60));
    const minutes = Math.floor((timeUntilExpiry % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((timeUntilExpiry % (1000 * 60)) / 1000);

    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days}d ${hours % 24}h`;
    }
    
    return `${hours}h ${minutes}m ${seconds}s`;
  };

  const isStreakInDanger = () => {
    if (!timeUntilExpiry) return false;
    return timeUntilExpiry <= 24 * 60 * 60 * 1000; // Less than 24 hours
  };

  const isCritical = () => {
    if (!timeUntilExpiry) return false;
    return timeUntilExpiry <= 3 * 60 * 60 * 1000; // Less than 3 hours
  };

  return {
    shields,
    loading,
    timeUntilExpiry,
    streakExpiresAt,
    purchaseShield,
    useShield,
    fetchShields,
    getShieldCounts,
    formatTimeRemaining,
    isStreakInDanger,
    isCritical,
  };
};
