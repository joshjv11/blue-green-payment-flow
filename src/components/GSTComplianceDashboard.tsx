import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, AlertCircle, Clock, Shield, FileText, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface ComplianceStatus {
  gstr1Filed: boolean;
  itcReconciled: boolean;
  einvoiceGenerated: boolean;
  irnDeadlineDays: number;
  complianceScore: number;
}

interface GSTComplianceDashboardProps {
  className?: string;
}

export function GSTComplianceDashboard({ className }: GSTComplianceDashboardProps) {
  const [status, setStatus] = useState<ComplianceStatus>({
    gstr1Filed: false,
    itcReconciled: false,
    einvoiceGenerated: false,
    irnDeadlineDays: 15,
    complianceScore: 65,
  });

  // Simulate loading and updating status
  useEffect(() => {
    // In real app, fetch from API
    const interval = setInterval(() => {
      setStatus(prev => ({
        ...prev,
        complianceScore: Math.min(100, prev.complianceScore + Math.random() * 2),
      }));
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const getComplianceColor = (score: number) => {
    if (score >= 80) return 'text-success';
    if (score >= 50) return 'text-yellow-500';
    return 'text-destructive';
  };

  const getStatusBadge = (isComplete: boolean) => {
    if (isComplete) {
      return (
        <Badge className="bg-success/20 text-success border-success/30">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Complete
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="border-amber-500/30 text-amber-600 dark:text-amber-400">
        <Clock className="h-3 w-3 mr-1" />
        Pending
      </Badge>
    );
  };

  const getIRNStatus = (days: number) => {
    if (days < 7) {
      return {
        color: 'text-destructive',
        bg: 'bg-destructive/10',
        border: 'border-destructive/30',
        pulse: true,
      };
    }
    if (days < 15) {
      return {
        color: 'text-amber-600 dark:text-amber-400',
        bg: 'bg-amber-500/10',
        border: 'border-amber-500/30',
        pulse: false,
      };
    }
    return {
      color: 'text-success',
      bg: 'bg-success/10',
      border: 'border-success/30',
      pulse: false,
    };
  };

  const irnStatus = getIRNStatus(status.irnDeadlineDays);

  return (
    <div className={cn("space-y-6", className)}>
      {/* Compliance Score Card */}
      <Card className="glass-card border-2 bg-gradient-to-br from-gst-teal/5 via-gst-emerald/5 to-transparent">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-gst-teal" />
                GST Compliance Score
              </CardTitle>
              <CardDescription>Real-time compliance tracking</CardDescription>
            </div>
            <div className="relative">
              {/* Circular Progress Ring */}
              <svg className="w-24 h-24 transform -rotate-90">
                <circle
                  cx="48"
                  cy="48"
                  r="40"
                  stroke="currentColor"
                  strokeWidth="6"
                  fill="none"
                  className="text-muted/20"
                />
                <motion.circle
                  cx="48"
                  cy="48"
                  r="40"
                  stroke="currentColor"
                  strokeWidth="6"
                  fill="none"
                  strokeLinecap="round"
                  className={cn(
                    status.complianceScore >= 80 ? 'text-success' :
                    status.complianceScore >= 50 ? 'text-yellow-500' :
                    'text-destructive'
                  )}
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: status.complianceScore / 100 }}
                  transition={{ duration: 1, ease: "easeOut" }}
                  strokeDasharray={`${2 * Math.PI * 40}`}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className={cn("text-2xl font-bold", getComplianceColor(status.complianceScore))}>
                  {Math.round(status.complianceScore)}%
                </span>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Overall Compliance</span>
              <span className={cn("text-sm font-semibold", getComplianceColor(status.complianceScore))}>
                {status.complianceScore >= 80 ? 'Compliant' : status.complianceScore >= 50 ? 'Action Needed' : 'Overdue'}
              </span>
            </div>
            <Progress 
              value={status.complianceScore} 
              className="h-2"
            />
            <div className="flex gap-2 mt-4">
              <Badge 
                variant="outline" 
                className={cn(
                  "flex-1 justify-center",
                  status.complianceScore >= 80 ? 'border-success text-success bg-success/10' :
                  status.complianceScore >= 50 ? 'border-yellow-500 text-yellow-600 dark:text-yellow-400 bg-yellow-500/10' :
                  'border-destructive text-destructive bg-destructive/10'
                )}
              >
                {status.complianceScore >= 80 ? '✅ Compliant' : 
                 status.complianceScore >= 50 ? '⚠️ Action Needed' : 
                 '❌ Overdue'}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Status Checklist */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="glass-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <FileText className="h-4 w-4" />
              GSTR-1 Filing
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              {getStatusBadge(status.gstr1Filed)}
              {status.gstr1Filed ? (
                <CheckCircle2 className="h-5 w-5 text-success" />
              ) : (
                <AlertCircle className="h-5 w-5 text-amber-500" />
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              ITC Reconciled
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              {getStatusBadge(status.itcReconciled)}
              {status.itcReconciled ? (
                <CheckCircle2 className="h-5 w-5 text-success" />
              ) : (
                <AlertCircle className="h-5 w-5 text-amber-500" />
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Shield className="h-4 w-4" />
              E-Invoice Generated
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              {getStatusBadge(status.einvoiceGenerated)}
              {status.einvoiceGenerated ? (
                <CheckCircle2 className="h-5 w-5 text-success" />
              ) : (
                <AlertCircle className="h-5 w-5 text-amber-500" />
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* IRN Deadline Countdown */}
      <Card className={cn(
        "glass-card border-2",
        irnStatus.border,
        irnStatus.bg,
        irnStatus.pulse && "animate-pulse"
      )}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className={cn("h-5 w-5", irnStatus.color)} />
            <span className={irnStatus.color}>30-Day IRN Deadline</span>
          </CardTitle>
          <CardDescription>
            Time remaining to generate Invoice Reference Number
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <div className={cn("text-3xl font-bold mb-1", irnStatus.color)}>
                {status.irnDeadlineDays} Days
              </div>
              <div className="text-sm text-muted-foreground">
                {status.irnDeadlineDays < 7 
                  ? '⚠️ Urgent: Generate IRN immediately' 
                  : status.irnDeadlineDays < 15
                  ? 'Action needed soon'
                  : 'On track'}
              </div>
            </div>
            {status.irnDeadlineDays < 7 && (
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
                className="w-3 h-3 rounded-full bg-destructive"
              />
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

