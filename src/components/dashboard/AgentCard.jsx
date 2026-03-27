import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import StatusDot from '../shared/StatusDot';

const statusBadgeStyles = {
  idle: 'bg-[color:var(--color-status-idle-bg)] text-[color:var(--color-text-tertiary)] border-[color:var(--color-border-light)]',
  running: 'bg-[color:var(--color-status-running-bg)] text-[color:var(--color-text-primary)] border-[color:var(--color-border-medium)]',
  error: 'bg-[color:var(--color-status-error-bg)] text-[color:var(--color-status-error-text)] border-[color:var(--color-status-error-dot)]',
  paused: 'bg-[color:var(--color-status-paused-bg)] text-[color:var(--color-text-tertiary)] border-[color:var(--color-border-medium)]',
};

export default function AgentCard({ agent }) {
  const navigate = useNavigate();
  const { id, name, role, status = 'idle', currentAction, model } = agent;

  const badgeStyle = statusBadgeStyles[status] || statusBadgeStyles.idle;

  return (
    <motion.div layout>
      <Card
        onClick={() => navigate(`/agents?id=${id}`)}
        tabIndex={0}
        role="button"
        aria-label={`Agent ${name}, status ${status}`}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            navigate(`/agents?id=${id}`);
          }
        }}
        className={cn(
          'cursor-pointer transition-all duration-[240ms] ease-[cubic-bezier(0.25,0.46,0.45,0.94)]',
          'bg-[color:var(--color-bg-base)] border-[color:var(--color-border-light)]',
          'shadow-[var(--shadow-card)]',
          'hover:shadow-[var(--shadow-hover)] hover:-translate-y-0.5',
          'focus-visible:outline-2 focus-visible:outline-[color:var(--color-text-primary)] focus-visible:outline-offset-2',
          status === 'error' && 'border-l-2 border-l-[color:var(--color-status-error-dot)]',
          status === 'paused' && 'border-dashed'
        )}
      >
        <CardHeader className="p-4 pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <StatusDot status={status} size={8} />
              <CardTitle className="font-body text-[length:var(--text-md)] font-medium text-[color:var(--color-text-primary)]">
                {name}
              </CardTitle>
            </div>
            <Badge
              variant="outline"
              className={cn(
                'font-body text-[length:var(--text-2xs)] font-normal capitalize',
                badgeStyle
              )}
            >
              {status}
            </Badge>
          </div>
          <CardDescription className="font-body text-[length:var(--text-xs)] text-[color:var(--color-text-tertiary)] uppercase tracking-wider mt-1">
            {role}
          </CardDescription>
        </CardHeader>

        <CardContent className="p-4 pt-0">
          <div
            className={cn(
              'font-body text-[length:var(--text-sm)] leading-relaxed min-h-[20px] mb-3',
              status === 'error' && 'text-[color:var(--color-status-error-text)]',
              status === 'paused' && 'text-[color:var(--color-status-warning-text)] italic',
              status !== 'error' && status !== 'paused' && 'text-[color:var(--color-text-secondary)]'
            )}
          >
            {status === 'running' && currentAction
              ? currentAction
              : status === 'error'
              ? 'Error occurred'
              : status === 'paused'
              ? 'Awaiting approval...'
              : 'Awaiting task...'}
          </div>

          <div className="flex items-center justify-between">
            <span className="font-mono text-[length:var(--text-2xs)] text-[color:var(--color-text-disabled)]">
              {model || id}
            </span>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
