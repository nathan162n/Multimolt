import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, AlertTriangle } from 'lucide-react';
import { listSkills, toggleSkill, installSkill, uninstallSkill } from '../../services/db';
import EmptyState from '../shared/EmptyState';
import LoadingSpinner from '../shared/LoadingSpinner';

export default function SkillsPanel({ agentId }) {
  const [skills, setSkills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const loadSkills = useCallback(async () => {
    setLoading(true);
    const data = await listSkills(agentId);
    setSkills(data || []);
    setLoading(false);
  }, [agentId]);

  useEffect(() => {
    loadSkills();
  }, [loadSkills]);

  const handleToggle = useCallback(
    async (skillId, enabled) => {
      await toggleSkill(agentId, skillId, !enabled);
      setSkills((prev) =>
        prev.map((s) => (s.id === skillId ? { ...s, enabled: !enabled } : s))
      );
    },
    [agentId]
  );

  const handleInstall = useCallback(async () => {
    const name = window.prompt('Enter skill name to install:');
    if (!name) return;
    await installSkill(agentId, name.trim());
    loadSkills();
  }, [agentId, loadSkills]);

  const handleUninstall = useCallback(
    async (skillId) => {
      await uninstallSkill(agentId, skillId);
      setConfirmDelete(null);
      loadSkills();
    },
    [agentId, loadSkills]
  );

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 48,
        }}
      >
        <LoadingSpinner size={20} />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h3
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'var(--text-lg)',
            fontWeight: 400,
            color: 'var(--color-text-primary)',
            margin: 0,
          }}
        >
          Skills
        </h3>
        <button
          onClick={handleInstall}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '6px 14px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--color-btn-primary-bg)',
            color: 'var(--color-btn-primary-text)',
            fontFamily: 'var(--font-body)',
            fontSize: 'var(--text-sm)',
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'background var(--dur-fast) var(--ease-smooth)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--color-btn-primary-hover)';
          }}
          onMouseLeave={(e) => {
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
          <Plus size={14} />
          Install Skill
        </button>
      </div>

      {skills.length === 0 ? (
        <EmptyState
          title="No skills installed"
          description="Install skills to extend this agent's capabilities."
          actionLabel="Install Skill"
          onAction={handleInstall}
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <AnimatePresence>
            {skills.map((skill) => (
              <motion.div
                key={skill.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border-light)',
                  background: 'var(--color-bg-base)',
                }}
              >
                <label
                  style={{
                    position: 'relative',
                    display: 'inline-flex',
                    alignItems: 'center',
                    width: 36,
                    height: 20,
                    cursor: 'pointer',
                    flexShrink: 0,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={skill.enabled}
                    onChange={() => handleToggle(skill.id, skill.enabled)}
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
                      background: skill.enabled
                        ? 'var(--color-text-primary)'
                        : 'var(--color-bg-elevated)',
                      border: skill.enabled
                        ? 'none'
                        : '1px solid var(--color-border-medium)',
                      transition: 'background var(--dur-fast) var(--ease-smooth)',
                    }}
                  />
                  <span
                    style={{
                      position: 'absolute',
                      left: skill.enabled ? 18 : 2,
                      top: 2,
                      width: 16,
                      height: 16,
                      borderRadius: 'var(--radius-full)',
                      background: skill.enabled
                        ? 'var(--color-text-inverse)'
                        : 'var(--color-text-disabled)',
                      transition: 'left var(--dur-fast) var(--ease-spring)',
                    }}
                  />
                </label>

                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      fontFamily: 'var(--font-body)',
                      fontSize: 'var(--text-sm)',
                      fontWeight: 500,
                      color: 'var(--color-text-primary)',
                    }}
                  >
                    {skill.name}
                  </div>
                  {skill.description && (
                    <div
                      style={{
                        fontFamily: 'var(--font-body)',
                        fontSize: 'var(--text-xs)',
                        color: 'var(--color-text-tertiary)',
                        marginTop: 2,
                      }}
                    >
                      {skill.description}
                    </div>
                  )}
                </div>

                {confirmDelete === skill.id ? (
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      onClick={() => handleUninstall(skill.id)}
                      style={{
                        padding: '4px 10px',
                        borderRadius: 'var(--radius-sm)',
                        background: 'var(--color-status-error-bg)',
                        color: 'var(--color-status-error-text)',
                        fontFamily: 'var(--font-body)',
                        fontSize: 'var(--text-xs)',
                        fontWeight: 500,
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
                      Confirm
                    </button>
                    <button
                      onClick={() => setConfirmDelete(null)}
                      style={{
                        padding: '4px 10px',
                        borderRadius: 'var(--radius-sm)',
                        background: 'var(--color-bg-elevated)',
                        color: 'var(--color-text-secondary)',
                        fontFamily: 'var(--font-body)',
                        fontSize: 'var(--text-xs)',
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
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmDelete(skill.id)}
                    aria-label={`Uninstall ${skill.name}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 28,
                      height: 28,
                      borderRadius: 'var(--radius-sm)',
                      color: 'var(--color-text-disabled)',
                      cursor: 'pointer',
                      transition: 'color var(--dur-fast) var(--ease-smooth)',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = 'var(--color-status-error-text)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = 'var(--color-text-disabled)';
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.outline = '2px solid var(--color-text-primary)';
                      e.currentTarget.style.outlineOffset = '2px';
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.outline = 'none';
                    }}
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
