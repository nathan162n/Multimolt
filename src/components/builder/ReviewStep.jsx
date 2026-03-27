import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Rocket } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { upsertAgent } from '../../services/db';
import Badge from '../shared/Badge';
import CodeBlock from '../shared/CodeBlock';
import LoadingSpinner from '../shared/LoadingSpinner';

export default function ReviewStep({ data }) {
  const navigate = useNavigate();
  const [creating, setCreating] = useState(false);

  const IconComp = LucideIcons[data.icon] || LucideIcons.Bot;

  const enabledTools = Object.entries(data.tools)
    .filter(([, v]) => v)
    .map(([k]) => k);

  const handleCreate = useCallback(async () => {
    setCreating(true);
    await upsertAgent({
      name: data.name,
      role: data.role,
      icon: data.icon,
      tone: data.tone,
      expertise: data.expertise,
      soulMd: data.soulMd,
      model: data.model,
      tools: data.tools,
      sandbox: data.sandbox,
      maxConcurrent: data.maxConcurrent,
    });
    setCreating(false);
    navigate('/');
  }, [data, navigate]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          padding: '16px 20px',
          borderRadius: 'var(--radius-lg)',
          background: 'var(--color-bg-surface)',
          border: '1px solid var(--color-border-light)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 44,
            height: 44,
            borderRadius: 'var(--radius-md)',
            background: 'var(--color-bg-elevated)',
            color: 'var(--color-text-primary)',
          }}
        >
          <IconComp size={22} />
        </div>
        <div>
          <div
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 'var(--text-md)',
              fontWeight: 500,
              color: 'var(--color-text-primary)',
            }}
          >
            {data.name || 'Unnamed Agent'}
          </div>
          <div
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 'var(--text-xs)',
              color: 'var(--color-text-tertiary)',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
            }}
          >
            {data.role || 'No role'}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 'var(--text-xs)',
              fontWeight: 500,
              color: 'var(--color-text-tertiary)',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
            }}
          >
            Model
          </span>
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 'var(--text-sm)',
              color: 'var(--color-text-secondary)',
            }}
          >
            {data.model}
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 'var(--text-xs)',
              fontWeight: 500,
              color: 'var(--color-text-tertiary)',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
            }}
          >
            Tone
          </span>
          <Badge label={data.tone} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 'var(--text-xs)',
              fontWeight: 500,
              color: 'var(--color-text-tertiary)',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
            }}
          >
            Expertise
          </span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {data.expertise.length > 0 ? (
              data.expertise.map((tag) => <Badge key={tag} label={tag} />)
            ) : (
              <span
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: 'var(--text-sm)',
                  color: 'var(--color-text-disabled)',
                }}
              >
                None specified
              </span>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 'var(--text-xs)',
              fontWeight: 500,
              color: 'var(--color-text-tertiary)',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
            }}
          >
            Tools ({enabledTools.length} enabled)
          </span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {enabledTools.length > 0 ? (
              enabledTools.map((tool) => <Badge key={tool} label={tool} />)
            ) : (
              <span
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: 'var(--text-sm)',
                  color: 'var(--color-text-disabled)',
                }}
              >
                No tools enabled
              </span>
            )}
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            gap: 20,
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: 'var(--text-xs)',
                fontWeight: 500,
                color: 'var(--color-text-tertiary)',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
              }}
            >
              Sandbox
            </span>
            <Badge
              label={data.sandbox ? 'Enabled' : 'Disabled'}
              variant={data.sandbox ? 'success' : 'warning'}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: 'var(--text-xs)',
                fontWeight: 500,
                color: 'var(--color-text-tertiary)',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
              }}
            >
              Max Concurrent
            </span>
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 'var(--text-sm)',
                color: 'var(--color-text-secondary)',
              }}
            >
              {data.maxConcurrent}
            </span>
          </div>
        </div>
      </div>

      {data.soulMd && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 'var(--text-xs)',
              fontWeight: 500,
              color: 'var(--color-text-tertiary)',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
            }}
          >
            SOUL.md Preview
          </span>
          <CodeBlock language="markdown">{data.soulMd}</CodeBlock>
        </div>
      )}

      <button
        onClick={handleCreate}
        disabled={creating || !data.name}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          padding: '10px 24px',
          borderRadius: 'var(--radius-md)',
          background:
            creating || !data.name
              ? 'var(--color-bg-elevated)'
              : 'var(--color-btn-primary-bg)',
          color:
            creating || !data.name
              ? 'var(--color-text-disabled)'
              : 'var(--color-btn-primary-text)',
          fontFamily: 'var(--font-body)',
          fontSize: 'var(--text-md)',
          fontWeight: 500,
          cursor: creating || !data.name ? 'not-allowed' : 'pointer',
          transition: 'all var(--dur-fast) var(--ease-smooth)',
          alignSelf: 'flex-end',
        }}
        onMouseEnter={(e) => {
          if (!creating && data.name)
            e.currentTarget.style.background = 'var(--color-btn-primary-hover)';
        }}
        onMouseLeave={(e) => {
          if (!creating && data.name)
            e.currentTarget.style.background = 'var(--color-btn-primary-bg)';
        }}
        onFocus={(e) => {
          e.currentTarget.style.outline = '2px solid var(--color-text-primary)';
          e.currentTarget.style.outlineOffset = '2px';
        }}
        onBlur={(e) => {
          e.currentTarget.style.outline = 'none';
        }}
      >
        {creating ? (
          <LoadingSpinner size={16} color="var(--color-text-disabled)" />
        ) : (
          <Rocket size={16} />
        )}
        {creating ? 'Creating...' : 'Create Agent'}
      </button>
    </div>
  );
}
