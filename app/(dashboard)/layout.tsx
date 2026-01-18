'use client';

import { Toaster } from 'react-hot-toast';
import DashboardLayout from '@/app/components/layout/DashboardLayout';

export default function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <DashboardLayout>{children}</DashboardLayout>
      <Toaster position="top-right" />
    </>
  );
}

