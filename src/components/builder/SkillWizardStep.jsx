import { useCallback } from 'react';
import { AlertTriangle } from 'lucide-react';

const MODELS = [
  { value: 'claude-sonnet-4-20250514', label: 'Claude Sonnet 4' },
  { value: 'claude-opus-4-20250514', label: 'Claude Opus 4' },
  { value: 'claude-3-5-haiku-20241022', label: 'Claude 3.5 Haiku' },
  { value: 'gpt-4o', label: 'GPT-4o' },
  { value: 'gpt-4o-mini', label: 'GPT-4o Mini' },
];

const TOOLS = [
  { id: 'file_read', label: 'File Read', danger: false },
  { id: 'file_write', label: 'File Write', danger: true },
  { id: 'shell_exec', label: 'Shell Execute', danger: true },
  { id: 'web_search', label: 'Web Search', danger: false },
  { id: 'web_fetch', label: 'Web Fetch', danger: false },
  { id: 'code_exec', label: 'Code Execute', danger: true },
  { id: 'db_query', label: 'Database Query', danger: false },
  { id: 'db_write', label: 'Database Write', danger: true },
  { id: 'api_call', label: 'External API', danger: true },
  { id: 'memory_write', label: 'Memory Write', danger: false },
];

export default function SkillWizardStep({ data, onUpdate }) {
  const handleToolToggle = useCallback(
    (toolId) => {
      const updated = { ...data.tools, [toolId]: !data.tools[toolId] };
      onUpdate({ tools: updated });
    },
    [data.tools, onUpdate]
  );

  const handleSliderChange = useCallback(
    (e) => {
      onUpdate({ maxConcurrent: parseInt(e.target.value, 10) });
    },
    [onUpdate]
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <label
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 'var(--text-sm)',
            fontWeight: 500,
            color: 'var(--color-text-primary)',
          }}
        >
          Model
        </label>
        <select
          value={data.model}
          onChange={(e) => onUpdate({ model: e.target.value })}
          style={{
            padding: '8px 12px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--color-input-border)',
            background: 'var(--color-input-bg)',
            fontFamily: 'var(--font-body)',
            fontSize: 'var(--text-base)',
            color: 'var(--color-text-primary)',
            cursor: 'pointer',
          }}
          onFocus={(e) => {
            e.currentTarget.style.outline = '2px solid var(--color-text-primary)';
            e.currentTarget.style.outlineOffset = '2px';
          }}
          onBlur={(e) => {
            e.currentTarget.style.outline = 'none';
          }}
        >
          {MODELS.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <label
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 'var(--text-sm)',
            fontWeight: 500,
            color: 'var(--color-text-primary)',
          }}
        >
          Tool Permissions
        </label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {TOOLS.map((tool) => {
            const enabled = !!data.tools[tool.id];
            return (
              <label
                key={tool.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border-light)',
                  background: 'var(--color-bg-base)',
                  cursor: 'pointer',
                  transition: 'background var(--dur-fast) var(--ease-smooth)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--color-bg-surface)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'var(--color-bg-base)';
                }}
              >
                <span
                  style={{
                    position: 'relative',
                    display: 'inline-flex',
                    alignItems: 'center',
                    width: 36,
                    height: 20,
                    flexShrink: 0,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={enabled}
                    onChange={() => handleToolToggle(tool.id)}
                    style={{
                      position: 'absolute',
                      opacity: 0,
                      width: 0,
                      height: 0,
                    }}
                    onFocus={(e) => {
                      e.currentTarget.parentElement.style.outline = '2px solid var(--color-text-primary)';
                      e.currentTarget.parentElement.style.outlineOffset = '2px';
                    }}
                    onBlur={(e) => {
                      e.currentTarget.parentElement.style.outline = 'none';
                    }}
                  />
                  <span
                    style={{
                      position: 'absolute',
                      inset: 0,
                      borderRadius: 'var(--radius-full)',
                      background: enabled
                        ? 'var(--color-text-primary)'
                        : 'var(--color-bg-elevated)',
                      border: enabled ? 'none' : '1px solid var(--color-border-medium)',
                      transition: 'background var(--dur-fast) var(--ease-smooth)',
                    }}
                  />
                  <span
                    style={{
                      position: 'absolute',
                      left: enabled ? 18 : 2,
                      top: 2,
                      width: 16,
                      height: 16,
                      borderRadius: 'var(--radius-full)',
                      background: enabled
                        ? 'var(--color-text-inverse)'
                        : 'var(--color-text-disabled)',
                      transition: 'left var(--dur-fast) var(--ease-spring)',
                    }}
                  />
                </span>

                <span
                  style={{
                    flex: 1,
                    fontFamily: 'var(--font-body)',
                    fontSize: 'var(--text-sm)',
                    color: 'var(--color-text-primary)',
                  }}
                >
                  {tool.label}
                </span>

                {tool.danger && (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      padding: '1px 6px',
                      borderRadius: 'var(--radius-full)',
                      background: 'var(--color-status-warning-bg)',
                      color: 'var(--color-status-warning-text)',
                      fontFamily: 'var(--font-body)',
                      fontSize: 'var(--text-2xs)',
                      fontWeight: 500,
                    }}
                  >
                    <AlertTriangle size={10} />
                    High-risk
                  </span>
                )}
              </label>
            );
          })}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <label
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 'var(--text-sm)',
              fontWeight: 500,
              color: 'var(--color-text-primary)',
            }}
          >
            Sandbox Mode
          </label>
          <label
            style={{
              position: 'relative',
              display: 'inline-flex',
              alignItems: 'center',
              width: 36,
              height: 20,
              cursor: 'pointer',
            }}
          >
            <input
              type="checkbox"
              checked={data.sandbox}
              onChange={(e) => onUpdate({ sandbox: e.target.checked })}
              style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }}
              onFocus={(e) => {
                e.currentTarget.parentElement.style.outline = '2px solid var(--color-text-primary)';
                e.currentTarget.parentElement.style.outlineOffset = '2px';
              }}
              onBlur={(e) => {
                e.currentTarget.parentElement.style.outline = 'none';
              }}
            />
            <span
              style={{
                position: 'absolute',
                inset: 0,
                borderRadius: 'var(--radius-full)',
                background: data.sandbox
                  ? 'var(--color-text-primary)'
                  : 'var(--color-bg-elevated)',
                border: data.sandbox ? 'none' : '1px solid var(--color-border-medium)',
                transition: 'background var(--dur-fast) var(--ease-smooth)',
              }}
            />
            <span
              style={{
                position: 'absolute',
                left: data.sandbox ? 18 : 2,
                top: 2,
                width: 16,
                height: 16,
                borderRadius: 'var(--radius-full)',
                background: data.sandbox
                  ? 'var(--color-text-inverse)'
                  : 'var(--color-text-disabled)',
                transition: 'left var(--dur-fast) var(--ease-spring)',
              }}
            />
          </label>
        </div>
        <span
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 'var(--text-xs)',
            color: 'var(--color-text-tertiary)',
          }}
        >
          When enabled, the agent runs in an isolated sandbox environment.
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <label
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 'var(--text-sm)',
              fontWeight: 500,
              color: 'var(--color-text-primary)',
            }}
          >
            Max Concurrent Tasks
          </label>
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
        <input
          type="range"
          min={1}
          max={10}
          value={data.maxConcurrent}
          onChange={handleSliderChange}
          style={{
            width: '100%',
            accentColor: 'var(--color-text-primary)',
            cursor: 'pointer',
          }}
          onFocus={(e) => {
            e.currentTarget.style.outline = '2px solid var(--color-text-primary)';
            e.currentTarget.style.outlineOffset = '2px';
          }}
          onBlur={(e) => {
            e.currentTarget.style.outline = 'none';
          }}
        />
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontFamily: 'var(--font-mono)',
            fontSize: 'var(--text-2xs)',
            color: 'var(--color-text-disabled)',
          }}
        >
          <span>1</span>
          <span>10</span>
        </div>
      </div>
    </div>
  );
}
