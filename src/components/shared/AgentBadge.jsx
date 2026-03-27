import { useNavigate } from 'react-router-dom';
import StatusDot from './StatusDot';

export default function AgentBadge({ agent, onClick }) {
  const navigate = useNavigate();

  const handleClick = () => {
    if (onClick) {
      onClick(agent);
    } else {
      navigate(`/agents?id=${agent.id}`);
    }
  };

  return (
    <button
      onClick={handleClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '2px 10px 2px 6px',
        borderRadius: 'var(--radius-full)',
        background: 'var(--color-bg-elevated)',
        border: '1px solid var(--color-border-light)',
        fontFamily: 'var(--font-body)',
        fontSize: 'var(--text-xs)',
        fontWeight: 500,
        color: 'var(--color-text-secondary)',
        cursor: 'pointer',
        transition: 'background var(--dur-fast) var(--ease-smooth)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'var(--color-bg-overlay)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'var(--color-bg-elevated)';
      }}
      onFocus={(e) => {
        e.currentTarget.style.outline = '2px solid var(--color-text-primary)';
        e.currentTarget.style.outlineOffset = '2px';
      }}
      onBlur={(e) => {
        e.currentTarget.style.outline = 'none';
      }}
    >
      <StatusDot status={agent.status} size={6} />
      <span>{agent.name}</span>
    </button>
  );
}
