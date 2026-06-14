import { motion } from 'framer-motion'

const blobs = [
  { className: 'blob blob-one', duration: 18, x: [0, 30, -10, 0], y: [0, -20, 20, 0] },
  { className: 'blob blob-two', duration: 24, x: [0, -40, 10, 0], y: [0, 30, -10, 0] },
  { className: 'blob blob-three', duration: 20, x: [0, 20, -25, 0], y: [0, -25, 15, 0] },
]

export function AnimatedBackground() {
  return (
    <div className="background-layer" aria-hidden="true">
      <div className="background-grid" />
      {blobs.map((blob) => (
        <motion.div
          key={blob.className}
          className={blob.className}
          animate={{ x: blob.x, y: blob.y, scale: [1, 1.08, 0.96, 1] }}
          transition={{ duration: blob.duration, repeat: Infinity, ease: 'easeInOut' }}
        />
      ))}
      <div className="background-glow" />
      <div className="background-noise" />
    </div>
  )
}
