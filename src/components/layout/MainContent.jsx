import { Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';

export default function MainContent() {
  const location = useLocation();

  return (
    <main
      style={{
        flex: 1,
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{
            duration: 0.2,
            ease: [0.25, 0.46, 0.45, 0.94],
          }}
          style={{
            height: '100%',
            overflow: 'auto',
            padding: 'var(--content-padding)',
          }}
        >
          <Outlet />
        </motion.div>
      </AnimatePresence>
    </main>
  );
}
