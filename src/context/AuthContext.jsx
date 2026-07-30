import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [userLinks, setUserLinks] = useState([]);
  const [activeLink, setActiveLink] = useState(null);
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

    // 2. Fetch all user links
    const { data: links } = await supabase
      .from('user_links')
      .select('*')
      .eq('user_id', userId);
      
    setUserLinks(links || []);
  };

  const refreshProfile = async () => {
    if (session?.user) {
      await fetchProfile(session.user.id, session.user.user_metadata);
    }
  };

  useEffect(() => {
    const fetchSessionAndProfile = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      
      if (session?.user) {
        await fetchProfile(session.user.id, session.user.user_metadata);
      }
      setLoading(false);
    };

    fetchSessionAndProfile();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      if (session?.user) {
        await fetchProfile(session.user.id, session.user.user_metadata);
      } else {
        setUserProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const hasAccess = (allowedSectors, allowedRoles) => {
    if (!activeLink) return false;
    
    // Admin tem acesso total (verifica se o link ativo é de Admin)
    if (activeLink.role === 'Admin') return true;

    const sectorMatch = !allowedSectors || allowedSectors.includes(activeLink.sector);
    const roleMatch = !allowedRoles || allowedRoles.includes(activeLink.role);

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
    signOut: () => supabase.auth.signOut(),
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
