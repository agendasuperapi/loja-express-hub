import { ReactNode } from 'react';
import { useUserRole } from '@/hooks/useUserRole';

interface RoleBasedContentProps {
  children: ReactNode;
  allowedRoles: ('customer' | 'store_owner' | 'admin')[];
}

export const RoleBasedContent = ({ children, allowedRoles }: RoleBasedContentProps) => {
  const { roles, loading } = useUserRole();

  if (loading) {
    return null;
  }

  const hasPermission = roles.some(role => allowedRoles.includes(role));

  if (!hasPermission) {
    return null;
  }

  return <>{children}</>;
};
