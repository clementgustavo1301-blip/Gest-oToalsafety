import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children, allowedSectors, allowedRoles }) => {
  const { session, hasAccess } = useAuth();

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  if ((allowedSectors || allowedRoles) && !hasAccess(allowedSectors, allowedRoles)) {
    return <Navigate to="/" replace />;
  }

  return children;
};

export default ProtectedRoute;
