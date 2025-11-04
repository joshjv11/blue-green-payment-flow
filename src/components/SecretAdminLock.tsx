import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

const ADMIN_PASSWORD = 'Deathground333';

export function SecretAdminLock() {
  const location = useLocation();
  const isPublicPage = ['/', '/auth', '/terms', '/privacy'].includes(location.pathname);
  
  // Don't show on public pages
  if (isPublicPage) return null;
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (password === ADMIN_PASSWORD) {
      // Set authentication in sessionStorage (same as AdminCMS page)
      sessionStorage.setItem('admin_cms_authenticated', 'true');
      toast({
        title: 'Access Granted',
        description: 'Redirecting to Admin CMS...',
      });
      setOpen(false);
      setPassword('');
      navigate('/admin-cms');
    } else {
      toast({
        title: 'Access Denied',
        description: 'Incorrect password',
        variant: 'destructive',
      });
      setPassword('');
    }
    setLoading(false);
  };

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setOpen(true)}
        className="fixed bottom-4 right-4 z-50 h-12 w-12 rounded-full bg-background/90 backdrop-blur-sm border-2 border-border shadow-lg hover:bg-background hover:border-primary/50 transition-all hover:scale-110"
        title="Admin Access"
      >
        <Lock className="h-5 w-5 text-muted-foreground hover:text-primary transition-colors" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Admin Access
            </DialogTitle>
            <DialogDescription>
              Enter the admin password to access the CMS dashboard
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="admin-password">Password</Label>
              <Input
                id="admin-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter admin password"
                autoFocus
                disabled={loading}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSubmit(e);
                  }
                }}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setOpen(false);
                  setPassword('');
                }}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading || !password}>
                {loading ? 'Verifying...' : 'Access'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
