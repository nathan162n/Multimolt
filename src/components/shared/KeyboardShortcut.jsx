export default function KeyboardShortcut({ keys, style = {} }) {
  const keyList = typeof keys === 'string' ? keys.split('+') : keys;

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 3,
        ...style,
      }}
    >
      {keyList.map((key, i) => (
        <kbd
          key={i}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            minWidth: 20,
            height: 20,
            padding: '0 5px',
            borderRadius: 'var(--radius-xs)',
            background: 'var(--color-bg-elevated)',
            border: '1px solid var(--color-border-medium)',
            fontFamily: 'var(--font-mono)',
            fontSize: 'var(--text-2xs)',
            fontWeight: 500,
            color: 'var(--color-text-tertiary)',
            lineHeight: 1,
            boxShadow: '0 1px 0 var(--color-border-medium)',
          }}
        >
          {key.trim()}
        </kbd>
      ))}
    </span>
  );
}
