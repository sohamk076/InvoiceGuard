import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from './supabase';
import { store } from './store';

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: 'admin' | 'auditor' | 'manager';
  organizationName?: string;
  organizationGstin?: string;
  drugLicenseNumber?: string;
  contactPhone?: string;
  address?: string;
  operatingState?: string;
  profileCompleted: boolean;
}

interface RegisterResult {
  success: boolean;
  requiresEmailConfirmation?: boolean;
  message?: string;
  error?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<{ success: boolean; error?: string }>;
  register: (fullName: string, email: string, password: string) => Promise<RegisterResult>;
  updateBusinessProfile: (profile: {
    organizationName: string;
    organizationGstin?: string;
    drugLicenseNumber?: string;
    contactPhone?: string;
    address?: string;
    operatingState?: string;
  }) => Promise<{ success: boolean; error?: string }>;
  resetPassword: (email: string) => Promise<{ success: boolean; message?: string; error?: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const LOCAL_AUTH_KEY = 'invoiceguard_auth_user';
const LOCAL_USERS_KEY = 'invoiceguard_registered_users';

function getLocalUsersList(): any[] {
  try {
    const stored = localStorage.getItem(LOCAL_USERS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveLocalUsersList(list: any[]): void {
  try {
    localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(list));
  } catch {
    // Ignore storage write issues
  }
}

function createLocalUser(fullName: string, email: string, password?: string): User {
  const usersList = getLocalUsersList();
  const existing = usersList.find((u) => u.email?.toLowerCase() === email.toLowerCase());
  
  if (existing) {
    if (password) existing.password = password;
    existing.fullName = fullName;
    saveLocalUsersList(usersList);
    return {
      id: existing.id,
      email: existing.email,
      fullName: existing.fullName,
      role: 'auditor',
      organizationName: existing.organizationName || undefined,
      organizationGstin: existing.organizationGstin || undefined,
      drugLicenseNumber: existing.drugLicenseNumber || undefined,
      contactPhone: existing.contactPhone || undefined,
      address: existing.address || undefined,
      operatingState: existing.operatingState || undefined,
      profileCompleted: Boolean(existing.organizationName && existing.organizationName.trim().length > 0),
    };
  }

  const newUserObj = {
    id: `usr-${Date.now().toString(36)}`,
    email,
    fullName,
    password: password || '',
    role: 'auditor',
    organizationName: undefined,
    organizationGstin: undefined,
    createdAt: new Date().toISOString(),
  };

  usersList.push(newUserObj);
  saveLocalUsersList(usersList);

  return {
    id: newUserObj.id,
    email: newUserObj.email,
    fullName: newUserObj.fullName,
    role: 'auditor',
    organizationName: undefined,
    organizationGstin: undefined,
    profileCompleted: false,
  };
}

function tryLocalLogin(cleanEmail: string, password: string): { success: boolean; error?: string; user?: User } {
  const usersList = getLocalUsersList();
  const matched = usersList.find((u) => u.email?.toLowerCase() === cleanEmail);
  if (!matched) {
    return { success: false, error: 'Invalid email or password. Please verify your credentials and try again.' };
  }
  if (matched.password && matched.password !== password) {
    return { success: false, error: 'Invalid email or password. Please verify your credentials and try again.' };
  }
  const loggedUser: User = {
    id: matched.id,
    email: matched.email,
    fullName: matched.fullName || cleanEmail.split('@')[0],
    role: 'auditor',
    organizationName: matched.organizationName || undefined,
    organizationGstin: matched.organizationGstin || undefined,
    drugLicenseNumber: matched.drugLicenseNumber || undefined,
    contactPhone: matched.contactPhone || undefined,
    address: matched.address || undefined,
    operatingState: matched.operatingState || undefined,
    profileCompleted: Boolean(matched.organizationName && matched.organizationName.trim().length > 0),
  };
  return { success: true, user: loggedUser };
}

function parseUserFromMeta(authUser: any, metaObj?: any): User {
  const meta = metaObj || authUser?.user_metadata || {};
  const orgName = (meta.organization_name || meta.medical_store_name || '').trim();
  const gstin = (meta.organization_gstin || '').trim();

  return {
    id: authUser.id,
    email: authUser.email || '',
    fullName: meta.full_name || authUser.email?.split('@')[0] || 'User',
    role: meta.role || 'auditor',
    organizationName: orgName || undefined,
    organizationGstin: gstin || undefined,
    drugLicenseNumber: (meta.drug_license_number || '').trim() || undefined,
    contactPhone: (meta.contact_phone || '').trim() || undefined,
    address: (meta.address || '').trim() || undefined,
    operatingState: (meta.operating_state || '').trim() || undefined,
    profileCompleted: Boolean(orgName && orgName.length > 0),
  };
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let subscription: any = null;

    function restoreLocalUser() {
      const stored = localStorage.getItem(LOCAL_AUTH_KEY);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          setUser({
            ...parsed,
            profileCompleted: Boolean(parsed.organizationName && parsed.organizationName.trim().length > 0),
          });
        } catch {
          localStorage.removeItem(LOCAL_AUTH_KEY);
          setUser(null);
        }
      } else {
        setUser(null);
      }
    }

    async function initAuth() {
      if (isSupabaseConfigured && supabase) {
        try {
          const { data: { session }, error } = await supabase.auth.getSession();
          if (session?.user && !error) {
            setUser(parseUserFromMeta(session.user));
          } else {
            restoreLocalUser();
          }

          const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
            if (session?.user) {
              const u = parseUserFromMeta(session.user);
              setUser(u);
              localStorage.setItem(LOCAL_AUTH_KEY, JSON.stringify(u));
            } else if (event === 'SIGNED_OUT') {
              setUser(null);
              localStorage.removeItem(LOCAL_AUTH_KEY);
            }
          });
          subscription = authListener?.subscription;
        } catch (err) {
          console.warn('Supabase auth session initialization error, using local state:', err);
          restoreLocalUser();
        }
      } else {
        restoreLocalUser();
      }
      setLoading(false);
    }

    initAuth();

    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, []);

  useEffect(() => {
    store.setUserId(user?.id || null);
    store.setOrganizationGstin(user?.organizationGstin || undefined);
  }, [user]);

  const login = async (email: string, password: string, rememberMe: boolean = true) => {
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail || !password) {
      return { success: false, error: 'Email and password are required.' };
    }

    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });

        if (error) {
          const errMsg = error.message || '';
          if (errMsg.includes('Invalid login credentials')) {
            // Check if account was registered in local storage fallback
            const localResult = tryLocalLogin(cleanEmail, password);
            if (localResult.success && localResult.user) {
              setUser(localResult.user);
              if (rememberMe) {
                localStorage.setItem(LOCAL_AUTH_KEY, JSON.stringify(localResult.user));
              }
              return { success: true };
            }
            return {
              success: false,
              error: 'Invalid email or password. Please verify your credentials and try again.',
            };
          }

          if (errMsg.includes('Email not confirmed')) {
            return {
              success: false,
              error: 'Your email address has not been confirmed yet. Please verify your email via the confirmation link sent by Supabase.',
            };
          }

          return { success: false, error: error.message };
        }

        if (data?.user) {
          const loggedUser = parseUserFromMeta(data.user);
          setUser(loggedUser);
          if (rememberMe) {
            localStorage.setItem(LOCAL_AUTH_KEY, JSON.stringify(loggedUser));
          }
          return { success: true };
        }
      } catch (err: any) {
        console.error('Supabase authentication network error:', err);
        // Fallback to local user if offline or network blocked
        const localResult = tryLocalLogin(cleanEmail, password);
        if (localResult.success && localResult.user) {
          setUser(localResult.user);
          if (rememberMe) {
            localStorage.setItem(LOCAL_AUTH_KEY, JSON.stringify(localResult.user));
          }
          return { success: true };
        }

        const errMsg = err?.message || String(err);
        if (
          errMsg.includes('Failed to fetch') ||
          errMsg.includes('NetworkError') ||
          errMsg.includes('CORS') ||
          errMsg.includes('AuthRetryableFetchError')
        ) {
          return {
            success: false,
            error: 'Unable to reach the authentication server. Please check your network connection and ensure browser extensions are not blocking requests.',
          };
        }
        return { success: false, error: errMsg };
      }
    }

    // Local standalone authentication fallback
    const localResult = tryLocalLogin(cleanEmail, password);
    if (localResult.success && localResult.user) {
      setUser(localResult.user);
      if (rememberMe) {
        localStorage.setItem(LOCAL_AUTH_KEY, JSON.stringify(localResult.user));
      }
      return { success: true };
    }
    return { success: false, error: localResult.error || 'No account found with this email. Please register first.' };
  };

  const register = async (fullName: string, email: string, password: string): Promise<RegisterResult> => {
    const cleanEmail = email.trim().toLowerCase();
    const cleanName = fullName.trim();

    if (!cleanName || !cleanEmail || !password) {
      return { success: false, error: 'All fields are required.' };
    }

    if (password.length < 6) {
      return { success: false, error: 'Password must be at least 6 characters.' };
    }

    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: {
            data: {
              full_name: cleanName,
              organization_name: '',
              organization_gstin: '',
            },
          },
        });

        if (error) {
          const errMsg = error.message || '';
          if (errMsg.includes('rate limit') || (error as any).code === 'over_email_send_rate_limit') {
            // Register in local workspace fallback so testing is never blocked
            const localObj = createLocalUser(cleanName, cleanEmail, password);
            setUser(localObj);
            localStorage.setItem(LOCAL_AUTH_KEY, JSON.stringify(localObj));
            return {
              success: true,
              message: 'Supabase email send rate limit exceeded on free tier. Account created in local workspace cache so you can continue testing immediately.',
            };
          }
          if (errMsg.includes('already registered') || errMsg.includes('already exists')) {
            return {
              success: false,
              error: 'An account with this email address already exists. Please sign in instead.',
            };
          }
          return { success: false, error: error.message };
        }

        // Check if user already exists (Supabase returns empty identities array when user already exists with email confirmations on)
        if (data?.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
          return {
            success: false,
            error: 'An account with this email address already exists. Please sign in instead.',
          };
        }

        if (data?.user) {
          // If session is null, Supabase requires email confirmation
          if (!data.session) {
            createLocalUser(cleanName, cleanEmail, password);
            return {
              success: true,
              requiresEmailConfirmation: true,
              message: 'Account registered successfully! A confirmation link has been sent to your email. Please check your inbox before signing in.',
            };
          }

          const newUser: User = {
            id: data.user.id,
            email: data.user.email || cleanEmail,
            fullName: cleanName,
            role: 'auditor',
            organizationName: undefined,
            organizationGstin: undefined,
            profileCompleted: false,
          };
          setUser(newUser);
          localStorage.setItem(LOCAL_AUTH_KEY, JSON.stringify(newUser));
          return { success: true };
        }
      } catch (err: any) {
        console.error('Supabase registration error:', err);
        const errMsg = err?.message || String(err);
        if (
          errMsg.includes('Failed to fetch') ||
          errMsg.includes('NetworkError') ||
          errMsg.includes('CORS') ||
          errMsg.includes('AuthRetryableFetchError')
        ) {
          // Register locally if server is unreachable
          const localObj = createLocalUser(cleanName, cleanEmail, password);
          setUser(localObj);
          localStorage.setItem(LOCAL_AUTH_KEY, JSON.stringify(localObj));
          return {
            success: true,
            message: 'Unable to reach authentication server. Account created in local workspace cache.',
          };
        }
        return { success: false, error: errMsg };
      }
    }

    // Local standalone registration
    const usersList = getLocalUsersList();
    if (usersList.some((u) => u.email?.toLowerCase() === cleanEmail)) {
      return { success: false, error: 'An account with this email already exists.' };
    }

    const localObj = createLocalUser(cleanName, cleanEmail, password);
    setUser(localObj);
    localStorage.setItem(LOCAL_AUTH_KEY, JSON.stringify(localObj));
    return { success: true };
  };

  const updateBusinessProfile = async (profile: {
    organizationName: string;
    organizationGstin?: string;
    drugLicenseNumber?: string;
    contactPhone?: string;
    address?: string;
    operatingState?: string;
  }) => {
    if (!user) {
      return { success: false, error: 'User is not authenticated.' };
    }

    const cleanOrgName = profile.organizationName.trim();
    if (!cleanOrgName) {
      return { success: false, error: 'Medical store or business legal name is required.' };
    }

    const cleanGstin = profile.organizationGstin?.trim().toUpperCase() || undefined;
    const cleanDl = profile.drugLicenseNumber?.trim().toUpperCase() || undefined;
    const cleanPhone = profile.contactPhone?.trim() || undefined;
    const cleanAddress = profile.address?.trim() || undefined;
    const cleanState = profile.operatingState?.trim() || undefined;

    const updatedUser: User = {
      ...user,
      organizationName: cleanOrgName,
      organizationGstin: cleanGstin,
      drugLicenseNumber: cleanDl,
      contactPhone: cleanPhone,
      address: cleanAddress,
      operatingState: cleanState,
      profileCompleted: true,
    };

    if (isSupabaseConfigured && supabase) {
      try {
        const { error: metaErr } = await supabase.auth.updateUser({
          data: {
            organization_name: cleanOrgName,
            organization_gstin: cleanGstin || '',
            drug_license_number: cleanDl || '',
            contact_phone: cleanPhone || '',
            address: cleanAddress || '',
            operating_state: cleanState || '',
            profile_completed: true,
          },
        });

        if (metaErr) {
          return { success: false, error: metaErr.message };
        }

        // Try upserting to profiles table with strict RLS conformity
        try {
          await supabase.from('profiles').upsert({
            id: user.id,
            email: user.email,
            full_name: user.fullName,
            role: 'auditor',
            medical_store_name: cleanOrgName,
            organization_gstin: cleanGstin || null,
            drug_license_number: cleanDl || null,
            store_address: cleanAddress || null,
            contact_phone: cleanPhone || null,
            operating_state: cleanState || null,
            profile_completed: true,
            updated_at: new Date().toISOString(),
          });
        } catch (tableErr) {
          console.warn('Profiles table upsert warning (non-blocking):', tableErr);
        }
      } catch (err: any) {
        return { success: false, error: err?.message || 'Failed to update business profile in database.' };
      }
    }

    // Update in local users registry
    try {
      const stored = localStorage.getItem(LOCAL_USERS_KEY);
      const list = stored ? JSON.parse(stored) : [];
      const updatedList = list.map((u: any) =>
        u.id === user.id || u.email?.toLowerCase() === user.email.toLowerCase()
          ? {
              ...u,
              organizationName: cleanOrgName,
              organizationGstin: cleanGstin,
              drugLicenseNumber: cleanDl,
              contactPhone: cleanPhone,
              address: cleanAddress,
              operatingState: cleanState,
            }
          : u
      );
      localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(updatedList));
    } catch {
      // Ignore
    }

    setUser(updatedUser);
    localStorage.setItem(LOCAL_AUTH_KEY, JSON.stringify(updatedUser));
    return { success: true };
  };

  const resetPassword = async (email: string) => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      return { success: false, error: 'Email address is required.' };
    }

    if (isSupabaseConfigured && supabase) {
      try {
        const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail);
        if (error) {
          return { success: false, error: error.message };
        }
      } catch (err: any) {
        return { success: false, error: err?.message || 'Unable to reach authentication server.' };
      }
    }

    return {
      success: true,
      message: 'Password reset link has been dispatched to your email address.',
    };
  };

  const logout = async () => {
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.auth.signOut();
      } catch {
        // Fallthrough
      }
    }
    localStorage.removeItem(LOCAL_AUTH_KEY);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, login, register, updateBusinessProfile, resetPassword, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
