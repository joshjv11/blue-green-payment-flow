#!/bin/bash

# Component Test Runner
# Provides easy commands to run tests in different modes

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

case "$1" in
  "all")
    echo -e "${BLUE}🧪 Running all tests...${NC}"
    npm test
    ;;
  "watch")
    echo -e "${BLUE}👀 Running tests in watch mode...${NC}"
    npm run test:watch
    ;;
  "coverage")
    echo -e "${BLUE}📊 Running tests with coverage...${NC}"
    npm run test:coverage
    ;;
  "components")
    echo -e "${BLUE}🧩 Running component tests only...${NC}"
    npm run test:components
    ;;
  "generate")
    if [ -z "$2" ]; then
      echo -e "${YELLOW}⚠️  Usage: npm run test:runner -- generate <component-name>${NC}"
      echo -e "${YELLOW}   or: npm run test:runner -- generate all${NC}"
      exit 1
    fi
    echo -e "${BLUE}🔧 Generating test for: $2${NC}"
    npm run test:generate -- "$2"
    ;;
  "ui")
    echo -e "${BLUE}🎨 Opening Vitest UI...${NC}"
    npm run test:ui
    ;;
  *)
    echo -e "${GREEN}Component Test Runner${NC}"
    echo ""
    echo "Usage: npm run test:runner -- <command>"
    echo ""
    echo "Commands:"
    echo "  all        - Run all tests"
    echo "  watch      - Run tests in watch mode"
    echo "  coverage   - Run tests with coverage report"
    echo "  components - Run component tests only"
    echo "  generate   - Generate test file (requires component name)"
    echo "  ui         - Open Vitest UI"
    echo ""
    echo "Examples:"
    echo "  npm run test:runner -- all"
    echo "  npm run test:runner -- generate SavingsGoalCard"
    echo "  npm run test:runner -- generate all"
    ;;
esac

