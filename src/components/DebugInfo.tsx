import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useSupabasePlan } from '@/hooks/useSupabasePlan';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Eye, EyeOff, RefreshCw } from 'lucide-react';

interface DebugInfoProps {
  className?: string;
}

const DebugInfo = ({ className }: DebugInfoProps) => {
  const [isVisible, setIsVisible] = useState(false);
  
  // Gracefully handle auth context not being available
  let user = null;
  let session = null;
  let authLoading = true;
  
  try {
    const auth = useAuth();
    user = auth.user;
    session = auth.session;
    authLoading = auth.loading;
  } catch (error) {
    console.warn('DebugInfo: useAuth not available, running outside AuthProvider');
    authLoading = false;
  }
  
  // Gracefully handle plan context not being available
  let plan = null;
  let aiQueriesUsed = 0;
  let aiQueriesLimit = 0;
  let planLoading = true;
  let fetchUserPlan = null;
  
  try {
    const planData = useSupabasePlan();
    plan = planData.plan;
    aiQueriesUsed = planData.aiQueriesUsed;
    aiQueriesLimit = planData.aiQueriesLimit;
    planLoading = planData.loading;
    fetchUserPlan = planData.fetchUserPlan;
  } catch (error) {
    console.warn('DebugInfo: useSupabasePlan not available');
    planLoading = false;
  }

  const handleRefresh = () => {
    console.log('🔄 Manual refresh triggered');
    if (fetchUserPlan) {
      fetchUserPlan();
    }
  };

  if (!isVisible) {
    return (
      <div className={`fixed bottom-20 right-4 z-[35] lg:bottom-4 ${className}`}>
        <Button
          onClick={() => setIsVisible(true)}
          size="sm"
          variant="secondary"
          className="h-8 w-8 p-0 opacity-70 hover:opacity-100"
        >
          <Eye className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className={`fixed bottom-20 right-4 z-[35] w-80 max-w-[90vw] lg:bottom-4 ${className}`}>
      <Card className="shadow-lg">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">Debug Info</CardTitle>
            <div className="flex gap-1">
              <Button
                onClick={handleRefresh}
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0"
              >
                <RefreshCw className="h-3 w-3" />
              </Button>
              <Button
                onClick={() => setIsVisible(false)}
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0"
              >
                <EyeOff className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 text-xs">
          <div>
            <div className="font-medium mb-1">Auth Status</div>
            <div className="space-y-1">
              <div className="flex justify-between">
                <span>Loading:</span>
                <Badge variant={authLoading ? "destructive" : "secondary"}>
                  {authLoading ? "Yes" : "No"}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span>User:</span>
                <Badge variant={user ? "default" : "secondary"}>
                  {user ? "✓" : "None"}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span>Session:</span>
                <Badge variant={session ? "default" : "secondary"}>
                  {session ? "✓" : "None"}
                </Badge>
              </div>
              {user && (
                <div className="text-xs text-muted-foreground truncate">
                  {user.email}
                </div>
              )}
            </div>
          </div>

          <div>
            <div className="font-medium mb-1">Plan Status</div>
            <div className="space-y-1">
              <div className="flex justify-between">
                <span>Loading:</span>
                <Badge variant={planLoading ? "destructive" : "secondary"}>
                  {planLoading ? "Yes" : "No"}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span>Plan:</span>
                <Badge variant={plan === 'pro' ? "default" : "secondary"}>
                  {plan || "None"}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span>AI Queries:</span>
                <span className="text-muted-foreground">
                  {aiQueriesUsed}/{aiQueriesLimit}
                </span>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t">
            <div className="text-xs text-muted-foreground">
              Check browser console for detailed logs
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DebugInfo;