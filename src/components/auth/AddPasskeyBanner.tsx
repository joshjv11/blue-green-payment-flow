import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Shield, X, Loader2 } from 'lucide-react';
import { useAnalytics } from '@/hooks/useAnalytics';

interface AddPasskeyBannerProps {
  onDismiss?: () => void;
  className?: string;
}

const AddPasskeyBanner = ({ onDismiss, className }: AddPasskeyBannerProps) => {
  const [isCreating, setIsCreating] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const { toast } = useToast();
  const { track } = useAnalytics();

  if (isDismissed) return null;

  const handleCreatePasskey = async () => {
    setIsCreating(true);
    try {
      track('auth_add_passkey_clicked', {});

      // Generate a challenge
      const challenge = new Uint8Array(32);
      crypto.getRandomValues(challenge);

      // Create a new passkey
      const credential = await navigator.credentials.create({
        publicKey: {
          challenge,
          rp: {
            name: "InvoiceFlow",
            id: window.location.hostname,
          },
          user: {
            id: new TextEncoder().encode("user-id"), // Replace with actual user ID
            name: "user@example.com", // Replace with actual email
            displayName: "User Name", // Replace with actual name
          },
          pubKeyCredParams: [
            { alg: -7, type: "public-key" }, // ES256
            { alg: -257, type: "public-key" }, // RS256
          ],
          authenticatorSelection: {
            authenticatorAttachment: "platform",
            userVerification: "preferred",
            requireResidentKey: false,
          },
          timeout: 60000,
          attestation: "direct",
        }
      });

      if (credential) {
        // Store the credential (in a real app, send to your backend)
        localStorage.setItem('invoiceflow_has_passkey', 'true');
        
        toast({
          title: "Passkey created!",
          description: "You can now sign in instantly with your passkey",
        });

        setIsDismissed(true);
        onDismiss?.();
      }
    } catch (error: any) {
      console.error('Failed to create passkey:', error);
      
      if (error.name !== 'NotAllowedError') {
        toast({
          title: "Couldn't create passkey",
          description: "Please try again or skip for now",
          variant: "destructive",
        });
      }
    } finally {
      setIsCreating(false);
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    onDismiss?.();
  };

  return (
    <Card className={`border-primary/20 bg-primary/5 ${className}`}>
      <CardContent className="p-4">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
              <Shield className="h-4 w-4 text-primary" />
            </div>
          </div>
          
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-medium text-foreground">
              Make this instant next time?
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              Add a passkey to this device for one-tap sign-in.
            </p>
            
            <div className="flex items-center space-x-2 mt-3">
              <Button
                size="sm"
                onClick={handleCreatePasskey}
                disabled={isCreating}
                className="h-8 px-3 text-xs"
              >
                {isCreating ? (
                  <>
                    <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Shield className="mr-1 h-3 w-3" />
                    Add Passkey
                  </>
                )}
              </Button>
              
              <Button
                size="sm"
                variant="ghost"
                onClick={handleDismiss}
                className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
              >
                Skip
              </Button>
            </div>
          </div>
          
          <Button
            size="sm"
            variant="ghost"
            onClick={handleDismiss}
            className="flex-shrink-0 h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default AddPasskeyBanner;