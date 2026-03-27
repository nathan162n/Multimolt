import { useState, useRef, useEffect, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Trash2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import useTaskStore from '../../store/taskStore';
import FeedEntry from './FeedEntry';

const MAX_DOM_ITEMS = 300;
const FILTER_TABS = ['All', 'Security', 'Errors'];

export default function ActivityFeed() {
  const feedMessages = useTaskStore((s) => s.feedMessages);
  const clearFeed = useTaskStore((s) => s.clearFeed);
  const [activeFilter, setActiveFilter] = useState('All');
  const scrollRef = useRef(null);

  const filtered = feedMessages
    .filter((msg) => {
      if (activeFilter === 'Security') return msg.type === 'security';
      if (activeFilter === 'Errors') return msg.type === 'error';
      return true;
    })
    .slice(0, MAX_DOM_ITEMS);

  // Auto-scroll to top when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [feedMessages.length]);

  return (
    <div className="h-[240px] flex flex-col rounded-lg border border-[color:var(--color-border-light)] bg-[color:var(--color-bg-base)] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[color:var(--color-border-light)] bg-[color:var(--color-bg-surface)] shrink-0">
        <div className="flex items-center gap-0.5">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveFilter(tab)}
              className={cn(
                'px-2.5 py-1 rounded-[5px] font-body text-[length:var(--text-xs)]',
                'transition-all duration-[150ms] ease-[cubic-bezier(0.25,0.46,0.45,0.94)]',
                'focus-visible:outline-2 focus-visible:outline-[color:var(--color-text-primary)] focus-visible:outline-offset-2',
                activeFilter === tab
                  ? 'font-medium text-[color:var(--color-text-primary)] bg-[color:var(--color-bg-elevated)]'
                  : 'text-[color:var(--color-text-tertiary)] bg-transparent hover:text-[color:var(--color-text-secondary)]'
              )}
            >
              {tab}
            </button>
          ))}
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={clearFeed}
          className="h-6 w-6 text-[color:var(--color-text-disabled)] hover:text-[color:var(--color-text-secondary)]"
          aria-label="Clear feed"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Feed content */}
      <ScrollArea className="flex-1">
        <div ref={scrollRef} className="py-1">
          <AnimatePresence initial={false}>
            {filtered.map((entry) => (
              <FeedEntry
                key={entry.id || `${entry.timestamp}-${entry.agentName}`}
                entry={entry}
              />
            ))}
          </AnimatePresence>

          {filtered.length === 0 && (
            <div className="flex items-center justify-center h-[180px] font-body text-[length:var(--text-sm)] text-[color:var(--color-text-disabled)]">
              No activity yet
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
