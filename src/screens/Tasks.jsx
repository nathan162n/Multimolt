import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ClipboardList, Clock, CheckCircle2, XCircle, Loader2, AlertCircle } from 'lucide-react';
import useTaskStore from '../store/taskStore';
import { deleteTask as deleteTaskDb } from '../services/db';
import { cancelTask } from '../services/openclaw';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

const pageVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
};

const pageTransition = {
  duration: 0.42,
  ease: [0.25, 0.46, 0.45, 0.94],
};

const statusConfig = {
  pending: {
    label: 'Pending',
    variant: 'secondary',
    icon: Clock,
    className: 'bg-secondary text-secondary-foreground',
  },
  running: {
    label: 'Running',
    variant: 'default',
    icon: Loader2,
    className: 'bg-primary text-primary-foreground',
  },
  completed: {
    label: 'Completed',
    variant: 'default',
    icon: CheckCircle2,
    className: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  },
  failed: {
    label: 'Failed',
    variant: 'destructive',
    icon: XCircle,
    className: 'bg-red-100 text-red-800 border-red-200',
  },
  cancelled: {
    label: 'Cancelled',
    variant: 'outline',
    icon: AlertCircle,
    className: 'bg-muted text-muted-foreground',
  },
};

function formatTimestamp(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatElapsed(createdAt, completedAt) {
  const start = new Date(createdAt).getTime();
  const end = completedAt ? new Date(completedAt).getTime() : Date.now();
  const diffMs = end - start;
  const seconds = Math.floor(diffMs / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainSec = seconds % 60;
  if (minutes < 60) return `${minutes}m ${remainSec}s`;
  const hours = Math.floor(minutes / 60);
  const remainMin = minutes % 60;
  return `${hours}h ${remainMin}m`;
}

function TaskCard({ task, index }) {
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');
  const fetchTasks = useTaskStore((s) => s.fetchTasks);

  const created = task.createdAt || task.created_at;
  const completed = task.completedAt || task.completed_at;
  const assignedAgents = task.assigned_agents || task.assignedAgents || [];
  const config = statusConfig[task.status] || statusConfig.pending;
  const StatusIcon = config.icon;

  const canStopOrCancel = task.status === 'pending' || task.status === 'running';
  const canDeleteFailed = task.status === 'failed';

  const handleCancelOrStop = async () => {
    setActionError('');
    setBusy(true);
    try {
      const result = await cancelTask({ taskId: task.id });
      if (result?.error) {
        setActionError(typeof result.error === 'string' ? result.error : 'Could not update task');
        return;
      }
      await fetchTasks();
    } catch (err) {
      setActionError(err?.message || 'Request failed');
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteFailed = async () => {
    setActionError('');
    setBusy(true);
    try {
      const result = await deleteTaskDb(task.id);
      if (result?.error) {
        setActionError(typeof result.error === 'string' ? result.error : 'Could not delete task');
        return;
      }
      await fetchTasks();
    } catch (err) {
      setActionError(err?.message || 'Request failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.24, delay: index * 0.04, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      <Card className="mb-3 transition-shadow hover:shadow-md">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <CardTitle className="text-sm font-medium leading-snug flex-1 min-w-0">
              {task.goal}
            </CardTitle>
            <Badge className={cn('shrink-0 gap-1', config.className)}>
              <StatusIcon className={cn('h-3 w-3', task.status === 'running' && 'animate-spin')} />
              {config.label}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {task.result && (
            <div className="mb-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                Result
              </p>
              <pre className="font-mono text-xs text-secondary-foreground bg-muted rounded-md p-3 whitespace-pre-wrap break-words leading-relaxed">
                {task.result}
              </pre>
            </div>
          )}

          {task.error && (
            <div className="mb-3">
              <p className="text-xs font-medium text-destructive uppercase tracking-wider mb-1">
                Error
              </p>
              <pre className="font-mono text-xs text-destructive bg-destructive/10 rounded-md p-3 whitespace-pre-wrap break-words leading-relaxed">
                {task.error}
              </pre>
            </div>
          )}

          {assignedAgents.length > 0 && (
            <div className="mb-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5">
                Assigned Agents
              </p>
              <div className="flex flex-wrap gap-1.5">
                {assignedAgents.map((agentId, idx) => (
                  <Badge key={idx} variant="outline" className="font-mono text-xs">
                    {agentId}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <Separator className="my-3" />

          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between sm:gap-3">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground min-w-0">
              <span className="font-mono">{formatTimestamp(created)}</span>
              <span className="flex items-center gap-1 font-mono">
                <Clock className="h-3 w-3 shrink-0" />
                {formatElapsed(created, completed)}
              </span>
              <span className="font-mono text-[10px] opacity-60 truncate max-w-[200px]">
                {task.id}
              </span>
            </div>
            {(canStopOrCancel || canDeleteFailed) && (
              <div className="flex flex-col items-end gap-1 shrink-0 self-end">
                {canStopOrCancel && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={busy}
                    onClick={() => void handleCancelOrStop()}
                    className="font-[family-name:var(--font-body)] text-xs min-w-[5.5rem]"
                  >
                    {busy ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                        <span className="sr-only">Working…</span>
                      </>
                    ) : task.status === 'pending' ? (
                      'Cancel'
                    ) : (
                      'Stop'
                    )}
                  </Button>
                )}
                {canDeleteFailed && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={busy}
                    onClick={() => void handleDeleteFailed()}
                    className="font-[family-name:var(--font-body)] text-xs min-w-[5.5rem] border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
                  >
                    {busy ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                        <span className="sr-only">Working…</span>
                      </>
                    ) : (
                      'Delete'
                    )}
                  </Button>
                )}
                {actionError && (
                  <p className="text-[10px] text-destructive text-right max-w-[220px] leading-tight">
                    {actionError}
                  </p>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default function Tasks() {
  const tasks = useTaskStore((s) => s.tasks);
  const fetchTasks = useTaskStore((s) => s.fetchTasks);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const sortedTasks = useMemo(() => {
    return [...tasks].sort((a, b) => {
      const aTime = new Date(a.createdAt || a.created_at || 0).getTime();
      const bTime = new Date(b.createdAt || b.created_at || 0).getTime();
      return bTime - aTime;
    });
  }, [tasks]);

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={pageTransition}
      className="flex flex-col h-full overflow-hidden"
    >
      <header className="shrink-0 mb-5">
        <div className="flex items-center gap-3 mb-1">
          <ClipboardList className="h-6 w-6 text-foreground" />
          <h1 className="font-display text-2xl font-semibold text-foreground tracking-tight">
            Tasks
          </h1>
        </div>
        <p className="text-sm text-muted-foreground ml-9">
          {tasks.length} task{tasks.length !== 1 ? 's' : ''} total
        </p>
      </header>

      <ScrollArea className="flex-1 min-h-0">
        {sortedTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-4">
            <div className="rounded-full bg-muted p-4 mb-4">
              <ClipboardList className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="font-display text-lg font-semibold text-foreground mb-1">
              No tasks yet
            </h3>
            <p className="text-sm text-muted-foreground text-center max-w-sm">
              Submit a goal from the Dashboard to create your first task. All task history will appear here.
            </p>
          </div>
        ) : (
          <div className="pr-4">
            <AnimatePresence mode="popLayout">
              {sortedTasks.map((task, index) => (
                <TaskCard key={task.id} task={task} index={index} />
              ))}
            </AnimatePresence>
          </div>
        )}
      </ScrollArea>
    </motion.div>
  );
}
