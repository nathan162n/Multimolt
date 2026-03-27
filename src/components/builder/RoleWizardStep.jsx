import { useState, useCallback, useMemo } from 'react';
import MarkdownEditor from '../shared/MarkdownEditor';

const SECTIONS = [
  {
    key: 'identity',
    label: 'Identity',
    prompt: 'Who is this agent? What is its name and primary purpose?',
    prefix: '## Identity\n',
  },
  {
    key: 'tone',
    label: 'Tone',
    prompt: 'How should this agent communicate? Formal, casual, terse?',
    prefix: '## Tone & Voice\n',
  },
  {
    key: 'rules',
    label: 'Rules',
    prompt: 'What rules must this agent always follow?',
    prefix: '## Rules\n',
  },
  {
    key: 'expertise',
    label: 'Expertise',
    prompt: 'What domains and skills does this agent specialize in?',
    prefix: '## Expertise\n',
  },
  {
    key: 'boundaries',
    label: 'Boundaries',
    prompt: 'What is this agent NOT allowed to do?',
    prefix: '## Boundaries\n',
  },
];

export default function RoleWizardStep({ data, onUpdate }) {
  const [activeSection, setActiveSection] = useState('identity');
  const [sections, setSections] = useState(() => {
    const parsed = {};
    SECTIONS.forEach((s) => { parsed[s.key] = ''; });
    if (data.soulMd) {
      let currentKey = null;
      for (const line of data.soulMd.split('\n')) {
        const match = SECTIONS.find((s) => line.startsWith(s.prefix.trim()));
        if (match) {
          currentKey = match.key;
          continue;
        }
        if (currentKey) {
          parsed[currentKey] += (parsed[currentKey] ? '\n' : '') + line;
        }
      }
      SECTIONS.forEach((s) => {
        parsed[s.key] = (parsed[s.key] || '').trim();
      });
    }
    return parsed;
  });

  const handleSectionChange = useCallback(
    (value) => {
      const updated = { ...sections, [activeSection]: value };
      setSections(updated);
      const md = SECTIONS.map(
        (s) => (updated[s.key] ? `${s.prefix}${updated[s.key]}\n` : '')
      )
        .filter(Boolean)
        .join('\n');
      onUpdate({ soulMd: `# ${data.name || 'Agent'} SOUL\n\n${md}` });
    },
    [activeSection, sections, onUpdate, data.name]
  );

  const preview = useMemo(() => {
    const md = SECTIONS.map(
      (s) => (sections[s.key] ? `${s.prefix}${sections[s.key]}\n` : '')
    )
      .filter(Boolean)
      .join('\n');
    return `# ${data.name || 'Agent'} SOUL\n\n${md}`;
  }, [sections, data.name]);

  return (
    <div style={{ display: 'flex', gap: 20, minHeight: 400 }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {SECTIONS.map((section) => (
            <button
              key={section.key}
              onClick={() => setActiveSection(section.key)}
              style={{
                padding: '6px 12px',
                borderRadius: 'var(--radius-sm)',
                fontFamily: 'var(--font-body)',
                fontSize: 'var(--text-xs)',
                fontWeight: activeSection === section.key ? 500 : 400,
                color:
                  activeSection === section.key
                    ? 'var(--color-text-primary)'
                    : 'var(--color-text-tertiary)',
                background:
                  activeSection === section.key
                    ? 'var(--color-bg-elevated)'
                    : 'transparent',
                cursor: 'pointer',
                transition: 'all var(--dur-fast) var(--ease-smooth)',
              }}
              onFocus={(e) => {
                e.currentTarget.style.outline = '2px solid var(--color-text-primary)';
                e.currentTarget.style.outlineOffset = '2px';
              }}
              onBlur={(e) => {
                e.currentTarget.style.outline = 'none';
              }}
            >
              {section.label}
            </button>
          ))}
        </div>

        <p
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 'var(--text-sm)',
            color: 'var(--color-text-tertiary)',
            fontStyle: 'italic',
            margin: 0,
          }}
        >
          {SECTIONS.find((s) => s.key === activeSection)?.prompt}
        </p>

        <textarea
          value={sections[activeSection]}
          onChange={(e) => handleSectionChange(e.target.value)}
          placeholder={`Write the ${activeSection} section...`}
          style={{
            flex: 1,
            padding: '12px 16px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--color-input-border)',
            background: 'var(--color-input-bg)',
            fontFamily: 'var(--font-body)',
            fontSize: 'var(--text-sm)',
            lineHeight: 1.6,
            color: 'var(--color-text-primary)',
            resize: 'none',
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

      <div
        style={{
          width: 280,
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}
      >
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
          Live Preview
        </span>
        <div
          style={{
            flex: 1,
            padding: 12,
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--color-border-light)',
            background: 'var(--color-bg-surface)',
            overflowY: 'auto',
          }}
        >
          <pre
            style={{
              margin: 0,
              fontFamily: 'var(--font-mono)',
              fontSize: 'var(--text-xs)',
              lineHeight: 1.6,
              color: 'var(--color-text-secondary)',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}
          >
            {preview}
          </pre>
        </div>
      </div>
    </div>
  );
}
