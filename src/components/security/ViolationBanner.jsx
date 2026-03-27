import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X } from 'lucide-react';

export default function ViolationBanner({ violation, onDismiss }) {
  return (
    <AnimatePresence>
      {violation && (
        <motion.div
          initial={{ opacity: 0, y: -40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -40 }}
          transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
          role="alert"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '10px 16px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--color-status-warning-bg)',
            border: '1px solid var(--color-status-warning-dot)',
          }}
        >
          <AlertTriangle
            size={16}
            style={{
              color: 'var(--color-status-warning-dot)',
              flexShrink: 0,
            }}
          />

          <div style={{ flex: 1 }}>
            <div
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: 'var(--text-sm)',
                fontWeight: 500,
                color: 'var(--color-status-warning-text)',
              }}
            >
              Security Violation
            </div>
            <div
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: 'var(--text-xs)',
                color: 'var(--color-status-warning-text)',
                opacity: 0.8,
                marginTop: 2,
              }}
            >
              {violation.message || 'An agent attempted a restricted action.'}
              {violation.agentName && (
                <span
                  style={{
                    fontWeight: 500,
                    marginLeft: 4,
                  }}
                >
                  ({violation.agentName})
                </span>
              )}
            </div>
          </div>

          <button
            onClick={onDismiss}
            aria-label="Dismiss violation banner"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 24,
              height: 24,
              borderRadius: 'var(--radius-sm)',
              color: 'var(--color-status-warning-text)',
              cursor: 'pointer',
              flexShrink: 0,
              transition: 'opacity var(--dur-fast) var(--ease-smooth)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.opacity = '0.7';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = '1';
            }}
            onFocus={(e) => {
              e.currentTarget.style.outline = '2px solid var(--color-text-primary)';
              e.currentTarget.style.outlineOffset = '2px';
            }}
            onBlur={(e) => {
              e.currentTarget.style.outline = 'none';
            }}
          >
            <X size={14} />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
