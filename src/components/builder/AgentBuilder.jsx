import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import SoulWizardStep from './SoulWizardStep';
import RoleWizardStep from './RoleWizardStep';
import SkillWizardStep from './SkillWizardStep';
import ReviewStep from './ReviewStep';

const STEPS = [
  { key: 'soul', label: 'Identity' },
  { key: 'role', label: 'Soul' },
  { key: 'skills', label: 'Config' },
  { key: 'review', label: 'Review' },
];

export default function AgentBuilder() {
  const [currentStep, setCurrentStep] = useState(0);
  const [agentData, setAgentData] = useState({
    name: '',
    role: '',
    icon: 'Bot',
    tone: 'professional',
    expertise: [],
    soulMd: '',
    model: 'claude-sonnet-4-20250514',
    tools: {},
    sandbox: true,
    maxConcurrent: 3,
  });

  const updateData = useCallback((partial) => {
    setAgentData((prev) => ({ ...prev, ...partial }));
  }, []);

  const handleNext = useCallback(() => {
    setCurrentStep((s) => Math.min(s + 1, STEPS.length - 1));
  }, []);

  const handleBack = useCallback(() => {
    setCurrentStep((s) => Math.max(s - 1, 0));
  }, []);

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return <SoulWizardStep data={agentData} onUpdate={updateData} />;
      case 1:
        return <RoleWizardStep data={agentData} onUpdate={updateData} />;
      case 2:
        return <SkillWizardStep data={agentData} onUpdate={updateData} />;
      case 3:
        return <ReviewStep data={agentData} />;
      default:
        return null;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 720 }}>
      <h2
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'var(--text-xl)',
          fontWeight: 600,
          color: 'var(--color-text-primary)',
          margin: 0,
        }}
      >
        Create Agent
      </h2>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {STEPS.map((step, i) => (
          <div key={step.key} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 24,
                  height: 24,
                  borderRadius: 'var(--radius-full)',
                  background:
                    i < currentStep
                      ? 'var(--color-text-primary)'
                      : i === currentStep
                      ? 'var(--color-text-primary)'
                      : 'var(--color-bg-elevated)',
                  color:
                    i <= currentStep
                      ? 'var(--color-text-inverse)'
                      : 'var(--color-text-disabled)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 'var(--text-2xs)',
                  fontWeight: 500,
                  transition: 'all var(--dur-normal) var(--ease-smooth)',
                }}
              >
                {i < currentStep ? <Check size={12} /> : i + 1}
              </div>
              <span
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: 'var(--text-xs)',
                  fontWeight: i === currentStep ? 500 : 400,
                  color:
                    i === currentStep
                      ? 'var(--color-text-primary)'
                      : 'var(--color-text-tertiary)',
                }}
              >
                {step.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                style={{
                  width: 32,
                  height: 1,
                  background:
                    i < currentStep
                      ? 'var(--color-border-accent)'
                      : 'var(--color-border-light)',
                  transition: 'background var(--dur-normal) var(--ease-smooth)',
                }}
              />
            )}
          </div>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
          {renderStep()}
        </motion.div>
      </AnimatePresence>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
        <button
          onClick={handleBack}
          disabled={currentStep === 0}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '8px 16px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--color-btn-secondary-border)',
            background: 'var(--color-btn-secondary-bg)',
            color: currentStep === 0 ? 'var(--color-text-disabled)' : 'var(--color-text-primary)',
            fontFamily: 'var(--font-body)',
            fontSize: 'var(--text-sm)',
            fontWeight: 500,
            cursor: currentStep === 0 ? 'not-allowed' : 'pointer',
            transition: 'all var(--dur-fast) var(--ease-smooth)',
          }}
          onMouseEnter={(e) => {
            if (currentStep > 0) e.currentTarget.style.background = 'var(--color-btn-secondary-hover)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'var(--color-btn-secondary-bg)';
          }}
          onFocus={(e) => {
            e.currentTarget.style.outline = '2px solid var(--color-text-primary)';
            e.currentTarget.style.outlineOffset = '2px';
          }}
          onBlur={(e) => {
            e.currentTarget.style.outline = 'none';
          }}
        >
          <ArrowLeft size={14} />
          Back
        </button>

        {currentStep < STEPS.length - 1 && (
          <button
            onClick={handleNext}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 16px',
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
            Next
            <ArrowRight size={14} />
          </button>
        )}
      </div>
    </div>
  );
}
