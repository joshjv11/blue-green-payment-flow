import { Button } from './ui/button';
import { Mail } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const AuthButtons = () => {
  const navigate = useNavigate();

  return (
    <div className="space-y-4">
      <Button
        onClick={() => navigate('/auth')}
        size="lg"
        className="w-full h-14 text-lg font-semibold bg-white text-primary hover:bg-white/90 shadow-lg"
      >
        <Mail className="mr-2 h-5 w-5" />
        Sign In with Email
      </Button>
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-white/20"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-4 bg-transparent text-white/80">or</span>
        </div>
      </div>
      <Button
        onClick={() => navigate('/auth')}
        size="lg"
        variant="outline"
        className="w-full h-14 text-lg font-semibold bg-transparent text-white border-white/30 hover:bg-white/10"
      >
        Continue with Google
      </Button>
    </div>
  );
};

export default AuthButtons;
