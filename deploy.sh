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

# Step 4: Check for Vercel auto-deploy setup
VERCEL_AUTO_DEPLOY_ENABLED=false
if [ -f ".vercel/project.json" ]; then
    echo -e "${GREEN}✅ Vercel project detected (.vercel/project.json found)${NC}"
    echo -e "${BLUE}📋 Auto-deployment should be enabled if project is connected to GitHub${NC}"
    echo -e "${BLUE}   Check Vercel dashboard: https://vercel.com/dashboard${NC}"
    echo -e "${BLUE}   Your deployment should start automatically in ~30-60 seconds${NC}\n"
    VERCEL_AUTO_DEPLOY_ENABLED=true
fi

# Step 5: Check if Vercel CLI is installed (for manual deployment option)
if command -v vercel &> /dev/null; then
    if [ "$VERCEL_AUTO_DEPLOY_ENABLED" = true ]; then
        echo -e "${YELLOW}💡 Vercel CLI is available. You can also deploy manually with:${NC}"
        echo -e "${YELLOW}   npm run deploy:vercel${NC}"
        echo -e "${YELLOW}   (But auto-deploy should handle this automatically)${NC}\n"
        read -p "Deploy manually now anyway? (y/n) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            echo -e "${BLUE}🌐 Deploying via Vercel CLI...${NC}"
            vercel --prod
        else
            echo -e "${GREEN}✅ Skipping manual deployment. Auto-deploy will handle it.${NC}"
        fi
    else
        echo -e "${BLUE}🌐 Vercel CLI detected. Deploying to Vercel...${NC}"
        
        # Check if already linked to a project
        if [ -f ".vercel/project.json" ]; then
            echo -e "${GREEN}✅ Vercel project already linked${NC}"
            vercel --prod
        else
            echo -e "${YELLOW}⚠️  Vercel project not linked. Running 'vercel' for first-time setup...${NC}"
            echo -e "${YELLOW}Note: You'll need to authenticate and configure environment variables${NC}"
            echo -e "${YELLOW}After setup, enable GitHub integration in Vercel dashboard for auto-deploy${NC}"
            vercel
        fi
    fi
elif command -v netlify &> /dev/null; then
    echo -e "${BLUE}🌐 Netlify CLI detected. Deploying to Netlify...${NC}"
    netlify deploy --prod
else
    # Step 5: No CLI found - provide instructions
    echo -e "\n${YELLOW}⚠️  No deployment CLI found.${NC}"
    echo -e "${BLUE}📋 Your code has been pushed to GitHub!${NC}"
    echo -e "\n${GREEN}Next steps for automatic deployment:${NC}\n"
    
    echo -e "${BLUE}Option 1: Set up Vercel Auto-Deploy (Recommended)${NC}"
    echo "1. Go to: https://vercel.com"
    echo "2. Sign in with GitHub"
    echo "3. Click 'Add New Project'"
    echo "4. Import: joshjv11/blue-green-payment-flow"
    echo "5. Configure:"
    echo "   - Framework: Vite (auto-detected)"
    echo "   - Build Command: npm run build (auto-detected)"
    echo "   - Output Directory: dist (auto-detected)"
    echo "6. Add Environment Variables in Settings:"
    echo "   - VITE_SUPABASE_URL (required)"
    echo "   - VITE_SUPABASE_ANON_KEY (required)"
    echo "   - VITE_GROQ_API_KEY (optional)"
    echo "   - VITE_OPENAI_API_KEY (optional)"
    echo "   - VITE_GEMINI_API_KEY (optional)"
    echo "7. Click 'Deploy'"
    echo -e "\n${GREEN}Once configured, Vercel will auto-deploy on every git push!${NC}"
    echo -e "${GREEN}See VERCEL_SETUP.md for detailed instructions.${NC}\n"
    
    echo -e "${BLUE}Option 2: Install Vercel CLI for automated deployments${NC}"
    echo "Run: npm install -g vercel"
    echo "Then run this script again or use: vercel"
fi

echo -e "\n${GREEN}✅ Deployment process completed!${NC}"
echo -e "${BLUE}🔗 Your repository: https://github.com/joshjv11/blue-green-payment-flow${NC}\n"

