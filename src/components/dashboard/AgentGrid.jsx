import { motion } from 'framer-motion';
import { sortAgentsByPresetOrder } from '@/lib/agentDisplayOrder';
import useAgentStore from '../../store/agentStore';
import AgentCard from './AgentCard';
import AgentCardSkeleton from './AgentCardSkeleton';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.055,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.35,
      ease: [0.25, 0.46, 0.45, 0.94],
    },
  },
};

export default function AgentGrid() {
  const agents = useAgentStore((s) => s.agents);
  const isLoading = useAgentStore((s) => s.isLoading);

  const agentList = sortAgentsByPresetOrder(Object.values(agents));

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {Array.from({ length: 9 }).map((_, i) => (
          <AgentCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (agentList.length === 0) {
    return (
      <div className="flex items-center justify-center h-full min-h-[200px]">
        <div className="text-center">
          <p className="font-body text-[length:var(--text-sm)] text-[color:var(--color-text-disabled)]">
            No agents found
          </p>
          <p className="font-body text-[length:var(--text-xs)] text-[color:var(--color-text-disabled)] mt-1">
            Connect to Supabase and ensure agents are seeded
          </p>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {agentList.map((agent) => (
        <motion.div key={agent.id} variants={itemVariants}>
          <AgentCard agent={agent} />
        </motion.div>
      ))}
    </motion.div>
  );
}
