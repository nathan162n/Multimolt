import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Hammer,
  ClipboardList,
  Sparkles,
  Brain,
  Settings,
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
  const connected = status === 'connected';

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
            <div className="flex items-center gap-2 px-4 py-3">
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
      </nav>
    </TooltipProvider>
  );
}
