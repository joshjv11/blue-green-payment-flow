#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Starting automated deployment...${NC}\n"

# Step 1: Check if we're on main branch
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "main" ]; then
    echo -e "${YELLOW}⚠️  Warning: You're on branch '$CURRENT_BRANCH', not 'main'${NC}"
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Step 2: Check for uncommitted changes
if [ -n "$(git status --porcelain)" ]; then
    echo -e "${YELLOW}⚠️  You have uncommitted changes.${NC}"
    echo -e "${YELLOW}Staging all changes...${NC}"
    git add -A
    git status
    read -p "Commit these changes? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        read -p "Enter commit message (or press Enter for default): " COMMIT_MSG
        if [ -z "$COMMIT_MSG" ]; then
            COMMIT_MSG="Deploy: Auto-commit before deployment"
        fi
        git commit -m "$COMMIT_MSG"
    else
        echo -e "${RED}❌ Deployment cancelled${NC}"
        exit 1
    fi
fi

# Step 3: Push to GitHub
echo -e "\n${BLUE}📤 Pushing to GitHub...${NC}"
if git push origin main; then
    echo -e "${GREEN}✅ Successfully pushed to GitHub${NC}\n"
else
    echo -e "${RED}❌ Failed to push to GitHub${NC}"
    exit 1
fi

# Step 4: Check if Vercel CLI is installed
if command -v vercel &> /dev/null; then
    echo -e "${BLUE}🌐 Vercel CLI detected. Deploying to Vercel...${NC}"
    
    # Check if already linked to a project
    if [ -f ".vercel/project.json" ]; then
        echo -e "${GREEN}✅ Vercel project already linked${NC}"
        vercel --prod
    else
        echo -e "${YELLOW}⚠️  Vercel project not linked. Running 'vercel' for first-time setup...${NC}"
        echo -e "${YELLOW}Note: You'll need to authenticate and configure environment variables${NC}"
        vercel
    fi
elif command -v netlify &> /dev/null; then
    echo -e "${BLUE}🌐 Netlify CLI detected. Deploying to Netlify...${NC}"
    netlify deploy --prod
else
    # Step 5: No CLI found - provide instructions
    echo -e "\n${YELLOW}⚠️  No deployment CLI found.${NC}"
    echo -e "${BLUE}📋 Your code has been pushed to GitHub!${NC}"
    echo -e "\n${GREEN}Next steps for automatic deployment:${NC}\n"
    
    echo -e "${BLUE}Option 1: Deploy via Vercel (Recommended)${NC}"
    echo "1. Go to: https://vercel.com"
    echo "2. Sign in with GitHub"
    echo "3. Click 'Add New Project'"
    echo "4. Import: joshjv11/blue-green-payment-flow"
    echo "5. Configure:"
    echo "   - Framework: Vite"
    echo "   - Build Command: npm run build"
    echo "   - Output Directory: dist"
    echo "6. Add Environment Variables:"
    echo "   - VITE_GROQ_API_KEY (from your .env file)"
    echo "   - VITE_OPENAI_API_KEY (optional)"
    echo "   - VITE_GEMINI_API_KEY (optional)"
    echo "7. Click 'Deploy'"
    echo -e "\n${BLUE}Once configured, Vercel will auto-deploy on every git push!${NC}\n"
    
    echo -e "${BLUE}Option 2: Install Vercel CLI for automated deployments${NC}"
    echo "Run: npm install -g vercel"
    echo "Then run this script again or use: vercel"
fi

echo -e "\n${GREEN}✅ Deployment process completed!${NC}"
echo -e "${BLUE}🔗 Your repository: https://github.com/joshjv11/blue-green-payment-flow${NC}\n"

