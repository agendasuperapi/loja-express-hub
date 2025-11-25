import { useState, useEffect, createContext, useContext, ReactNode, useRef } from 'react';
import { User, Session, AuthChangeEvent } from '@supabase/supabase-js';
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

  const prevUserRef = useRef<User | null>(null);

  // Log de visibilidade
  useEffect(() => {
    const handleVisibilityChange = () => {
      console.log('[Auth] 👁️ Visibilidade mudou:', document.visibilityState, 'timestamp:', Date.now());
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  useEffect(() => {
    let mounted = true;
    let initialSessionReceived = false;

    // Set up auth state listener FIRST to avoid race conditions
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event: AuthChangeEvent, session) => {
      if (!mounted) return;
      
      // Logar TODOS os eventos antes do filtro
      console.log('[Auth] 📢 EVENTO RECEBIDO:', { 
        event, 
        userId: session?.user?.id,
        prevUserId: prevUserRef.current?.id,
        timestamp: Date.now(),
        willProcess: event !== 'TOKEN_REFRESHED' || session?.user?.id !== prevUserRef.current?.id
      });
      
      // Ignorar TOKEN_REFRESHED se o usuário não mudou (evita re-renders ao voltar ao foco)
      if (event === 'TOKEN_REFRESHED') {
        const currentUserId = session?.user?.id;
        const prevUserId = prevUserRef.current?.id;
        
        if (currentUserId === prevUserId) {
          console.log('[Auth] ⏭️ TOKEN_REFRESHED ignorado - mesmo usuário');
          return;
        }
      }
      
      console.log('[Auth] ✅ Evento processado:', event, 'novo userId:', session?.user?.id);
      
      setSession(session ?? null);
      setUser(session?.user ?? null);
      prevUserRef.current = session?.user ?? null;

      // INITIAL_SESSION é o evento que indica que o Supabase terminou de verificar o storage
      if (event === 'INITIAL_SESSION') {
        initialSessionReceived = true;
        setLoading(false);
      } else if (initialSessionReceived) {
        // Só atualiza loading para outros eventos APÓS receber a sessão inicial
        setLoading(false);
      }
    });

    // Fallback: Se após 3 segundos não receber INITIAL_SESSION, usa getSession
    const timeoutId = setTimeout(() => {
      if (!mounted || initialSessionReceived) return;
      
      console.log('[Auth] Fallback: getSession after timeout');
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (!mounted) return;
        console.log('[Auth] getSession fallback result:', session);
        setSession(session ?? null);
        setUser(session?.user ?? null);
        setLoading(false);
      });
    }, 3000);

    return () => {
      mounted = false;
      clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, []);

  const signUp = async (email: string, password: string, fullName?: string, phone?: string, skipNavigation?: boolean) => {
    const redirectUrl = `https://ofertas.app/`;
    
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
  navigate(isStoreOwnerOrEmployee ? '/login-lojista' : '/auth');
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
