import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import useAgentStore from '../../store/agentStore';

const MAX_CHARS = 2000;

export default function GoalInput() {
  const [value, setValue] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const submitGoal = useAgentStore((s) => s.submitGoal);

  const handleChange = useCallback((e) => {
    const text = e.target.value;
    if (text.length <= MAX_CHARS) {
      setValue(text);
    }
  }, []);

  const handleSubmit = useCallback(async () => {
    const trimmed = value.trim();
    if (!trimmed) return;
    setSubmitted(true);
    await submitGoal(trimmed);
    setTimeout(() => {
      setValue('');
      setSubmitted(false);
    }, 600);
  }, [value, submitGoal]);

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit]
  );

  const charWarning = value.length > MAX_CHARS * 0.9;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={submitted ? 'submitted' : 'editing'}
        initial={submitted ? { scale: 1, opacity: 1 } : { opacity: 0, y: 12 }}
        animate={submitted ? { scale: 0.96, opacity: 0 } : { opacity: 1, y: 0 }}
        exit={submitted ? { scale: 0.96, opacity: 0 } : { opacity: 0, y: -8 }}
        transition={{
          duration: submitted ? 0.4 : 0.3,
          ease: submitted ? [0.4, 0, 1, 1] : [0.25, 0.46, 0.45, 0.94],
        }}
        className="flex flex-col gap-2"
      >
        <div className="relative">
          <Textarea
            value={value}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder="What should your agents accomplish?"
            rows={3}
            className={cn(
              'resize-none font-body text-[length:var(--text-md)] leading-[22px] pr-14',
              'bg-[color:var(--color-input-bg)] border-[color:var(--color-input-border)]',
              'focus-visible:ring-[color:var(--color-input-border-focus)]',
              'text-[color:var(--color-text-primary)]',
              'placeholder:text-[color:var(--color-text-disabled)]',
              'min-h-[90px] rounded-lg p-4'
            )}
          />
          <Button
            size="icon"
            onClick={handleSubmit}
            disabled={!value.trim()}
            className={cn(
              'absolute bottom-3 right-3',
              'bg-[color:var(--color-btn-primary-bg)] text-[color:var(--color-btn-primary-text)]',
              'hover:bg-[color:var(--color-btn-primary-hover)]',
              'rounded-md h-8 w-8',
              'disabled:opacity-30'
            )}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 font-body text-[length:var(--text-xs)] text-[color:var(--color-text-disabled)]">
            <kbd className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-[3px] bg-[color:var(--color-bg-elevated)] border border-[color:var(--color-border-medium)] font-mono text-[length:var(--text-2xs)] font-medium text-[color:var(--color-text-tertiary)] shadow-[0_1px_0_var(--color-border-medium)]">
              Enter
            </kbd>
            <span>to submit</span>
            <span className="mx-1">/</span>
            <kbd className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-[3px] bg-[color:var(--color-bg-elevated)] border border-[color:var(--color-border-medium)] font-mono text-[length:var(--text-2xs)] font-medium text-[color:var(--color-text-tertiary)] shadow-[0_1px_0_var(--color-border-medium)]">
              Shift+Enter
            </kbd>
            <span>for newline</span>
          </div>
          <span
            className={cn(
              'font-mono text-[length:var(--text-2xs)]',
              charWarning
                ? 'text-[color:var(--color-status-warning-text)]'
                : 'text-[color:var(--color-text-disabled)]'
            )}
          >
            {value.length}/{MAX_CHARS}
          </span>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
