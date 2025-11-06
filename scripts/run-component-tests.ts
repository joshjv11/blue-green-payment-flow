#!/usr/bin/env ts-node
/**
 * Component Test Runner
 * Runs tests for all components and generates a report
 * 
 * Usage:
 *   npm run test:components:all
 *   npm run test:components:all -- --coverage
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

interface TestResult {
  component: string;
  status: 'pass' | 'fail' | 'skip';
  duration?: number;
  error?: string;
}

const componentsDir = 'src/components';
const testsDir = 'tests/components';

// Get all component files
function getAllComponents(): string[] {
  const components: string[] = [];
  
  function walkDir(dir: string, basePath: string = '') {
    const files = fs.readdirSync(dir);
    
    for (const file of files) {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        // Skip ui directory (those are tested separately)
        if (file !== 'ui' && file !== 'node_modules') {
          walkDir(fullPath, path.join(basePath, file));
        }
      } else if (file.endsWith('.tsx') && !file.endsWith('.test.tsx')) {
        const componentName = file.replace('.tsx', '');
        const relativePath = basePath ? `${basePath}/${componentName}` : componentName;
        components.push(relativePath);
      }
    }
  }
  
  walkDir(componentsDir);
  return components;
}

// Check if test exists
function testExists(componentName: string): boolean {
  const testPath = path.join(testsDir, `${componentName}.test.tsx`);
  return fs.existsSync(testPath);
}

// Run test for a component
function runTest(componentName: string): TestResult {
  const testFile = path.join(testsDir, `${componentName}.test.tsx`);
  
  if (!fs.existsSync(testFile)) {
    return {
      component: componentName,
      status: 'skip',
    };
  }

  try {
    console.log(`🧪 Testing ${componentName}...`);
    const startTime = Date.now();
    
    execSync(`npm test -- ${componentName}`, {
      stdio: 'pipe',
      cwd: process.cwd(),
    });
    
    const duration = Date.now() - startTime;
    return {
      component: componentName,
      status: 'pass',
      duration,
    };
  } catch (error: any) {
    return {
      component: componentName,
      status: 'fail',
      error: error.message || 'Test failed',
    };
  }
}

// Generate report
function generateReport(results: TestResult[]): string {
  const passed = results.filter(r => r.status === 'pass').length;
  const failed = results.filter(r => r.status === 'fail').length;
  const skipped = results.filter(r => r.status === 'skip').length;
  const total = results.length;

  const report = `
# Component Test Report

Generated: ${new Date().toISOString()}

## Summary

- **Total Components:** ${total}
- **✅ Passed:** ${passed} (${Math.round((passed / total) * 100)}%)
- **❌ Failed:** ${failed} (${Math.round((failed / total) * 100)}%)
- **⏭️  Skipped:** ${skipped} (${Math.round((skipped / total) * 100)}%)

## Results

${results.map(r => {
  const statusIcon = r.status === 'pass' ? '✅' : r.status === 'fail' ? '❌' : '⏭️';
  const duration = r.duration ? ` (${r.duration}ms)` : '';
  const error = r.error ? `\n   Error: ${r.error}` : '';
  return `${statusIcon} **${r.component}**${duration}${error}`;
}).join('\n')}

## Next Steps

${failed > 0 ? `- Fix ${failed} failing test(s)` : ''}
${skipped > 0 ? `- Generate tests for ${skipped} component(s) without tests` : ''}
${failed === 0 && skipped === 0 ? '- 🎉 All components tested!' : ''}

## Commands

\`\`\`bash
# Generate test for a component
npm run test:generate -- ComponentName

# Run specific test
npm test -- ComponentName

# Run all tests with coverage
npm run test:coverage
\`\`\`
`;

  return report;
}

// Main function
function main() {
  console.log('🔍 Scanning for components...\n');
  
  const components = getAllComponents();
  console.log(`Found ${components.length} components\n`);
  
  const results: TestResult[] = [];
  
  // Check which components have tests
  const withTests = components.filter(c => testExists(c));
  const withoutTests = components.filter(c => !testExists(c));
  
  console.log(`✅ Components with tests: ${withTests.length}`);
  console.log(`⏭️  Components without tests: ${withoutTests.length}\n`);
  
  if (withoutTests.length > 0) {
    console.log('Components without tests:');
    withoutTests.slice(0, 10).forEach(c => console.log(`  - ${c}`));
    if (withoutTests.length > 10) {
      console.log(`  ... and ${withoutTests.length - 10} more`);
    }
    console.log();
  }
  
  // Run tests
  console.log('🚀 Running tests...\n');
  
  for (const component of withTests) {
    const result = runTest(component);
    results.push(result);
    
    if (result.status === 'pass') {
      console.log(`✅ ${component} passed\n`);
    } else if (result.status === 'fail') {
      console.log(`❌ ${component} failed\n`);
    }
  }
  
  // Add skipped components
  withoutTests.forEach(component => {
    results.push({
      component,
      status: 'skip',
    });
  });
  
  // Generate report
  const report = generateReport(results);
  const reportPath = 'TEST_REPORT.md';
  fs.writeFileSync(reportPath, report);
  
  console.log(`\n📊 Report generated: ${reportPath}`);
  console.log(report);
  
  // Exit with error code if tests failed
  const failedCount = results.filter(r => r.status === 'fail').length;
  if (failedCount > 0) {
    process.exit(1);
  }
}

main();

