'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useLogout } from '@/app/hooks/useLogout';

interface SuperAdminSidebarProps {
  isCollapsed: boolean;
}

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

const navItems: NavItem[] = [
  {
    label: 'Dashboard',
    href: '/superadmin',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
  {
    label: 'Create Admin',
    href: '/superadmin/create-admin',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
      </svg>
    ),
  },
  {
    label: 'Change password',
    href: '/superadmin/change-password',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
      </svg>
    ),
  },
];

export default function SuperAdminSidebar({ isCollapsed }: SuperAdminSidebarProps) {
  const pathname = usePathname();
  const logout = useLogout(true); // true = isSuperAdmin

  const handleLogout = (e: React.MouseEvent) => {
    e.preventDefault();
    logout.mutate();
  };

  return (
    <aside
      className={`bg-[var(--sidebar)] border-r border-[var(--sidebar-border)] transition-all duration-300 flex flex-col h-full ${
        isCollapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* User Profile Section */}
      <div className="p-4 border-b border-[var(--sidebar-border)]">
        <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'space-x-3'}`}>
          <div className="w-12 h-12 rounded-full bg-[var(--sidebar-primary)] flex items-center justify-center text-[var(--sidebar-primary-foreground)] font-semibold text-lg flex-shrink-0">
            SA
          </div>
          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[var(--sidebar-foreground)] truncate">
                Super Admin
              </p>
              <div className="flex items-center space-x-1 mt-1">
                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                <span className="text-xs text-gray-600">Online</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 overflow-y-auto py-4 custom-scrollbar">
        <ul className="space-y-1 px-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/superadmin' && pathname?.startsWith(item.href));
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex items-center ${
                    isCollapsed ? 'justify-center px-2' : 'px-4'
                  } py-3 rounded-md transition-colors ${
                    isActive
                      ? 'bg-[var(--sidebar-primary)] text-[var(--sidebar-primary-foreground)]'
                      : 'text-[var(--sidebar-foreground)] hover:bg-[var(--sidebar-accent)]'
                  }`}
                  title={isCollapsed ? item.label : undefined}
                >
                  <span className={isCollapsed ? '' : 'mr-3'}>{item.icon}</span>
                  {!isCollapsed && (
                    <span className="text-sm font-medium">{item.label}</span>
                  )}
                </Link>
              </li>
            );
          })}
          {/* Logout Button */}
          <li>
            <button
              onClick={handleLogout}
              disabled={logout.isPending}
              className={`w-full flex items-center ${
                isCollapsed ? 'justify-center px-2' : 'px-4'
              } py-3 rounded-md transition-colors text-[var(--sidebar-foreground)] hover:bg-[var(--sidebar-accent)] disabled:opacity-50 disabled:cursor-not-allowed`}
              title={isCollapsed ? 'Logout' : undefined}
            >
              <span className={isCollapsed ? '' : 'mr-3'}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                </svg>
              </span>
              {!isCollapsed && (
                <span className="text-sm font-medium">
                  {logout.isPending ? 'Logging out...' : '← Logout'}
                </span>
              )}
            </button>
          </li>
        </ul>
      </nav>
    </aside>
  );
}

