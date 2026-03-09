'use client';

import SuperAdminLayoutComponent from '@/app/components/layout/SuperAdminLayout';
import QueryProvider from '@/app/providers/QueryProvider';

export default function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <QueryProvider>
      <SuperAdminLayoutComponent>{children}</SuperAdminLayoutComponent>
    </QueryProvider>
  );
}

