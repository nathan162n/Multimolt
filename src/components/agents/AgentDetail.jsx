import { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAgents } from '../../hooks/useAgents';
import StatusDot from '../shared/StatusDot';
import Badge from '../shared/Badge';
import SoulEditor from './SoulEditor';
import AgentsEditor from './AgentsEditor';
import SkillsPanel from './SkillsPanel';
import MemoryViewer from './MemoryViewer';
import SessionHistory from './SessionHistory';
import EmptyState from '../shared/EmptyState';

const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'soul', label: 'Edit Soul' },
  { key: 'skills', label: 'Skills' },
  { key: 'memory', label: 'Memory' },
  { key: 'sessions', label: 'Sessions' },
  { key: 'config', label: 'Config' },
];

function OverviewTab({ agent }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <StatusDot status={agent.status} size={10} />
        <span
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 'var(--text-md)',
            fontWeight: 500,
            color: 'var(--color-text-primary)',
          }}
        >
          {agent.status.charAt(0).toUpperCase() + agent.status.slice(1)}
        </span>
        <Badge label={agent.role} />
      </div>

      {agent.currentAction && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 'var(--text-xs)',
              color: 'var(--color-text-tertiary)',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
            }}
          >
            Current Action
          </span>
          <span
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 'var(--text-sm)',
              color: 'var(--color-text-secondary)',
            }}
          >
            {agent.currentAction}
          </span>
        </div>
      )}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 12,
        }}
      >
        <div
          style={{
            padding: 16,
            borderRadius: 'var(--radius-md)',
            background: 'var(--color-bg-surface)',
            border: '1px solid var(--color-border-light)',
          }}
        >
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 'var(--text-xl)',
              fontWeight: 500,
              color: 'var(--color-text-primary)',
            }}
          >
            {agent.taskCount || 0}
          </div>
          <div
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 'var(--text-xs)',
              color: 'var(--color-text-tertiary)',
              marginTop: 2,
            }}
          >
            Tasks
          </div>
        </div>

        <div
          style={{
            padding: 16,
            borderRadius: 'var(--radius-md)',
            background: 'var(--color-bg-surface)',
            border: '1px solid var(--color-border-light)',
          }}
        >
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 'var(--text-xl)',
              fontWeight: 500,
              color: 'var(--color-text-primary)',
            }}
          >
            {agent.id.slice(0, 8)}
          </div>
          <div
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 'var(--text-xs)',
              color: 'var(--color-text-tertiary)',
              marginTop: 2,
            }}
          >
            Agent ID
          </div>
        </div>

        <div
          style={{
            padding: 16,
            borderRadius: 'var(--radius-md)',
            background: 'var(--color-bg-surface)',
            border: '1px solid var(--color-border-light)',
          }}
        >
          <div
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 'var(--text-md)',
              fontWeight: 500,
              color: 'var(--color-text-primary)',
            }}
          >
            {agent.status}
          </div>
          <div
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 'var(--text-xs)',
              color: 'var(--color-text-tertiary)',
              marginTop: 2,
            }}
          >
            Status
          </div>
        </div>
      </div>

      {agent.errorMessage && (
        <div
          style={{
            padding: 12,
            borderRadius: 'var(--radius-md)',
            background: 'var(--color-status-error-bg)',
            border: '1px solid var(--color-status-error-dot)',
            fontFamily: 'var(--font-body)',
            fontSize: 'var(--text-sm)',
            color: 'var(--color-status-error-text)',
          }}
        >
          {agent.errorMessage}
        </div>
      )}
    </div>
  );
}

function ConfigTab({ agent }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <h3
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'var(--text-lg)',
          fontWeight: 400,
          color: 'var(--color-text-primary)',
          margin: 0,
        }}
      >
        Agent Configuration
      </h3>
      <pre
        style={{
          padding: 16,
          borderRadius: 'var(--radius-md)',
          background: 'var(--color-bg-surface)',
          border: '1px solid var(--color-border-light)',
          fontFamily: 'var(--font-mono)',
          fontSize: 'var(--text-sm)',
          lineHeight: 1.6,
          color: 'var(--color-text-secondary)',
          overflowX: 'auto',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          margin: 0,
        }}
      >
        {JSON.stringify(agent, null, 2)}
      </pre>
    </div>
  );
}

export default function AgentDetail() {
  const [searchParams] = useSearchParams();
  const agentId = searchParams.get('id');
  const navigate = useNavigate();
  const { agents } = useAgents();
  const [activeTab, setActiveTab] = useState('overview');

  const agent = useMemo(
    () => agents.find((a) => a.id === agentId),
    [agents, agentId]
  );

  if (!agentId || !agent) {
    return (
      <EmptyState
        title="Select an agent"
        description="Choose an agent from the dashboard or agents list to view details."
        actionLabel="Go to Dashboard"
        onAction={() => navigate('/')}
      />
    );
  }

  const renderTab = () => {
    switch (activeTab) {
      case 'overview':
        return <OverviewTab agent={agent} />;
      case 'soul':
        return <SoulEditor agentId={agent.id} />;
      case 'skills':
        return <SkillsPanel agentId={agent.id} />;
      case 'memory':
        return <MemoryViewer agentId={agent.id} />;
      case 'sessions':
        return <SessionHistory agentId={agent.id} />;
      case 'config':
        return <ConfigTab agent={agent} />;
      default:
        return null;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button
          onClick={() => navigate('/')}
          aria-label="Back to dashboard"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 32,
            height: 32,
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--color-border-light)',
            background: 'var(--color-bg-base)',
            color: 'var(--color-text-secondary)',
            cursor: 'pointer',
            transition: 'all var(--dur-fast) var(--ease-smooth)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--color-bg-elevated)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'var(--color-bg-base)';
          }}
          onFocus={(e) => {
            e.currentTarget.style.outline = '2px solid var(--color-text-primary)';
            e.currentTarget.style.outlineOffset = '2px';
          }}
          onBlur={(e) => {
            e.currentTarget.style.outline = 'none';
          }}
        >
          <ArrowLeft size={16} />
        </button>

        <div>
          <h2
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'var(--text-xl)',
              fontWeight: 600,
              color: 'var(--color-text-primary)',
              margin: 0,
            }}
          >
            {agent.name}
          </h2>
          <span
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 'var(--text-xs)',
              color: 'var(--color-text-tertiary)',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
            }}
          >
            {agent.role}
          </span>
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          gap: 2,
          borderBottom: '1px solid var(--color-border-light)',
        }}
      >
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              padding: '8px 16px',
              fontFamily: 'var(--font-body)',
              fontSize: 'var(--text-sm)',
              fontWeight: activeTab === tab.key ? 500 : 400,
              color: activeTab === tab.key ? 'var(--color-text-primary)' : 'var(--color-text-tertiary)',
              borderBottom: activeTab === tab.key ? '2px solid var(--color-border-accent)' : '2px solid transparent',
              cursor: 'pointer',
              transition: 'all var(--dur-fast) var(--ease-smooth)',
              marginBottom: -1,
            }}
            onFocus={(e) => {
              e.currentTarget.style.outline = '2px solid var(--color-text-primary)';
              e.currentTarget.style.outlineOffset = '2px';
            }}
            onBlur={(e) => {
              e.currentTarget.style.outline = 'none';
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
          {renderTab()}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
