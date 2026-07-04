import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { User, Loader2 } from 'lucide-react';
import { getProfile } from '@/lib/endpoints/profile';

export function ProfileSettings() {
  const { user, updateProfile, resendVerification } = useAuth();
  const { toast } = useToast();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        if (!user) return;
        const profile = await getProfile();
        setFullName(profile.user.full_name ?? '');
        setEmail(profile.user.email);
      } catch {
        setFullName(user.full_name ?? '');
        setEmail(user.email);
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  const handleSave = async () => {
    if (!fullName.trim()) {
      toast({ title: 'Name required', description: 'Please enter your full name.', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      await updateProfile(fullName.trim());
      toast({ title: 'Profile saved', description: 'Your name has been updated.' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <User className="h-5 w-5" />
          <CardTitle>Account</CardTitle>
        </div>
        <CardDescription>Your personal account details stored securely on our server.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="profile-email">Email</Label>
          <Input id="profile-email" value={email} readOnly className="bg-muted" />
          {user && !user.verified && (
            <div className="mt-2 flex items-center gap-2">
              <Badge variant="outline">Unverified</Badge>
              <button
                type="button"
                onClick={() => resendVerification()}
                className="text-sm text-primary underline underline-offset-2"
              >
                Resend verification email
              </button>
            </div>
          )}
        </div>
        <div>
          <Label htmlFor="profile-name">Full name</Label>
          <Input
            id="profile-name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Your name"
          />
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save profile'}
        </Button>
      </CardContent>
    </Card>
  );
}
