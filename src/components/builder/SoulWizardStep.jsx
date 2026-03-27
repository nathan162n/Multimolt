import { useState, useCallback } from 'react';
import { X } from 'lucide-react';
import * as LucideIcons from 'lucide-react';

const AVAILABLE_ICONS = [
  'Bot', 'Brain', 'Code2', 'Shield', 'Search', 'FileText',
  'Wrench', 'Zap', 'Eye', 'MessageSquare', 'Database', 'Globe',
  'Lock', 'Cpu', 'Workflow', 'Rocket', 'Sparkles', 'Terminal',
  'Layers', 'GitBranch', 'Palette', 'BarChart3', 'Network', 'Lightbulb',
];

const TONES = [
  { value: 'professional', label: 'Professional' },
  { value: 'concise', label: 'Concise' },
  { value: 'friendly', label: 'Friendly' },
  { value: 'technical', label: 'Technical' },
  { value: 'creative', label: 'Creative' },
  { value: 'formal', label: 'Formal' },
];

export default function SoulWizardStep({ data, onUpdate }) {
  const [tagInput, setTagInput] = useState('');

  const handleAddTag = useCallback(
    (e) => {
      if (e.key === 'Enter' && tagInput.trim()) {
        e.preventDefault();
        const tag = tagInput.trim();
        if (!data.expertise.includes(tag)) {
          onUpdate({ expertise: [...data.expertise, tag] });
        }
        setTagInput('');
      }
    },
    [tagInput, data.expertise, onUpdate]
  );

  const handleRemoveTag = useCallback(
    (tag) => {
      onUpdate({ expertise: data.expertise.filter((t) => t !== tag) });
    },
    [data.expertise, onUpdate]
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <label
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 'var(--text-sm)',
            fontWeight: 500,
            color: 'var(--color-text-primary)',
          }}
        >
          Agent Name
        </label>
        <input
          type="text"
          value={data.name}
          onChange={(e) => onUpdate({ name: e.target.value })}
          placeholder="e.g. Scout, Architect, Guardian"
          style={{
            padding: '8px 12px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--color-input-border)',
            background: 'var(--color-input-bg)',
            fontFamily: 'var(--font-body)',
            fontSize: 'var(--text-base)',
            color: 'var(--color-text-primary)',
            transition: 'border-color var(--dur-fast) var(--ease-smooth)',
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = 'var(--color-input-border-focus)';
            e.currentTarget.style.outline = '2px solid var(--color-text-primary)';
            e.currentTarget.style.outlineOffset = '2px';
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = 'var(--color-input-border)';
            e.currentTarget.style.outline = 'none';
          }}
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <label
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 'var(--text-sm)',
            fontWeight: 500,
            color: 'var(--color-text-primary)',
          }}
        >
          Role
        </label>
        <input
          type="text"
          value={data.role}
          onChange={(e) => onUpdate({ role: e.target.value })}
          placeholder="e.g. Researcher, Coder, Reviewer"
          style={{
            padding: '8px 12px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--color-input-border)',
            background: 'var(--color-input-bg)',
            fontFamily: 'var(--font-body)',
            fontSize: 'var(--text-base)',
            color: 'var(--color-text-primary)',
            transition: 'border-color var(--dur-fast) var(--ease-smooth)',
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = 'var(--color-input-border-focus)';
            e.currentTarget.style.outline = '2px solid var(--color-text-primary)';
            e.currentTarget.style.outlineOffset = '2px';
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = 'var(--color-input-border)';
            e.currentTarget.style.outline = 'none';
          }}
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <label
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 'var(--text-sm)',
            fontWeight: 500,
            color: 'var(--color-text-primary)',
          }}
        >
          Icon
        </label>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(8, 1fr)',
            gap: 4,
          }}
        >
          {AVAILABLE_ICONS.map((iconName) => {
            const IconComp = LucideIcons[iconName];
            if (!IconComp) return null;
            const isSelected = data.icon === iconName;
            return (
              <button
                key={iconName}
                onClick={() => onUpdate({ icon: iconName })}
                aria-label={`Select ${iconName} icon`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '100%',
                  aspectRatio: '1',
                  borderRadius: 'var(--radius-md)',
                  border: isSelected
                    ? '2px solid var(--color-border-accent)'
                    : '1px solid var(--color-border-light)',
                  background: isSelected ? 'var(--color-bg-elevated)' : 'var(--color-bg-base)',
                  color: isSelected ? 'var(--color-text-primary)' : 'var(--color-text-tertiary)',
                  cursor: 'pointer',
                  transition: 'all var(--dur-fast) var(--ease-smooth)',
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.background = 'var(--color-bg-surface)';
                    e.currentTarget.style.color = 'var(--color-text-secondary)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.background = 'var(--color-bg-base)';
                    e.currentTarget.style.color = 'var(--color-text-tertiary)';
                  }
                }}
                onFocus={(e) => {
                  e.currentTarget.style.outline = '2px solid var(--color-text-primary)';
                  e.currentTarget.style.outlineOffset = '2px';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.outline = 'none';
                }}
              >
                <IconComp size={18} />
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <label
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 'var(--text-sm)',
            fontWeight: 500,
            color: 'var(--color-text-primary)',
          }}
        >
          Tone
        </label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {TONES.map((tone) => {
            const isSelected = data.tone === tone.value;
            return (
              <button
                key={tone.value}
                onClick={() => onUpdate({ tone: tone.value })}
                style={{
                  padding: '6px 14px',
                  borderRadius: 'var(--radius-full)',
                  border: isSelected
                    ? '1px solid var(--color-border-accent)'
                    : '1px solid var(--color-border-light)',
                  background: isSelected ? 'var(--color-text-primary)' : 'var(--color-bg-base)',
                  color: isSelected ? 'var(--color-text-inverse)' : 'var(--color-text-secondary)',
                  fontFamily: 'var(--font-body)',
                  fontSize: 'var(--text-sm)',
                  cursor: 'pointer',
                  transition: 'all var(--dur-fast) var(--ease-smooth)',
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.background = 'var(--color-bg-surface)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.background = 'var(--color-bg-base)';
                  }
                }}
                onFocus={(e) => {
                  e.currentTarget.style.outline = '2px solid var(--color-text-primary)';
                  e.currentTarget.style.outlineOffset = '2px';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.outline = 'none';
                }}
              >
                {tone.label}
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <label
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 'var(--text-sm)',
            fontWeight: 500,
            color: 'var(--color-text-primary)',
          }}
        >
          Expertise Tags
        </label>
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 6,
            padding: '8px 12px',
            minHeight: 40,
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--color-input-border)',
            background: 'var(--color-input-bg)',
          }}
        >
          {data.expertise.map((tag) => (
            <span
              key={tag}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                padding: '2px 8px',
                borderRadius: 'var(--radius-full)',
                background: 'var(--color-bg-elevated)',
                border: '1px solid var(--color-border-light)',
                fontFamily: 'var(--font-body)',
                fontSize: 'var(--text-xs)',
                color: 'var(--color-text-secondary)',
              }}
            >
              {tag}
              <button
                onClick={() => handleRemoveTag(tag)}
                aria-label={`Remove ${tag}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 14,
                  height: 14,
                  borderRadius: 'var(--radius-full)',
                  color: 'var(--color-text-tertiary)',
                  cursor: 'pointer',
                }}
              >
                <X size={10} />
              </button>
            </span>
          ))}
          <input
            type="text"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={handleAddTag}
            placeholder={data.expertise.length === 0 ? 'Type and press Enter...' : ''}
            style={{
              flex: 1,
              minWidth: 100,
              border: 'none',
              outline: 'none',
              background: 'transparent',
              fontFamily: 'var(--font-body)',
              fontSize: 'var(--text-sm)',
              color: 'var(--color-text-primary)',
              padding: '2px 0',
            }}
          />
        </div>
      </div>
    </div>
  );
}
