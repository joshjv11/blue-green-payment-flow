# 🧪 Comprehensive Component Testing Plan

## Overview

This document outlines a complete testing strategy for all components in the application. The goal is to achieve **100% component test coverage** with systematic, maintainable tests.

## Testing Stack

- **Vitest** - Fast test runner
- **React Testing Library** - Component testing utilities
- **jsdom** - DOM environment for tests
- **@testing-library/user-event** - User interaction simulation
- **@testing-library/jest-dom** - Custom matchers

## Test Structure

```
tests/
├── components/          # Component unit tests
│   ├── SavingsGoalCard.test.tsx
│   ├── EMICard.test.tsx
│   └── ...
├── pages/             # Page integration tests
│   ├── Dashboard.test.tsx
│   └── ...
├── utils/             # Test utilities
│   └── test-utils.tsx
├── setup.ts           # Test environment setup
└── setup-react.ts     # React testing setup
```

## Testing Strategy

### 1. Component Unit Tests (Priority: HIGH)

**Goal:** Test each component in isolation with mocked dependencies.

**What to Test:**
- ✅ Component renders without crashing
- ✅ Renders with required props
- ✅ Renders with optional props
- ✅ Conditional rendering (if/else, ternary)
- ✅ User interactions (clicks, inputs, form submissions)
- ✅ Event handlers are called correctly
- ✅ State changes trigger re-renders
- ✅ Error states display correctly
- ✅ Loading states display correctly
- ✅ Empty states display correctly
- ✅ Accessibility (ARIA labels, roles, keyboard navigation)

**Test Template:**
```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders } from '../utils/test-utils';
import { ComponentName } from '@/components/ComponentName';

describe('ComponentName', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render without crashing', () => {
    const { container } = renderWithProviders(<ComponentName />);
    expect(container).toBeTruthy();
  });

  // Add more tests...
});
```

### 2. Page Integration Tests (Priority: MEDIUM)

**Goal:** Test complete pages with real component interactions.

**What to Test:**
- ✅ Page loads and renders all sections
- ✅ Navigation between sections works
- ✅ Data fetching and display
- ✅ Form submissions work end-to-end
- ✅ Error handling across the page
- ✅ Loading states across the page

### 3. E2E Flow Tests (Priority: LOW - Already exists)

**Goal:** Test complete user flows (already implemented in `tests/`).

## Component Testing Checklist

For each component, test:

### Basic Rendering
- [ ] Renders without crashing
- [ ] Renders with minimal props
- [ ] Renders with all props
- [ ] Renders with null/undefined props (if applicable)

### User Interactions
- [ ] Button clicks
- [ ] Form inputs
- [ ] Form submissions
- [ ] Dropdown selections
- [ ] Modal open/close
- [ ] Toggle switches
- [ ] Navigation links

### Conditional Logic
- [ ] Loading states
- [ ] Error states
- [ ] Empty states
- [ ] Success states
- [ ] Disabled states
- [ ] Hidden/visible states

### Data Display
- [ ] Correct data formatting
- [ ] Currency formatting
- [ ] Date formatting
- [ ] Number formatting
- [ ] List rendering
- [ ] Table rendering

### Accessibility
- [ ] ARIA labels present
- [ ] Keyboard navigation works
- [ ] Screen reader friendly
- [ ] Focus management
- [ ] Color contrast (visual check)

## Component Categories & Testing Priorities

### Priority 1: Core UI Components (Test First)
- [ ] `ui/button.tsx`
- [ ] `ui/card.tsx`
- [ ] `ui/input.tsx`
- [ ] `ui/dialog.tsx`
- [ ] `ui/select.tsx`
- [ ] `ui/table.tsx`
- [ ] All other `ui/` components

### Priority 2: Feature Components (Test Second)
- [ ] `SavingsGoalCard.tsx`
- [ ] `EMICard.tsx`
- [ ] `BillReminderSettings.tsx`
- [ ] `SavingsGoalCard.tsx`
- [ ] `BulkEInvoiceProcessor.tsx`
- [ ] `EInvoiceButton.tsx`

### Priority 3: Page Components (Test Third)
- [ ] `Dashboard.tsx`
- [ ] `Bills.tsx`
- [ ] `SavingsGoals.tsx`
- [ ] `EMIManager.tsx`
- [ ] `SpendingInsights.tsx`
- [ ] All other pages

### Priority 4: Complex Components (Test Last)
- [ ] `EnhancedAIAssistantV2.tsx`
- [ ] `AdvancedAnalytics.tsx`
- [ ] `WhatsAppBroadcastModal.tsx`
- [ ] `PaymentFlowTester.tsx`

## Test Generation

### Automatic Test Generation

Generate test files for all components:
```bash
npm run test:generate -- all
```

Generate test for a specific component:
```bash
npm run test:generate -- SavingsGoalCard
npm run test:generate -- src/components/EMICard.tsx
```

### Manual Test Creation

1. Copy the template from `tests/components/SavingsGoalCard.test.tsx`
2. Update component name and imports
3. Add specific test cases
4. Run tests: `npm test`

## Running Tests

### Run All Tests
```bash
npm test
```

### Run Component Tests Only
```bash
npm run test:components
```

### Run Tests in Watch Mode
```bash
npm run test:watch
```

### Run Tests with Coverage
```bash
npm run test:coverage
```

### Run Specific Test File
```bash
npm test -- SavingsGoalCard.test.tsx
```

### Run Tests Matching Pattern
```bash
npm test -- --grep "SavingsGoal"
```

## Test Coverage Goals

- **Current:** ~20% (only integration tests)
- **Target:** 80%+ component coverage
- **Stretch Goal:** 90%+ overall coverage

### Coverage Breakdown
- Components: 80%+
- Pages: 70%+
- Utils/Hooks: 90%+
- Services: 80%+

## Testing Best Practices

### 1. Test Behavior, Not Implementation
✅ Good: "User can click button to submit form"
❌ Bad: "Button onClick handler is called"

### 2. Use Semantic Queries
✅ Good: `getByRole('button', { name: /submit/i })`
❌ Bad: `getByTestId('submit-button')`

### 3. Test User Flows
✅ Good: Test complete user journey
❌ Bad: Test isolated function calls

### 4. Keep Tests Simple
✅ Good: One assertion per test (when possible)
❌ Bad: 20 assertions in one test

### 5. Mock External Dependencies
✅ Good: Mock Supabase, API calls, navigation
❌ Bad: Make real API calls in tests

## Component Test Examples

### Simple Component (Button)
```tsx
describe('Button', () => {
  it('should render with text', () => {
    const { getByText } = renderWithProviders(<Button>Click me</Button>);
    expect(getByText('Click me')).toBeInTheDocument();
  });

  it('should call onClick when clicked', async () => {
    const handleClick = vi.fn();
    const { getByRole } = renderWithProviders(
      <Button onClick={handleClick}>Click me</Button>
    );
    
    await userEvent.click(getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
```

### Form Component
```tsx
describe('BillForm', () => {
  it('should submit form with valid data', async () => {
    const onSubmit = vi.fn();
    const { getByLabelText, getByRole } = renderWithProviders(
      <BillForm onSubmit={onSubmit} />
    );

    await userEvent.type(getByLabelText(/name/i), 'Electric Bill');
    await userEvent.type(getByLabelText(/amount/i), '100');
    await userEvent.click(getByRole('button', { name: /submit/i }));

    expect(onSubmit).toHaveBeenCalledWith({
      name: 'Electric Bill',
      amount: 100,
    });
  });
});
```

### Component with Data Fetching
```tsx
describe('BillsList', () => {
  it('should display loading state', () => {
    const { getByText } = renderWithProviders(
      <BillsList isLoading={true} />
    );
    expect(getByText(/loading/i)).toBeInTheDocument();
  });

  it('should display bills when loaded', () => {
    const bills = [createMockBill({ name: 'Test Bill' })];
    const { getByText } = renderWithProviders(
      <BillsList bills={bills} isLoading={false} />
    );
    expect(getByText('Test Bill')).toBeInTheDocument();
  });
});
```

## Continuous Testing

### Pre-commit Hooks (Recommended)
Add to `.husky/pre-commit`:
```bash
npm run test:staged
```

### CI/CD Integration
Add to GitHub Actions:
```yaml
- name: Run tests
  run: npm test

- name: Check coverage
  run: npm run test:coverage
```

## Troubleshooting

### Tests Fail with "Cannot find module"
- Check import paths use `@/` alias
- Verify component path in test file

### Tests Fail with "useNavigate is not defined"
- Mock `react-router-dom` in test file
- See example in `SavingsGoalCard.test.tsx`

### Tests Fail with Supabase errors
- Use `mockSupabaseClient` from `test-utils.tsx`
- Mock Supabase hooks if needed

### Tests are slow
- Use `vi.mock()` for heavy dependencies
- Mock API calls instead of making real requests
- Use `happy-dom` instead of `jsdom` (faster, less accurate)

## Next Steps

1. ✅ Install testing dependencies (DONE)
2. ✅ Set up test infrastructure (DONE)
3. ✅ Create test utilities (DONE)
4. ⏳ Generate tests for all components
5. ⏳ Write tests for Priority 1 components
6. ⏳ Write tests for Priority 2 components
7. ⏳ Write tests for Priority 3 components
8. ⏳ Achieve 80%+ coverage
9. ⏳ Set up CI/CD testing
10. ⏳ Add pre-commit hooks

## Resources

- [React Testing Library Docs](https://testing-library.com/react)
- [Vitest Docs](https://vitest.dev/)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)

