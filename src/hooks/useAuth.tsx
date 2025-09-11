
import { useState, useEffect, createContext, useContext } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<any>;
  signUp: (email: string, password: string, name?: string) => Promise<any>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Listen for auth changes FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state change:', event, session?.user?.email);
        
        // Check if user account is deleted in profiles table
        // Temporarily disabled until migration is applied
        // if (session?.user) {
        //   const { data: profile } = await supabase
        //     .from('profiles')
        //     .select('status')
        //     .eq('id', session.user.id)
        //     .single();
        //   
        //   if (profile?.status === 'deleted') {
        //     console.log('User account is deleted, signing out');
        //     await supabase.auth.signOut();
        //     setSession(null);
        //     setUser(null);
        //     setLoading(false);
        //     return;
        //   }
        // }
        
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    // THEN get initial session only once
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      // Check if user account is deleted in profiles table
      // Temporarily disabled until migration is applied
      // if (session?.user) {
      //   const { data: profile } = await supabase
      //     .from('profiles')
      //     .select('status')
      //     .eq('id', session.user.id)
      //     .single();
      //   
      //   if (profile?.status === 'deleted') {
      //     console.log('Initial session user account is deleted, signing out');
      //     await supabase.auth.signOut();
      //     setSession(null);
      //     setUser(null);
      //     setLoading(false);
      //     return;
      //   }
      // }
      
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    }).catch(error => {
      console.error('Error getting session:', error);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    
    // Check if user account is deleted in profiles table
    // Temporarily disabled until migration is applied
    // if (data.user) {
    //   const { data: profile } = await supabase
    //     .from('profiles')
    //     .select('status')
    //     .eq('id', data.user.id)
    //     .single();
    //   
    //   if (profile?.status === 'deleted') {
    //     // Sign out the user immediately
    //     await supabase.auth.signOut();
    //     // Return invalid credentials error to maintain security
    //     return {
    //       data: null,
    //       error: {
    //         message: 'Invalid login credentials'
    //       }
    //     };
    //   }
    // }
    
    return { data, error };
  };

  const signUp = async (email: string, password: string, name?: string) => {
    return await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name: name,
        },
      },
    });
  };

  const signOut = async () => {
    try {
      console.log('Signing out...');
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      console.log('Sign out successful');
    } catch (error) {
      console.error('Sign out error:', error);
      // Force clear local state even if API call fails
      setSession(null);
      setUser(null);
    }
  };


  return (
    <AuthContext.Provider value={{
      user,
      session,
      loading,
      signIn,
      signUp,
      signOut,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
