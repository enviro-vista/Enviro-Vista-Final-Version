import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import LoginForm from '@/components/auth/LoginForm';
import SignUpForm from '@/components/auth/SignUpForm';

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const { user, loading: authLoading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  
  // Check if there's a redirect location in state
  const from = location.state?.from?.pathname || "/";

  useEffect(() => {
    if (user) {
      // Redirect to the original requested page or home
      navigate(from, { replace: true });
    }
  }, [user, navigate, from]);

  const toggleMode = () => setIsLogin(!isLogin);
  
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
            {isLogin ? "Sign in to your account" : "Create a new account"}
          </p>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          {isLogin ? (
            <LoginForm 
              onToggleMode={toggleMode} 
              onLoadingChange={setLoading}
            />
          ) : (
            <SignUpForm 
              onToggleMode={toggleMode} 
              onLoadingChange={setLoading}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default Auth;