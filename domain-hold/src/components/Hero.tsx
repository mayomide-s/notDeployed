import { motion } from 'framer-motion'
import { ArrowDown, Sparkles } from 'lucide-react'

type HeroProps = {
  hostname: string
  onPlayClick: () => void
}

export function Hero({ hostname, onPlayClick }: HeroProps) {
  return (
    <section className="hero-section">
      <motion.div
        className="hero-card shell-panel"
        initial={{ opacity: 0, y: 28 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
      >
        <motion.div
          className="status-pill"
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.15, duration: 0.45 }}
        >
          <Sparkles size={14} />
          <span>Reserved • Building soon</span>
        </motion.div>

        <div className="hero-copy">
          <motion.p
            className="eyebrow"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            Premium placeholder
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.7 }}
          >
            Nothing here yet.
          </motion.h1>
          <motion.p
            className="hero-subtitle"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.7 }}
          >
            This domain is reserved for something worth waiting for.
          </motion.p>
        </div>

        <motion.div
          className="hostname-badge"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1, y: [0, -8, 0] }}
          transition={{
            opacity: { delay: 0.45, duration: 0.5 },
            scale: { delay: 0.45, duration: 0.5 },
            y: { delay: 1, duration: 6, repeat: Infinity, ease: 'easeInOut' },
          }}
        >
          {hostname}
        </motion.div>

        <motion.div
          className="hero-actions"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55, duration: 0.6 }}
        >
          <button className="primary-button" type="button" onClick={onPlayClick}>
            Play while you wait
            <ArrowDown size={16} />
          </button>
          <p className="hero-footnote">A deliberate blank page with one good distraction.</p>
        </motion.div>
      </motion.div>
    </section>
  )
}
