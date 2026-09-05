'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Activity,
  CalendarDays,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  ShieldCheck,
  Smartphone,
  Stethoscope,
  User as UserIcon,
  Users,
  X,
  Building2,
  ScrollText,
  BarChart3,
} from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth, ROLE_LABELS } from '@/lib/auth';
import { initials } from '@/lib/format';
import { accentVars } from '@/lib/utils';
import type { Role } from '@/lib/types';

/**
 * The internal workspace frame.
 *
 * Navigation is generated from the signed-in role, so a receptionist is never
 * shown a doctor's schedule link and only an administrator sees /admin. The
 * API enforces the same rules — this just avoids offering dead ends.
 */

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: Role[];
  exact?: boolean;
};

const MAIN_NAV: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin', 'receptionist', 'doctor'], exact: true },
  { href: '/appointments', label: 'Appointments', icon: CalendarDays, roles: ['admin', 'receptionist', 'doctor'] },
  { href: '/schedule', label: 'Schedule', icon: ClipboardList, roles: ['admin', 'receptionist', 'doctor'] },
  { href: '/patients', label: 'Patients', icon: Users, roles: ['admin', 'receptionist', 'doctor'] },
  { href: '/doctors', label: 'Doctors', icon: Stethoscope, roles: ['admin', 'receptionist'] },
  { href: '/ussd', label: 'USSD channel', icon: Smartphone, roles: ['admin', 'receptionist', 'doctor'] },
  { href: '/reports', label: 'Reports', icon: BarChart3, roles: ['admin', 'receptionist'] },
];

const ADMIN_NAV: NavItem[] = [
  { href: '/admin', label: 'Overview', icon: ShieldCheck, roles: ['admin'], exact: true },
  { href: '/admin/users', label: 'Staff accounts', icon: UserIcon, roles: ['admin'] },
  { href: '/admin/departments', label: 'Departments', icon: Building2, roles: ['admin'] },
  { href: '/admin/audit', label: 'Audit log', icon: ScrollText, roles: ['admin'] },
  { href: '/admin/settings', label: 'Settings', icon: Settings, roles: ['admin'] },
];

function isActive(pathname: string, item: NavItem) {
  return item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);
}

/**
 * Nav items are colour-coded: `accentVars(index)` gives each link its own
 * `--tile`, which the `.nav-link` rules in globals.css use for the hover tint
 * and the active marker. Walking down the nav walks through the six accents.
 */
function NavLinks({
  items,
  pathname,
  offset = 0,
  onNavigate,
}: {
  items: NavItem[];
  pathname: string;
  offset?: number;
  onNavigate?: () => void;
}) {
  return (
    <>
      {items.map((item, index) => (
        <Link
          key={item.href}
          href={item.href}
          onClick={onNavigate}
          data-active={isActive(pathname, item)}
          style={accentVars(offset + index)}
          className="nav-link flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium"
        >
          <item.icon className="nav-dot h-4 w-4 shrink-0" />
          {item.label}
        </Link>
      ))}
    </>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, signOut } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  if (!user) return null;

  const mainItems = MAIN_NAV.filter((item) => item.roles.includes(user.role));
  const adminItems = ADMIN_NAV.filter((item) => item.roles.includes(user.role));

  const sidebar = (onNavigate?: () => void) => (
    <>
      <div className="flex h-16 items-center gap-2 px-5">
        <span className="flex h-8 w-8 items-center justify-center rounded-md bg-white/10 text-white">
          <Activity className="h-4 w-4" />
        </span>
        <span className="font-display text-lg text-white">MedConnect</span>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 pb-4">
        <NavLinks items={mainItems} pathname={pathname} onNavigate={onNavigate} />

        {adminItems.length > 0 && (
          <>
            <p className="px-3 pb-1 pt-5 text-[10px] font-semibold uppercase tracking-wider text-white/35">
              Administration
            </p>
            <NavLinks items={adminItems} pathname={pathname} offset={mainItems.length} onNavigate={onNavigate} />
          </>
        )}
      </nav>

      <div className="border-t border-white/10 px-5 py-4">
        <p className="text-xs font-medium text-white/80">{user.fullName}</p>
        <p className="text-[11px] text-white/45">
          {ROLE_LABELS[user.role]} · {user.staffCode}
        </p>
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen bg-secondary/30">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-black/10 panel-surface md:flex">
        {sidebar()}
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            aria-label="Close navigation"
            className="absolute inset-0 bg-ink/50"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 flex w-64 flex-col panel-surface shadow-xl">
            <button
              aria-label="Close navigation"
              className="absolute right-3 top-4 text-white/60 hover:text-white"
              onClick={() => setMobileOpen(false)}
            >
              <X className="h-5 w-5" />
            </button>
            {sidebar(() => setMobileOpen(false))}
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-border bg-card/95 px-4 backdrop-blur md:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              aria-label="Open navigation"
              onClick={() => setMobileOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <span className="truncate font-display text-base text-ink md:hidden">MedConnect</span>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-2 rounded-md px-2 py-1.5 outline-none transition-colors hover:bg-primary/10 hover:text-primary">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="text-xs">{initials(user.fullName)}</AvatarFallback>
              </Avatar>
              <span className="hidden text-sm font-medium text-ink sm:inline">{user.fullName}</span>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <span className="block text-sm text-ink">{user.fullName}</span>
                <span className="mt-1 block text-xs font-normal text-muted-foreground">
                  {ROLE_LABELS[user.role]} · {user.staffCode}
                </span>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => router.push('/profile')}>
                <UserIcon className="mr-2 h-4 w-4" /> My profile
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push('/change-password')}>
                <ShieldCheck className="mr-2 h-4 w-4" /> Change password
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={signOut}>
                <LogOut className="mr-2 h-4 w-4" /> Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        <main className="min-w-0 flex-1 p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
