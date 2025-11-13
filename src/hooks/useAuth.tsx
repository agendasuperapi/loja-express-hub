import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  signUp: (email: string, password: string, fullName?: string, phone?: string, skipNavigation?: boolean) => Promise<{ error: any }>;
  signIn: (email: string, password: string, skipNavigation?: boolean) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, fullName?: string, phone?: string, skipNavigation?: boolean) => {
    const redirectUrl = `https://appofertas.lovable.app/`;
    
    const { error, data } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName,
          phone: phone,
        }
      }
    });

    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Conta criada com sucesso!');
      if (!skipNavigation && data.user) {
        // Check user roles to determine navigation - prioritize store_owner, then employee
        const { data: rolesData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', data.user.id);
        
        const roles = rolesData?.map(r => r.role) || [];
        
        // Check if user is a store owner
        if (roles.includes('store_owner')) {
          console.log('Auth signUp redirect: store_owner to /dashboard-lojista');
          navigate('/dashboard-lojista');
          return { error };
        }
        
        // Check if user is an active employee
        const { data: employeeData } = await supabase
          .from('store_employees' as any)
          .select('id, store_id, is_active')
          .eq('user_id', data.user.id)
          .eq('is_active', true)
          .single();
        
        if (employeeData) {
          console.log('Auth signUp redirect: employee to /dashboard-lojista');
          navigate('/dashboard-lojista');
          return { error };
        }
        
        // Default to customer dashboard
        console.log('Auth signUp redirect: customer to /dashboard');
        navigate('/dashboard');
      }
    }

    return { error };
  };

  const signIn = async (email: string, password: string, skipNavigation?: boolean) => {
    const { error, data } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Login realizado com sucesso!');
      if (!skipNavigation && data.user) {
        // Check user roles to determine navigation - prioritize store_owner, then employee
        const { data: rolesData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', data.user.id);
        
        const roles = rolesData?.map(r => r.role) || [];
        
        // Check if user is a store owner
        if (roles.includes('store_owner')) {
          console.log('Auth signIn redirect: store_owner to /dashboard-lojista');
          navigate('/dashboard-lojista');
          return { error };
        }
        
        // Check if user is an active employee
        const { data: employeeData } = await supabase
          .from('store_employees' as any)
          .select('id, store_id, is_active')
          .eq('user_id', data.user.id)
          .eq('is_active', true)
          .single();
        
        if (employeeData) {
          console.log('Auth signIn redirect: employee to /dashboard-lojista');
          navigate('/dashboard-lojista');
          return { error };
        }
        
        // Default to customer dashboard
        console.log('Auth signIn redirect: customer to /dashboard');
        navigate('/dashboard');
      }
    }

    return { error };
  };

  const signOut = async () => {
    // Check if user is store_owner or employee before signing out
    let isStoreOwnerOrEmployee = false;
    if (user) {
      const { data: rolesData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);
      
      const roles = rolesData?.map(r => r.role) || [];
      isStoreOwnerOrEmployee = roles.includes('store_owner');
      
      // Se não é store_owner, verificar se é funcionário
      if (!isStoreOwnerOrEmployee) {
        const { data: employeeData } = await supabase
          .from('store_employees' as any)
          .select('id')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .limit(1)
          .maybeSingle();
        
        isStoreOwnerOrEmployee = !!employeeData;
      }
    }

    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    toast.success('Logout realizado com sucesso!');
    
    // Redirect based on user role
    navigate(isStoreOwnerOrEmployee ? '/login-lojista' : '/');
  };

  return (
    <AuthContext.Provider value={{ user, session, signUp, signIn, signOut, loading }}>
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
