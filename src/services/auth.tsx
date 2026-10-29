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

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<{ success: boolean; error?: string }>;
  register: (fullName: string, email: string, password: string) => Promise<{ success: boolean; error?: string }>;
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

    async function initAuth() {
      if (isSupabaseConfigured && supabase) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            setUser(parseUserFromMeta(session.user));
          } else {
            setUser(null);
          }

          const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
            if (session?.user) {
              setUser(parseUserFromMeta(session.user));
            } else {
              setUser(null);
            }
          });
          subscription = authListener?.subscription;
        } catch {
          setUser(null);
        }
      } else {
        // Local standalone auth session restoration
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
    setLoading(true);
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail || !password) {
      setLoading(false);
      return { success: false, error: 'Email and password are required.' };
    }

    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (error) {
        setLoading(false);
        return { success: false, error: error.message };
      }

      if (data.user) {
        const loggedUser = parseUserFromMeta(data.user);
        setUser(loggedUser);
        if (rememberMe) {
          localStorage.setItem(LOCAL_AUTH_KEY, JSON.stringify(loggedUser));
        }
        setLoading(false);
        return { success: true };
      }
    }

    // Local standalone authentication
    let usersList: any[] = [];
    try {
      const stored = localStorage.getItem(LOCAL_USERS_KEY);
      usersList = stored ? JSON.parse(stored) : [];
    } catch {
      usersList = [];
    }

    const matched = usersList.find((u) => u.email.toLowerCase() === cleanEmail);
    if (matched) {
      if (matched.password !== password) {
        setLoading(false);
        return { success: false, error: 'Invalid email or password.' };
      }
      const loggedUser: User = {
        id: matched.id,
        email: matched.email,
        fullName: matched.fullName,
        role: 'auditor',
        organizationName: matched.organizationName || undefined,
        organizationGstin: matched.organizationGstin || undefined,
        drugLicenseNumber: matched.drugLicenseNumber || undefined,
        contactPhone: matched.contactPhone || undefined,
        address: matched.address || undefined,
        profileCompleted: Boolean(matched.organizationName && matched.organizationName.trim().length > 0),
      };
      setUser(loggedUser);
      if (rememberMe) {
        localStorage.setItem(LOCAL_AUTH_KEY, JSON.stringify(loggedUser));
      }
      setLoading(false);
      return { success: true };
    }

    setLoading(false);
    return { success: false, error: 'No account found with this email. Please register first.' };
  };

  const register = async (fullName: string, email: string, password: string) => {
    setLoading(true);
    const cleanEmail = email.trim().toLowerCase();
    const cleanName = fullName.trim();

    if (!cleanName || !cleanEmail || !password) {
      setLoading(false);
      return { success: false, error: 'All fields are required.' };
    }

    if (isSupabaseConfigured && supabase) {
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
        setLoading(false);
        return { success: false, error: error.message };
      }

      if (data.user) {
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
        setLoading(false);
        return { success: true };
      }
    }

    // Local standalone registration
    let usersList: any[] = [];
    try {
      const stored = localStorage.getItem(LOCAL_USERS_KEY);
      usersList = stored ? JSON.parse(stored) : [];
    } catch {
      usersList = [];
    }

    if (usersList.some((u) => u.email.toLowerCase() === cleanEmail)) {
      setLoading(false);
      return { success: false, error: 'An account with this email already exists.' };
    }

    const newUserObj = {
      id: `usr-${Date.now().toString(36)}`,
      email: cleanEmail,
      fullName: cleanName,
      password,
      role: 'auditor',
      organizationName: undefined,
      organizationGstin: undefined,
      createdAt: new Date().toISOString(),
    };

    usersList.push(newUserObj);
    localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(usersList));

    const loggedUser: User = {
      id: newUserObj.id,
      email: newUserObj.email,
      fullName: newUserObj.fullName,
      role: 'auditor',
      organizationName: undefined,
      organizationGstin: undefined,
      profileCompleted: false,
    };
    setUser(loggedUser);
    localStorage.setItem(LOCAL_AUTH_KEY, JSON.stringify(loggedUser));

    setLoading(false);
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

        // Try upserting to profiles table if available
        try {
          await supabase.from('profiles').upsert({
            id: user.id,
            email: user.email,
            full_name: user.fullName,
            medical_store_name: cleanOrgName,
            organization_gstin: cleanGstin || null,
            drug_license_number: cleanDl || null,
            store_address: cleanAddress || null,
            contact_phone: cleanPhone || null,
            operating_state: cleanState || null,
            profile_completed: true,
            updated_at: new Date().toISOString(),
          });
        } catch {
          // Table upsert non-blocking
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
        u.id === user.id || u.email.toLowerCase() === user.email.toLowerCase()
          ? {
              ...u,
              organizationName: cleanOrgName,
              organizationGstin: cleanGstin,
              drugLicenseNumber: cleanDl,
              contactPhone: cleanPhone,
              address: cleanAddress,
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
      const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail);
      if (error) {
        return { success: false, error: error.message };
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
