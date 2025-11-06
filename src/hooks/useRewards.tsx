import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

interface UserRewards {
  id: string;
  user_id: string;
  total_xp: number;
  current_level: number;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';
  current_streak: number;
  longest_streak: number;
  last_activity_date: string | null;
  total_bills_paid: number;
  early_payments: number;
  on_time_payments: number;
  late_payments: number;
}

interface Badge {
  id: string;
  badge_id: string;
  badge_name: string;
  badge_description: string | null;
  badge_icon: string | null;
  badge_tier: string | null;
  earned_at: string;
  xp_earned: number | null;
}

export const useRewards = () => {
  const { user } = useAuth();
  const [rewards, setRewards] = useState<UserRewards | null>(null);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRewards = useCallback(async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('user_rewards')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      
      if (!data) {
        // Initialize rewards for new user
        const { data: newRewards, error: insertError } = await supabase
          .from('user_rewards')
          .insert({ user_id: user.id })
          .select()
          .single();
        
        if (insertError) throw insertError;
        setRewards(newRewards as UserRewards);
      } else {
        setRewards(data as UserRewards);
      }
    } catch (error) {
      console.error('Error fetching rewards:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const fetchBadges = useCallback(async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('user_badges')
        .select('*')
        .eq('user_id', user.id)
        .order('earned_at', { ascending: false });
      
      if (error) throw error;
      setBadges(data || []);
    } catch (error) {
      console.error('Error fetching badges:', error);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchRewards();
      fetchBadges();
    }
  }, [user, fetchRewards, fetchBadges]);

  const awardXP = async (
    actionType: string,
    xpAmount: number,
    description: string,
    relatedBillId?: string
  ) => {
    if (!user) return null;

    try {
      const { data, error } = await supabase.rpc('award_xp', {
        p_user_id: user.id,
        p_action_type: actionType,
        p_xp_amount: xpAmount,
        p_description: description,
        p_related_bill_id: relatedBillId || null
      });

      if (error) throw error;

      // Refresh rewards
      await fetchRewards();

      return data;
    } catch (error) {
      console.error('Error awarding XP:', error);
      return null;
    }
  };

  const awardBadge = async (
    badgeId: string,
    badgeName: string,
    description: string,
    icon: string,
    tier: string,
    xpEarned: number = 0
  ) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('user_badges')
        .insert({
          user_id: user.id,
          badge_id: badgeId,
          badge_name: badgeName,
          badge_description: description,
          badge_icon: icon,
          badge_tier: tier,
          xp_earned: xpEarned
        });

      if (error && error.code !== '23505') throw error; // Ignore duplicate badge

      await fetchBadges();
    } catch (error) {
      console.error('Error awarding badge:', error);
    }
  };

  const updateStreak = async (isPaid: boolean, daysEarly: number = 0) => {
    if (!user || !rewards) return;

    const today = new Date().toISOString().split('T')[0];
    const lastActivity = rewards.last_activity_date;
    
    let newStreak = rewards.current_streak;
    
    if (isPaid) {
      if (!lastActivity || lastActivity !== today) {
        newStreak = rewards.current_streak + 1;
      }
    } else {
      newStreak = 0; // Reset on late payment
    }

    const updateData: any = {
      current_streak: newStreak,
      longest_streak: Math.max(newStreak, rewards.longest_streak),
      last_activity_date: today,
      total_bills_paid: rewards.total_bills_paid + (isPaid ? 1 : 0),
    };

    if (daysEarly > 0) {
      updateData.early_payments = rewards.early_payments + 1;
    } else if (daysEarly === 0) {
      updateData.on_time_payments = rewards.on_time_payments + 1;
    } else {
      updateData.late_payments = rewards.late_payments + 1;
    }

    try {
      const { error } = await supabase
        .from('user_rewards')
        .update(updateData)
        .eq('user_id', user.id);

      if (error) throw error;
      await fetchRewards();
    } catch (error) {
      console.error('Error updating streak:', error);
    }
  };

  const checkAndAwardMilestoneBadges = async () => {
    if (!rewards) return;

    const milestones = [
      { id: 'streak_7', name: '7-Day Streak', threshold: 7, field: 'current_streak', icon: '🔥', tier: 'bronze', xp: 50 },
      { id: 'streak_30', name: '30-Day Streak', threshold: 30, field: 'current_streak', icon: '⚡', tier: 'silver', xp: 150 },
      { id: 'streak_90', name: '90-Day Streak', threshold: 90, field: 'current_streak', icon: '💎', tier: 'gold', xp: 500 },
      { id: 'paid_10', name: '10 Bills Paid', threshold: 10, field: 'total_bills_paid', icon: '💰', tier: 'bronze', xp: 30 },
      { id: 'paid_50', name: '50 Bills Paid', threshold: 50, field: 'total_bills_paid', icon: '💸', tier: 'silver', xp: 200 },
      { id: 'early_bird', name: 'Early Bird', threshold: 10, field: 'early_payments', icon: '🌅', tier: 'gold', xp: 100 },
    ];

    for (const milestone of milestones) {
      const currentValue = rewards[milestone.field as keyof UserRewards] as number;
      
      if (currentValue >= milestone.threshold) {
        // Check if badge already exists
        const hasBadge = badges.some(b => b.badge_id === milestone.id);
        
        if (!hasBadge) {
          await awardBadge(
            milestone.id,
            milestone.name,
            `Earned for reaching ${milestone.threshold} ${milestone.field.replace('_', ' ')}`,
            milestone.icon,
            milestone.tier,
            milestone.xp
          );
          
          // Award bonus XP
          await awardXP(
            'badge_earned',
            milestone.xp,
            `Badge earned: ${milestone.name}`,
          );

          // Show celebration toast
          toast.success(`🎉 Badge Unlocked: ${milestone.name}!`, {
            description: `+${milestone.xp} XP earned`,
            duration: 5000,
          });
        }
      }
    }
  };

  return {
    rewards,
    badges,
    loading,
    awardXP,
    awardBadge,
    updateStreak,
    checkAndAwardMilestoneBadges,
    refetch: fetchRewards
  };
};
