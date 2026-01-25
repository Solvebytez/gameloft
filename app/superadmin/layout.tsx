'use client';

import { Toaster } from 'react-hot-toast';
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
      <Toaster position="top-right" />
    </QueryProvider>
  );
}

