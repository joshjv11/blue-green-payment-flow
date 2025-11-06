/**
 * Example Component Test - EMI Card
 * Template for testing card components
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, createMockEMI } from '../utils/test-utils';
import { EMICard } from '@/components/EMICard';

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('EMICard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render EMI details', () => {
    const emi = createMockEMI({
      emi_name: 'Home Loan',
      monthly_payment: 5000,
      principal_amount: 100000,
    });

    const { getByText } = renderWithProviders(<EMICard emi={emi} />);

    expect(getByText('Home Loan')).toBeInTheDocument();
    expect(getByText(/5000/i)).toBeInTheDocument();
  });

  it('should display active status', () => {
    const emi = createMockEMI({
      status: 'active',
    });

    const { getByText } = renderWithProviders(<EMICard emi={emi} />);

    expect(getByText(/active/i)).toBeInTheDocument();
  });

  it('should calculate remaining months correctly', () => {
    const emi = createMockEMI({
      tenure_months: 24,
      start_date: '2024-01-01',
    });

    const { container } = renderWithProviders(<EMICard emi={emi} />);
    expect(container).toBeTruthy();
    // TODO: Add specific assertions for remaining months calculation
  });
});

