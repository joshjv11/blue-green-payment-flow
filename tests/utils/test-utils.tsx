/**
 * Test Utilities for React Component Testing
 * Provides common mocks, wrappers, and helpers
 */

import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi } from 'vitest';

// Mock Supabase client
export const mockSupabaseClient = {
  auth: {
    getUser: vi.fn().mockResolvedValue({
      data: { user: null },
      error: null,
    }),
    getSession: vi.fn().mockResolvedValue({
      data: { session: null },
      error: null,
    }),
    signInWithPassword: vi.fn(),
    signUp: vi.fn(),
    signOut: vi.fn(),
    onAuthStateChange: vi.fn(() => ({
      data: { subscription: null },
      unsubscribe: vi.fn(),
    })),
  },
  from: vi.fn(() => ({
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
  })),
  storage: {
    from: vi.fn(() => ({
      upload: vi.fn(),
      download: vi.fn(),
      remove: vi.fn(),
      list: vi.fn(),
      getPublicUrl: vi.fn(),
    })),
  },
};

// Mock useAuth hook
export const mockUseAuth = {
  user: null,
  session: null,
  loading: false,
  signIn: vi.fn(),
  signUp: vi.fn(),
  signOut: vi.fn(),
  updateProfile: vi.fn(),
};

// Mock usePlan hook
export const mockUsePlan = {
  plan: 'free',
  isLoading: false,
  isPro: false,
  isPremium: false,
  canAccess: vi.fn(() => true),
  checkFeature: vi.fn(() => true),
};

// Create a test query client
const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        cacheTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });

// Custom render function with providers
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  // Add custom options here
  withRouter?: boolean;
  withQueryClient?: boolean;
  initialEntries?: string[];
}

export function renderWithProviders(
  ui: ReactElement,
  {
    withRouter = true,
    withQueryClient = true,
    initialEntries = ['/'],
    ...renderOptions
  }: CustomRenderOptions = {}
) {
  const queryClient = createTestQueryClient();

  const Wrapper = ({ children }: { children: React.ReactNode }) => {
    let content = <>{children}</>;

    if (withQueryClient) {
      content = (
        <QueryClientProvider client={queryClient}>{content}</QueryClientProvider>
      );
    }

    if (withRouter) {
      content = <BrowserRouter>{content}</BrowserRouter>;
    }

    return content;
  };

  return {
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
    queryClient,
  };
}

// Re-export everything from testing library
export * from '@testing-library/react';
export { default as userEvent } from '@testing-library/user-event';

// Mock data generators
export const createMockUser = (overrides = {}) => ({
  id: 'test-user-id',
  email: 'test@example.com',
  user_metadata: {},
  ...overrides,
});

export const createMockBill = (overrides = {}) => ({
  id: 'test-bill-id',
  user_id: 'test-user-id',
  name: 'Test Bill',
  amount: 100.5,
  due_date: '2025-12-31',
  category: 'utilities',
  status: 'unpaid',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
});

export const createMockSavingsGoal = (overrides = {}) => ({
  id: 'test-goal-id',
  user_id: 'test-user-id',
  goal_name: 'Test Goal',
  target_amount: 10000,
  current_amount: 5000,
  monthly_contribution: 1000,
  goal_type: 'vacation',
  target_date: '2025-12-31',
  is_completed: false,
  ...overrides,
});

export const createMockEMI = (overrides = {}) => ({
  id: 'test-emi-id',
  user_id: 'test-user-id',
  emi_name: 'Test EMI',
  principal_amount: 100000,
  monthly_payment: 5000,
  interest_rate: 12,
  tenure_months: 24,
  start_date: '2025-01-01',
  status: 'active',
  ...overrides,
});

