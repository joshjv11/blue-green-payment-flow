#!/usr/bin/env ts-node
/**
 * Component Test Generator
 * Generates test files for React components
 * 
 * Usage:
 *   npm run test:generate -- ComponentName
 *   npm run test:generate -- SavingsGoalCard
 *   npm run test:generate -- components/SavingsGoalCard
 */

import * as fs from 'fs';
import * as path from 'path';

const componentName = process.argv[2];

if (!componentName) {
  console.error('❌ Error: Component name required');
  console.log('\nUsage:');
  console.log('  npm run test:generate -- ComponentName');
  console.log('  npm run test:generate -- SavingsGoalCard');
  process.exit(1);
}

// Extract component name from path if provided
const cleanComponentName = componentName
  .replace(/^components\//, '')
  .replace(/\.tsx?$/, '')
  .split('/')
  .pop()!;

const componentPath = `src/components/${cleanComponentName}.tsx`;
const testPath = `tests/components/${cleanComponentName}.test.tsx`;

// Check if component exists
if (!fs.existsSync(componentPath)) {
  console.error(`❌ Error: Component not found at ${componentPath}`);
  console.log('\nAvailable components:');
  const componentsDir = 'src/components';
  if (fs.existsSync(componentsDir)) {
    const files = fs.readdirSync(componentsDir, { recursive: true })
      .filter((f: string) => f.endsWith('.tsx') && !f.includes('ui/'))
      .map((f: string) => f.replace('.tsx', ''))
      .slice(0, 20);
    files.forEach(f => console.log(`  - ${f}`));
  }
  process.exit(1);
}

// Read component to extract props
let componentContent = fs.readFileSync(componentPath, 'utf-8');

// Extract props interface/type
const propsMatch = componentContent.match(
  /(?:interface|type)\s+(\w+Props)\s*\{([^}]+)\}/
);

const propsInterface = propsMatch ? propsMatch[1] : `${cleanComponentName}Props`;
const propsContent = propsMatch ? propsMatch[2] : '';

// Extract prop names
const propNames = propsContent
  .split('\n')
  .map(line => line.trim())
  .filter(line => line && !line.startsWith('//') && !line.startsWith('*'))
  .map(line => {
    const match = line.match(/^(\w+)(?:\??:|\?)/);
    return match ? match[1] : null;
  })
  .filter(Boolean) as string[];

// Generate test file
const testContent = `/**
 * ${cleanComponentName} Component Test
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders } from '../utils/test-utils';
import { ${cleanComponentName} } from '@/components/${cleanComponentName}';

// Mock dependencies
${getMockImports(componentContent)}

describe('${cleanComponentName}', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render without errors', () => {
    const props = ${getDefaultProps(propNames)};
    const { container } = renderWithProviders(<${cleanComponentName} {...props} />);
    expect(container).toBeTruthy();
  });

  it('should render with required props', () => {
    const props = ${getDefaultProps(propNames)};
    const { getByText } = renderWithProviders(<${cleanComponentName} {...props} />);
    // TODO: Add specific assertions based on component
    expect(getByText).toBeDefined();
  });

  it('should handle missing optional props', () => {
    const requiredProps = ${getRequiredProps(propNames)};
    const { container } = renderWithProviders(<${cleanComponentName} {...requiredProps} />);
    expect(container).toBeTruthy();
  });

  ${generateInteractionTests(cleanComponentName, componentContent)}

  ${generateStateTests(cleanComponentName)}

  // TODO: Add more specific tests based on component functionality
});
`;

// Write test file
const testDir = path.dirname(testPath);
if (!fs.existsSync(testDir)) {
  fs.mkdirSync(testDir, { recursive: true });
}

fs.writeFileSync(testPath, testContent);
console.log(`✅ Generated test file: ${testPath}`);
console.log(`\n📝 Next steps:`);
console.log(`   1. Review and customize the test file`);
console.log(`   2. Add component-specific test cases`);
console.log(`   3. Run: npm test -- ${cleanComponentName}`);

function getMockImports(content: string): string {
  const mocks: string[] = [];

  if (content.includes('useNavigate') || content.includes('useRouter')) {
    mocks.push(`const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});`);
  }

  if (content.includes('useAuth')) {
    mocks.push(`vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'test-user', email: 'test@example.com' },
    loading: false,
  }),
}));`);
  }

  if (content.includes('usePlan') || content.includes('useSupabasePlan')) {
    mocks.push(`vi.mock('@/hooks/useSupabasePlan', () => ({
  useSupabasePlan: () => ({
    plan: 'free',
    loading: false,
    isPro: false,
  }),
}));`);
  }

  if (content.includes('supabase')) {
    mocks.push(`vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
  },
}));`);
  }

  return mocks.join('\n\n');
}

function getDefaultProps(propNames: string[]): string {
  if (propNames.length === 0) {
    return '{}';
  }
  const props = propNames.map(name => {
    if (name === 'className') return `${name}: 'test-class'`;
    if (name === 'children') return `${name}: 'Test Content'`;
    if (name.includes('onClick') || name.includes('onSubmit') || name.startsWith('on')) {
      return `${name}: vi.fn()`;
    }
    return `${name}: 'test-${name}'`;
  }).join(',\n    ');
  return `{\n    ${props}\n  }`;
}

function getRequiredProps(propNames: string[]): string {
  // Filter out optional props (those that might have ?)
  const required = propNames.filter(name => 
    !name.includes('onClick') && 
    !name.includes('className') &&
    name !== 'children'
  );
  if (required.length === 0) return '{}';
  return getDefaultProps(required);
}

function generateInteractionTests(componentName: string, content: string): string {
  const tests: string[] = [];

  if (content.includes('Button') || content.includes('button')) {
    tests.push(`  it('should handle button clicks', async () => {
    const mockOnClick = vi.fn();
    const props = { ...${getDefaultProps([])}, onClick: mockOnClick };
    const { getByRole } = renderWithProviders(<${componentName} {...props} />);
    const button = getByRole('button');
    // TODO: Add click simulation and assertion
  });`);
  }

  if (content.includes('Input') || content.includes('input')) {
    tests.push(`  it('should handle input changes', async () => {
    const { getByRole } = renderWithProviders(<${componentName} />);
    const input = getByRole('textbox');
    // TODO: Add input change simulation and assertion
  });`);
  }

  return tests.join('\n\n  ');
}

function generateStateTests(componentName: string): string {
  return `  it('should handle loading state', () => {
    const props = { ...${getDefaultProps([])}, loading: true };
    const { container } = renderWithProviders(<${componentName} {...props} />);
    expect(container).toBeTruthy();
    // TODO: Add loading state assertion
  });

  it('should handle error state', () => {
    const props = { ...${getDefaultProps([])}, error: 'Test error' };
    const { container } = renderWithProviders(<${componentName} {...props} />);
    expect(container).toBeTruthy();
    // TODO: Add error state assertion
  });

  it('should handle empty state', () => {
    const props = { ...${getDefaultProps([])}, data: [] };
    const { container } = renderWithProviders(<${componentName} {...props} />);
    expect(container).toBeTruthy();
    // TODO: Add empty state assertion
  });`;
}
