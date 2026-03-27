import { useEffect } from 'react';
import { motion } from 'framer-motion';
import useAgentStore from '../store/agentStore';
import GoalInput from '../components/dashboard/GoalInput';
import TaskProgress from '../components/dashboard/TaskProgress';
import AgentGrid from '../components/dashboard/AgentGrid';
import ActivityFeed from '../components/dashboard/ActivityFeed';

const pageVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
};

const pageTransition = {
  duration: 0.42,
  ease: [0.25, 0.46, 0.45, 0.94],
};

export default function Dashboard() {
  const isRunning = useAgentStore((s) => s.isRunning);
  const agents = useAgentStore((s) => s.agents);
  const fetchAgents = useAgentStore((s) => s.fetchAgents);

  useEffect(() => {
    const agentKeys = Object.keys(agents);
    if (agentKeys.length === 0) {
      fetchAgents();
    }
  }, [agents, fetchAgents]);

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
        <h1 className="font-display text-[length:var(--text-2xl)] font-semibold text-[color:var(--color-text-primary)] leading-tight m-0">
          Dashboard
        </h1>
      </header>

      {!isRunning && (
        <div className="shrink-0 mb-5">
          <GoalInput />
        </div>
      )}

      {isRunning && (
        <div className="shrink-0 mb-4">
          <TaskProgress />
        </div>
      )}

      <div className="flex-1 min-h-0 overflow-auto mb-4">
        <AgentGrid />
      </div>

      <div className="shrink-0 h-[240px] border-t border-[color:var(--color-border-light)]">
        <ActivityFeed />
      </div>
    </motion.div>
  );
}
