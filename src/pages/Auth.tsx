import { useState, useEffect } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import LoginForm from '@/components/auth/LoginForm';
import SignUpForm from '@/components/auth/SignUpForm';
import ForgotPasswordForm from '@/components/auth/ForgotPasswordForm';
import ResetPasswordForm from '@/components/auth/ResetPasswordForm';

const Auth = () => {
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot-password' | 'reset-password'>('login');
  const [loading, setLoading] = useState(false);
  const { user, loading: authLoading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  // Check if there's a redirect location in state
  const from = location.state?.from?.pathname || "/";

  useEffect(() => {
    // Check if this is a password reset redirect FIRST, before checking user auth
    const mode = searchParams.get('mode');
    const type = searchParams.get('type');
    console.log('mode', mode, 'type', type, 'user', user?.email);
    
    // Check for password reset via URL parameters
    if (mode == 'reset-password' || type == 'recovery') {
      console.log('Setting mode to reset-password');
      setMode('reset-password');
    }

    // Only redirect authenticated users for normal login flow
    if (user && mode !== 'reset-password' && type !== 'recovery') {
      console.log('User authenticated, redirecting to:', from);
      navigate(from, { replace: true });
    }
  }, [user, navigate, from, searchParams]);

  const toggleMode = (newMode?: 'login' | 'signup' | 'forgot-password' | 'reset-password') => {
    if (newMode) {
      setMode(newMode);
    } else {
      setMode(mode === 'login' ? 'signup' : 'login');
    }
  };
  
  if (authLoading) {
    return (
      <div className="min-h-screen bg-dashboard-bg flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Checking authentication...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dashboard-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Enviro-Vista</h1>
          <p className="text-muted-foreground mt-2">
            {mode === 'login' && "Sign in to your account"}
            {mode === 'signup' && "Create a new account"}
            {mode === 'forgot-password' }
            {mode === 'reset-password'}
          </p>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          {mode === 'login' && (
            <LoginForm 
              onToggleMode={toggleMode} 
              onLoadingChange={setLoading}
            />
          )}
          {mode === 'signup' && (
            <SignUpForm 
              onToggleMode={toggleMode} 
              onLoadingChange={setLoading}
            />
          )}
          {mode === 'forgot-password' && (
            <ForgotPasswordForm 
              onBackToLogin={() => toggleMode('login')} 
              onLoadingChange={setLoading}
            />
          )}
          {mode === 'reset-password' && (
            <ResetPasswordForm />
          )}
        </div>
      </div>
    </div>
  );
};

export default Auth;