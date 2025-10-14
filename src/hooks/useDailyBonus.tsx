import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './useAuth';
import { useRewards } from './useRewards';
import { useToast } from './use-toast';

interface DailyBonus {
  id: string;
  user_id: string;
  bonus_date: string;
  claimed_at: string | null;
  reward_type: string;
  reward_value: any;
  streak_day: number;
}

interface GeneratedReward {
  type: string;
  value: any;
}

export const useDailyBonus = () => {
  const { user } = useAuth();
  const { awardXP } = useRewards();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [canClaim, setCanClaim] = useState(false);
  const [todaysBonus, setTodaysBonus] = useState<DailyBonus | null>(null);
  const [temporaryUnlocks, setTemporaryUnlocks] = useState<any[]>([]);

  useEffect(() => {
    if (user) {
      checkDailyBonus();
      fetchTemporaryUnlocks();
    }
  }, [user]);

  const checkDailyBonus = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .rpc('can_claim_daily_bonus', { p_user_id: user.id });

      if (error) throw error;
      setCanClaim(data);

      // Fetch today's bonus if exists
      const { data: bonusData } = await supabase
        .from('daily_bonuses')
        .select('*')
        .eq('user_id', user.id)
        .eq('bonus_date', new Date().toISOString().split('T')[0])
        .maybeSingle();

      setTodaysBonus(bonusData);
    } catch (error) {
      console.error('Error checking daily bonus:', error);
    }
  };

  const fetchTemporaryUnlocks = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('temporary_unlocks')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .gt('expires_at', new Date().toISOString());

      if (error) throw error;
      setTemporaryUnlocks(data || []);
    } catch (error) {
      console.error('Error fetching temporary unlocks:', error);
    }
  };

  const generateReward = async (): Promise<GeneratedReward> => {
    const { data, error } = await supabase.rpc('generate_daily_reward');
    if (error) throw error;
    return data as unknown as GeneratedReward;
  };

  const claimDailyBonus = async (): Promise<DailyBonus | null> => {
    if (!user || !canClaim) return null;

    setLoading(true);
    try {
      const reward = await generateReward();
      const today = new Date().toISOString().split('T')[0];

      // Calculate streak
      const { data: previousBonus } = await supabase
        .from('daily_bonuses')
        .select('bonus_date, streak_day')
        .eq('user_id', user.id)
        .not('claimed_at', 'is', null)
        .order('bonus_date', { ascending: false })
        .limit(1)
        .maybeSingle();

      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      let streakDay = 1;
      if (previousBonus && previousBonus.bonus_date === yesterdayStr) {
        streakDay = previousBonus.streak_day + 1;
      }

      // Insert or update bonus
      const { data: bonusData, error } = await supabase
        .from('daily_bonuses')
        .upsert({
          user_id: user.id,
          bonus_date: today,
          claimed_at: new Date().toISOString(),
          reward_type: reward.type,
          reward_value: reward.value,
          streak_day: streakDay,
        })
        .select()
        .single();

      if (error) throw error;

      // Apply rewards
      await applyReward(reward, bonusData);

      setCanClaim(false);
      setTodaysBonus(bonusData);
      
      return bonusData;
    } catch (error: any) {
      console.error('Error claiming daily bonus:', error);
      toast({
        title: 'Failed to claim bonus',
        description: error.message,
        variant: 'destructive',
      });
      return null;
    } finally {
      setLoading(false);
    }
  };

  const applyReward = async (reward: GeneratedReward, bonus: DailyBonus) => {
    switch (reward.type) {
      case 'xp':
        await awardXP('daily_bonus', reward.value.amount, `Daily bonus: ${reward.value.amount} XP`);
        break;

      case 'badge_boost':
        // Badge boost is passive, just notify
        toast({
          title: '🎯 Badge Boost Activated!',
          description: `${reward.value.boost_percentage}% boost for your next badge`,
        });
        break;

      case 'premium_access':
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + reward.value.duration_hours);
        
        await supabase.from('temporary_unlocks').insert({
          user_id: user!.id,
          unlock_type: 'premium_feature',
          unlock_data: reward.value,
          expires_at: expiresAt.toISOString(),
        });
        
        await fetchTemporaryUnlocks();
        break;

      case 'theme':
        const themeExpiresAt = new Date();
        themeExpiresAt.setDate(themeExpiresAt.getDate() + reward.value.duration_days);
        
        await supabase.from('temporary_unlocks').insert({
          user_id: user!.id,
          unlock_type: 'theme',
          unlock_data: reward.value,
          expires_at: themeExpiresAt.toISOString(),
        });
        
        await fetchTemporaryUnlocks();
        break;

      case 'collectible':
        const collectibleName = `${reward.value.rarity.charAt(0).toUpperCase() + reward.value.rarity.slice(1)} Collectible`;
        
        await supabase.from('user_collectibles').insert({
          user_id: user!.id,
          collectible_id: reward.value.collectible_id,
          collectible_name: collectibleName,
          collectible_type: 'special',
          rarity: reward.value.rarity,
        });
        break;
    }
  };

  return {
    canClaim,
    todaysBonus,
    temporaryUnlocks,
    loading,
    claimDailyBonus,
    checkDailyBonus,
  };
};
