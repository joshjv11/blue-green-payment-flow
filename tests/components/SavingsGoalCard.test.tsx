/**
 * Example Component Test
 * This serves as a template for testing React components
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, createMockSavingsGoal } from '../utils/test-utils';
import { SavingsGoalCard } from '@/components/SavingsGoalCard';

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('SavingsGoalCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render goal name and details', () => {
    const goal = createMockSavingsGoal({
      goal_name: 'Vacation Fund',
      target_amount: 10000,
      current_amount: 5000,
    });

    const { getByText } = renderWithProviders(<SavingsGoalCard goal={goal} />);

    expect(getByText('Vacation Fund')).toBeInTheDocument();
    expect(getByText(/50%/i)).toBeInTheDocument(); // Progress percentage
  });

  it('should show completed badge when goal is completed', () => {
    const goal = createMockSavingsGoal({
      is_completed: true,
    });

    const { getByText } = renderWithProviders(<SavingsGoalCard goal={goal} />);

    expect(getByText(/done/i)).toBeInTheDocument();
  });

  it('should calculate progress correctly', () => {
    const goal = createMockSavingsGoal({
      target_amount: 10000,
      current_amount: 2500,
    });

    const { getByText } = renderWithProviders(<SavingsGoalCard goal={goal} />);

    // Should show 25% progress
    expect(getByText(/25%/i)).toBeInTheDocument();
  });

  it('should call onViewAll when provided', () => {
    const goal = createMockSavingsGoal();
    const onViewAll = vi.fn();

    const { getByRole } = renderWithProviders(
      <SavingsGoalCard goal={goal} onViewAll={onViewAll} />
    );

    const button = getByRole('button', { name: /view/i });
    button.click();

    expect(onViewAll).toHaveBeenCalledTimes(1);
  });
});

