import { ProfileSettings } from '@/components/ProfileSettings';
import { BusinessSettings } from '@/components/BusinessSettings';

export default function Settings() {
  return (
    <div className="container max-w-3xl mx-auto py-8 px-4 space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground mt-1">
          Manage your account and business profile. Changes are saved to the database immediately.
        </p>
      </div>
      <ProfileSettings />
      <BusinessSettings />
    </div>
  );
}
