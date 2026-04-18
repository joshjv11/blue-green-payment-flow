// Stubbed for MVP — zero DB fetches, everyone gets pro access.
export function useEntitlements() {
  return {
    data: {
      user_id: '',
      plan: 'pro',
      is_premium: true,
      is_pro: true,
      is_enterprise: false,
      subscription_status: true,
      current_period_end: null,
    },
    loading: false,
    error: null,
    isPremium: true,
    isPro: true,
    plan: 'pro',
  };
}
