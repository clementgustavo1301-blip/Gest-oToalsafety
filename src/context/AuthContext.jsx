import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [userLinks, setUserLinks] = useState([]);
  const [activeLink, setActiveLinkState] = useState(() => {
    try {
      const saved = localStorage.getItem('activeLink');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const setActiveLink = (link) => {
    if (!link) {
      setActiveLinkState(null);
      localStorage.removeItem('activeLink');
      return;
    }
    const verified = userLinks.find(
      (l) => l.id === link.id && l.status === 'approved'
    );
    if (!verified) {
      console.warn('Tentativa de ativar vínculo não aprovado bloqueada.');
      return;
    }
    setActiveLinkState(verified);
    localStorage.setItem('activeLink', JSON.stringify(verified));
  };
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId, userMetadata = null) => {
    // 1. Fetch user profile (basic info)
    let { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
      
    // Auto-create profile for legacy users if it doesn't exist
    if (!profile) {
      const { data: newProfile } = await supabase
        .from('profiles')
        .insert({ 
          id: userId, 
          name: userMetadata?.full_name || 'Usuário',
          role: 'Usuário'
        })
        .select()
        .single();
      profile = newProfile;
    }
    
    setUserProfile(profile);

    // 2. Fetch all user links and validate activeLink against DB records
    const { data: links } = await supabase
      .from('user_links')
      .select('*')
      .eq('user_id', userId);
      
    const safeLinks = links || [];
    setUserLinks(safeLinks);

    setActiveLinkState((prev) => {
      if (!prev) return null;
      const verified = safeLinks.find(
        (l) => l.id === prev.id && l.user_id === userId && l.status === 'approved'
      );
      if (verified) {
        localStorage.setItem('activeLink', JSON.stringify(verified));
        return verified;
      }
      localStorage.removeItem('activeLink');
      return null;
    });
  };

  const refreshProfile = async () => {
    if (session?.user) {
      await fetchProfile(session.user.id, session.user.user_metadata);
    }
  };

  useEffect(() => {
    let isMounted = true;

    const initializeAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;
        
        if (isMounted) setSession(session);
        
        if (session?.user) {
          await fetchProfile(session.user.id, session.user.user_metadata);
        } else {
          localStorage.removeItem('activeLink');
          if (isMounted) {
            setUserProfile(null);
            setUserLinks([]);
            setActiveLinkState(null);
          }
        }
      } catch (error) {
        console.error("Erro na autenticação inicial:", error);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (isMounted) setSession(session);
      if (session?.user) {
        await fetchProfile(session.user.id, session.user.user_metadata);
      } else {
        localStorage.removeItem('activeLink');
        if (isMounted) {
          setUserProfile(null);
          setUserLinks([]);
          setActiveLinkState(null);
        }
      }
    });

    return () => {
      isMounted = false;
      if (subscription) subscription.unsubscribe();
    };
  }, []);

  const hasAccess = (allowedSectors, allowedRoles) => {
    if (!activeLink || activeLink.status !== 'approved') return false;
    const verified = userLinks.find(
      (l) => l.id === activeLink.id && l.status === 'approved'
    );
    if (!verified) return false;

    // Admin tem acesso total (verifica se o link ativo verificado é de Admin ou setor IPA)
    if (verified.role === 'Admin' || verified.sector === 'IPA') return true;

    const sectorMatch = !allowedSectors || allowedSectors.includes(verified.sector);
    const roleMatch = !allowedRoles || allowedRoles.includes(verified.role);

    return sectorMatch && roleMatch;
  };

  const value = {
    session,
    user: session?.user,
    userProfile,
    userLinks,
    activeLink,
    setActiveLink,
    hasAccess,
    refreshProfile,
    signOut: () => {
      localStorage.removeItem('activeLink');
      setActiveLinkState(null);
      return supabase.auth.signOut();
    },
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  return useContext(AuthContext);
};
