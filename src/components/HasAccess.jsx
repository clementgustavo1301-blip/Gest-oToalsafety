import React from 'react';
import { useAuth } from '../context/AuthContext';

const HasAccess = ({ sectors, roles, children, fallback = null }) => {
  const { hasAccess } = useAuth();
  
  if (hasAccess(sectors, roles)) {
    return <>{children}</>;
  }
  
  return fallback;
};

export default HasAccess;
