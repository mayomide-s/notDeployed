import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { AnimatedBackground } from './components/AnimatedBackground'
import { ChessGame } from './components/ChessGame'
import { Hero } from './components/Hero'

const HOSTNAME_FALLBACK = 'this domain'

export default function App() {
  const chessSectionRef = useRef<HTMLElement | null>(null)
  const [hostname, setHostname] = useState(HOSTNAME_FALLBACK)

  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.hostname) {
      setHostname(window.location.hostname)
    }
  }, [])

  const handleScrollToChess = () => {
    chessSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="app-shell">
      <AnimatedBackground />

      <main className="page-content">
        <Hero hostname={hostname} onPlayClick={handleScrollToChess} />

        <motion.section
          ref={chessSectionRef}
          className="chess-section shell-panel"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
        >
          <div className="section-heading">
            <span className="section-kicker">While you wait</span>
            <h2>Play a sharp little game.</h2>
            <p>
              A minimal side quest for a not-quite-live domain. White moves first, black answers
              instantly, and every capture gets a little ceremony.
            </p>
          </div>

          <ChessGame />
        </motion.section>
      </main>
    </div>
  )
}
