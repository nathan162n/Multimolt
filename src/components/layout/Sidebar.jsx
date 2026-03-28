import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Hammer,
  ClipboardList,
  Sparkles,
  Brain,
  Settings,
  LogOut,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  TooltipProvider,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useGateway } from '../../hooks/useGateway';
import { useAuth } from '../../hooks/useAuth';

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/agents', label: 'Agents', icon: Users },
  { to: '/builder', label: 'Builder', icon: Hammer },
  { to: '/tasks', label: 'Tasks', icon: ClipboardList },
  { to: '/skills', label: 'Skills', icon: Sparkles },
  { to: '/memory', label: 'Memory', icon: Brain },
  { to: '/settings', label: 'Settings', icon: Settings },
];

function SidebarLink({ to, label, icon: Icon }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <NavLink to={to} end={to === '/'} className="block">
          {({ isActive }) => (
            <Button
              variant="ghost"
              className={cn(
                'w-full justify-start gap-2.5 rounded-md px-3 py-2 font-[var(--font-body)] text-[length:var(--text-sm)] transition-all',
                'duration-[var(--dur-fast)] ease-[var(--ease-smooth)]',
                'border-l-2 border-l-transparent',
                'hover:bg-[var(--color-bg-elevated)]',
                isActive && [
                  'border-l-[var(--color-border-accent)]',
                  'font-semibold',
                  'text-[var(--color-text-primary)]',
                  'bg-transparent',
                  'hover:bg-[var(--color-bg-elevated)]',
                ],
                !isActive && [
                  'font-normal',
                  'text-[var(--color-text-secondary)]',
                ]
              )}
            >
              <Icon size={16} className="shrink-0" />
              <span>{label}</span>
            </Button>
          )}
        </NavLink>
      </TooltipTrigger>
      <TooltipContent side="right" sideOffset={8}>
        {label}
      </TooltipContent>
    </Tooltip>
  );
}

export default function Sidebar() {
  const { status } = useGateway();
  const { user, signOut, loading } = useAuth();
  const navigate = useNavigate();
  const connected = status === 'connected';

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth/signin', { replace: true });
  };

  const userEmail = user?.email || '';
  const userInitial = userEmail ? userEmail[0].toUpperCase() : '?';

  return (
    <TooltipProvider delayDuration={400}>
      <nav
        className={cn(
          'flex h-full flex-col overflow-x-hidden overflow-y-auto',
          'bg-[var(--color-bg-surface)]',
          'border-r border-r-[var(--color-border-light)]'
        )}
        style={{
          width: 'var(--sidebar-width)',
          minWidth: 'var(--sidebar-width)',
        }}
      >
        {/* Navigation links */}
        <div className="flex flex-1 flex-col gap-0.5 px-2 pt-3">
          {navItems.map((item) => (
            <SidebarLink key={item.to} {...item} />
          ))}
        </div>

        <Separator className="bg-[var(--color-border-light)]" />

        {/* Gateway connection status */}
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-2 px-4 py-2">
              <span
                className={cn(
                  'block h-2 w-2 shrink-0 rounded-full',
                  connected
                    ? 'bg-[var(--color-status-success-dot)]'
                    : 'bg-[var(--color-status-error-dot)]'
                )}
              />
              <span className="font-[var(--font-body)] text-[length:var(--text-xs)] text-[var(--color-text-tertiary)]">
                {connected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
          </TooltipTrigger>
          <TooltipContent side="right" sideOffset={8}>
            {connected
              ? 'OpenClaw Gateway connected'
              : 'OpenClaw Gateway disconnected'}
          </TooltipContent>
        </Tooltip>

        <Separator className="bg-[var(--color-border-light)]" />

        {/* User profile and sign out */}
        <div className="px-2 py-2 space-y-1">
          {user && (
            <div className="flex items-center gap-2 px-3 py-1.5">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--color-bg-elevated)] border border-[var(--color-border-medium)]">
                <span className="font-[var(--font-body)] text-[length:var(--text-xs)] font-medium text-[var(--color-text-secondary)]">
                  {userInitial}
                </span>
              </div>
              <span className="truncate font-[var(--font-body)] text-[length:var(--text-xs)] text-[var(--color-text-secondary)]">
                {userEmail}
              </span>
            </div>
          )}

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                onClick={handleSignOut}
                disabled={loading}
                className={cn(
                  'w-full justify-start gap-2.5 rounded-md px-3 py-2',
                  'font-[var(--font-body)] text-[length:var(--text-sm)]',
                  'text-[var(--color-text-secondary)]',
                  'hover:bg-[var(--color-bg-elevated)]',
                  'hover:text-[var(--color-status-error-dot)]'
                )}
              >
                <LogOut size={16} className="shrink-0" />
                <span>Sign Out</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={8}>
              Sign out of HiveMind OS
            </TooltipContent>
          </Tooltip>
        </div>
      </nav>
    </TooltipProvider>
  );
}
