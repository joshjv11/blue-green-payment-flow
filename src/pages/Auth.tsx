import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthForm from '@/components/auth/AuthForm';
import { useAuth } from '@/hooks/useAuth';

const Auth = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  useEffect(() => {
    // Only redirect if we have a confirmed user and not loading
    if (user && !loading) {
      console.log('🔄 User authenticated, redirecting to dashboard');
      navigate('/dashboard', { replace: true });
    }
  }, [user, loading, navigate]);

  const handleAuthSuccess = () => {
    // The useEffect above will handle the redirect
    console.log('✅ Auth success callback triggered');
  };

  // Show loading state while checking auth
  if (loading) {
    return (
      <div className="min-h-screen bg-feature-gradient flex items-center justify-center p-4">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
          <p className="text-white text-sm">Checking authentication...</p>
        </div>
      </div>
    );
  }

  // Don't render auth form if user is already authenticated
  if (user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-feature-gradient flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <AuthForm onSuccess={handleAuthSuccess} />
      </div>
    </div>
  );
};

export default Auth;