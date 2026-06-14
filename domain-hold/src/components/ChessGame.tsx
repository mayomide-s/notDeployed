import { useEffect, useMemo, useRef, useState } from 'react'
import confetti from 'canvas-confetti'
import { AnimatePresence, motion } from 'framer-motion'
import { Chess } from 'chess.js'
import { Chessboard } from 'react-chessboard'
import { Crown, RefreshCcw, ShieldAlert, Swords } from 'lucide-react'
import type { Move, PieceSymbol, Square } from 'chess.js'
import type { CaptureAnimation, CapturedPiece, PieceColor } from '../types'

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] as const
const ANIMATION_MS = 850
const AI_SEARCH_DEPTH = 2
const CHECK_BONUS = 30
const CAPTURE_BONUS = 25
const PROMOTION_BONUS = 40
const CHECKMATE_SCORE = 1_000_000
const PIECE_VALUES: Record<PieceSymbol, number> = {
  p: 100,
  n: 320,
  b: 330,
  r: 500,
  q: 900,
  k: 20_000,
}

const PIECE_SYMBOLS: Record<`${PieceColor}${string}`, string> = {
  wp: '\u2659',
  wn: '\u2658',
  wb: '\u2657',
  wr: '\u2656',
  wq: '\u2655',
  wk: '\u2654',
  bp: '\u265F',
  bn: '\u265E',
  bb: '\u265D',
  br: '\u265C',
  bq: '\u265B',
  bk: '\u265A',
}

function getSquareCenter(square: Square, boardRect: DOMRect) {
  const file = FILES.indexOf(square[0] as (typeof FILES)[number])
  const rank = Number(square[1])
  const size = boardRect.width / 8

  return {
    x: boardRect.left + (file + 0.5) * size,
    y: boardRect.top + (8 - rank + 0.5) * size,
  }
}

function getCenterPoint(element: HTMLElement) {
  const rect = element.getBoundingClientRect()

  return {
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2,
  }
}

function getCapturedSquare(move: Move): Square {
  if (move.isEnPassant()) {
    return `${move.to[0]}${move.from[1]}` as Square
  }

  return move.to
}

function evaluatePosition(game: Chess) {
  if (game.isCheckmate()) {
    return game.turn() === 'w' ? CHECKMATE_SCORE : -CHECKMATE_SCORE
  }

  if (game.isDraw()) {
    return 0
  }

  let score = 0

  for (const row of game.board()) {
    for (const piece of row) {
      if (!piece) continue
      const value = PIECE_VALUES[piece.type]
      score += piece.color === 'b' ? value : -value
    }
  }

  if (game.inCheck()) {
    score += game.turn() === 'w' ? CHECK_BONUS : -CHECK_BONUS
  }

  return score
}

function scoreMoveHeuristic(game: Chess, move: Move) {
  let score = 0

  if (move.isCapture()) {
    score += CAPTURE_BONUS + (move.captured ? PIECE_VALUES[move.captured] / 10 : 0)
  }

  if (move.isPromotion()) {
    score += PROMOTION_BONUS
  }

  const next = new Chess(game.fen())
  next.move(move)
  if (next.inCheck()) {
    score += CHECK_BONUS
  }

  return score
}

function getOrderedMoves(game: Chess) {
  const moves = game.moves({ verbose: true })
  return moves.sort((left, right) => scoreMoveHeuristic(game, right) - scoreMoveHeuristic(game, left))
}

function minimax(game: Chess, depth: number, alpha: number, beta: number, maximizingBlack: boolean): number {
  if (depth === 0 || game.isGameOver()) {
    return evaluatePosition(game)
  }

  const moves = getOrderedMoves(game)

  if (maximizingBlack) {
    let bestScore = -Infinity

    for (const move of moves) {
      const next = new Chess(game.fen())
      next.move(move)
      const score = minimax(next, depth - 1, alpha, beta, false)
      bestScore = Math.max(bestScore, score)
      alpha = Math.max(alpha, bestScore)
      if (beta <= alpha) break
    }

    return bestScore
  }

  let bestScore = Infinity

  for (const move of moves) {
    const next = new Chess(game.fen())
    next.move(move)
    const score = minimax(next, depth - 1, alpha, beta, true)
    bestScore = Math.min(bestScore, score)
    beta = Math.min(beta, bestScore)
    if (beta <= alpha) break
  }

  return bestScore
}

function chooseComputerMove(game: Chess) {
  const moves = getOrderedMoves(game)
  if (!moves.length) {
    return null
  }

  let bestMove = moves[0]
  let bestScore = -Infinity

  for (const move of moves) {
    const next = new Chess(game.fen())
    next.move(move)

    let score = minimax(next, AI_SEARCH_DEPTH - 1, -Infinity, Infinity, false)
    if (move.isCapture()) score += CAPTURE_BONUS
    if (move.isPromotion()) score += PROMOTION_BONUS

    if (score > bestScore) {
      bestScore = score
      bestMove = move
    }
  }

  return bestMove
}

function getStatusText(game: Chess, botThinking: boolean) {
  if (game.isCheckmate()) {
    return `${game.turn() === 'w' ? 'Black' : 'White'} wins by checkmate`
  }
  if (game.isDraw()) {
    return 'Draw game'
  }
  if (botThinking) {
    return 'Black is thinking'
  }
  if (game.inCheck()) {
    return `${game.turn() === 'w' ? 'White' : 'Black'} is in check`
  }
  return `${game.turn() === 'w' ? 'White' : 'Black'} to move`
}

export function ChessGame() {
  const boardMeasureRef = useRef<HTMLDivElement | null>(null)
  const boardShellRef = useRef<HTMLDivElement | null>(null)
  const whitePanelRef = useRef<HTMLDivElement | null>(null)
  const blackPanelRef = useRef<HTMLDivElement | null>(null)
  const clearFlashRef = useRef<number | null>(null)
  const aiTimeoutRef = useRef<number | null>(null)

  const [game, setGame] = useState(() => new Chess())
  const [capturedWhite, setCapturedWhite] = useState<CapturedPiece[]>([])
  const [capturedBlack, setCapturedBlack] = useState<CapturedPiece[]>([])
  const [flashSquare, setFlashSquare] = useState<string | null>(null)
  const [captureAnimation, setCaptureAnimation] = useState<CaptureAnimation | null>(null)
  const [botThinking, setBotThinking] = useState(false)
  const [boardWidth, setBoardWidth] = useState(() => {
    if (typeof window === 'undefined') return 320
    return Math.floor(Math.min(window.innerWidth * 0.92, 560))
  })

  useEffect(() => {
    if (!boardMeasureRef.current) {
      return
    }

    const updateBoardWidth = () => {
      if (!boardMeasureRef.current) return
      const containerWidth = boardMeasureRef.current.clientWidth
      const viewportCap = typeof window !== 'undefined' ? window.innerWidth * 0.92 : 560
      const nextWidth = Math.max(0, Math.floor(Math.min(containerWidth, viewportCap, 560)))
      if (nextWidth > 0) {
        setBoardWidth(nextWidth)
      }
    }

    updateBoardWidth()

    let resizeObserver: ResizeObserver | null = null
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => updateBoardWidth())
      resizeObserver.observe(boardMeasureRef.current)
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('resize', updateBoardWidth)
    }

    return () => {
      resizeObserver?.disconnect()
      if (typeof window !== 'undefined') {
        window.removeEventListener('resize', updateBoardWidth)
      }
    }
  }, [])

  useEffect(() => {
    return () => {
      if (clearFlashRef.current) {
        window.clearTimeout(clearFlashRef.current)
      }
      if (aiTimeoutRef.current) {
        window.clearTimeout(aiTimeoutRef.current)
      }
    }
  }, [])

  const isGameOver = game.isGameOver()
  const statusText = getStatusText(game, botThinking)

  const squareStyles = useMemo(() => {
    if (!flashSquare) {
      return {}
    }

    return {
      [flashSquare]: {
        boxShadow: 'inset 0 0 0 2px rgba(255,255,255,0.55), 0 0 22px rgba(124, 58, 237, 0.95)',
        background:
          'radial-gradient(circle at center, rgba(124,58,237,0.88), rgba(236,72,153,0.62) 50%, rgba(15,23,42,0.2) 100%)',
      },
    }
  }, [flashSquare])

  const runCaptureEffects = (move: Move, nextGame: Chess) => {
    if (!move.isCapture() || !move.captured || !boardShellRef.current) {
      setGame(nextGame)
      return
    }

    const capturedColor: PieceColor = move.color === 'w' ? 'b' : 'w'
    const capturedSquare = getCapturedSquare(move)
    const piece: CapturedPiece = {
      id: `${move.san}-${capturedColor}${move.captured}-${Date.now()}`,
      color: capturedColor,
      type: move.captured,
    }

    setFlashSquare(move.to)
    if (clearFlashRef.current) {
      window.clearTimeout(clearFlashRef.current)
    }
    clearFlashRef.current = window.setTimeout(() => setFlashSquare(null), 520)

    if (typeof window !== 'undefined') {
      const boardRect = boardShellRef.current.getBoundingClientRect()
      const start = getSquareCenter(capturedSquare, boardRect)
      const targetPanel = capturedColor === 'w' ? whitePanelRef.current : blackPanelRef.current
      const end = targetPanel ? getCenterPoint(targetPanel) : start

      setCaptureAnimation({
        id: piece.id,
        symbol: PIECE_SYMBOLS[`${piece.color}${piece.type}`],
        color: piece.color,
        start,
        end,
      })

      confetti({
        particleCount: 28,
        spread: 55,
        startVelocity: 22,
        ticks: 110,
        gravity: 1.1,
        origin: {
          x: start.x / window.innerWidth,
          y: start.y / window.innerHeight,
        },
        colors: ['#8b5cf6', '#38bdf8', '#f472b6', '#f8fafc'],
        scalar: 0.8,
      })

      window.setTimeout(() => setCaptureAnimation(null), ANIMATION_MS)
    }

    if (capturedColor === 'w') {
      setCapturedWhite((current) => [...current, piece])
    } else {
      setCapturedBlack((current) => [...current, piece])
    }

    setGame(nextGame)
  }

  const applyMove = (move: Move | null, nextGame: Chess) => {
    if (!move) {
      return false
    }

    runCaptureEffects(move, nextGame)
    return true
  }

  const handlePieceDrop = ({
    sourceSquare,
    targetSquare,
  }: {
    sourceSquare: string
    targetSquare: string | null
  }) => {
    if (!targetSquare || game.turn() !== 'w' || isGameOver || botThinking) {
      return false
    }

    const nextGame = new Chess(game.fen())
    try {
      const move = nextGame.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: 'q',
      })

      return applyMove(move, nextGame)
    } catch {
      return false
    }
  }

  useEffect(() => {
    if (game.turn() !== 'b' || game.isGameOver()) {
      setBotThinking(false)
      return
    }

    setBotThinking(true)
    const thinkDelay = 300 + Math.floor(Math.random() * 301)

    aiTimeoutRef.current = window.setTimeout(() => {
      const nextGame = new Chess(game.fen())
      const move = chooseComputerMove(nextGame)
      if (!move) {
        setBotThinking(false)
        return
      }
      nextGame.move(move)
      applyMove(move, nextGame)
      setBotThinking(false)
    }, thinkDelay)

    return () => {
      if (aiTimeoutRef.current) {
        window.clearTimeout(aiTimeoutRef.current)
      }
    }
  }, [game])

  const resetGame = () => {
    if (aiTimeoutRef.current) {
      window.clearTimeout(aiTimeoutRef.current)
    }
    setGame(new Chess())
    setCapturedWhite([])
    setCapturedBlack([])
    setFlashSquare(null)
    setCaptureAnimation(null)
    setBotThinking(false)
  }

  const outcome = game.isCheckmate()
    ? `${game.turn() === 'w' ? 'Black' : 'White'} wins`
    : game.isDraw()
      ? 'Draw'
      : null

  return (
    <div className="chess-layout">
      <div className="chess-main">
        <div className="game-meta">
          <div>
            <span className="section-kicker">Client-side game</span>
            <h3>Reserved, but not boring.</h3>
          </div>

          <button className="ghost-button" type="button" onClick={resetGame}>
            <RefreshCcw size={16} />
            Reset game
          </button>
        </div>

        <div className="status-row">
          <div className="status-card">
            <Swords size={16} />
            <span>{statusText}</span>
          </div>
          {game.inCheck() && !game.isGameOver() ? (
            <div className="status-card warning">
              <ShieldAlert size={16} />
              <span>Check is on the board</span>
            </div>
          ) : null}
        </div>

        <div className="board-and-captures">
          <aside ref={blackPanelRef} className="capture-panel capture-panel--black">
            <span className="capture-label">Black losses</span>
            <div className="capture-grid">
              <AnimatePresence>
                {capturedBlack.map((piece) => (
                  <motion.span
                    key={piece.id}
                    className="captured-piece"
                    initial={{ opacity: 0, y: -14, scale: 0.8 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.28 }}
                  >
                    {PIECE_SYMBOLS[`${piece.color}${piece.type}`]}
                  </motion.span>
                ))}
              </AnimatePresence>
            </div>
          </aside>

          <div ref={boardMeasureRef} className="board-stage">
            <div ref={boardShellRef} className="board-shell" style={{ width: `${boardWidth}px` }}>
              <Chessboard
                options={{
                  id: 'domain-hold-board',
                  position: game.fen(),
                  boardOrientation: 'white',
                  onPieceDrop: handlePieceDrop,
                  allowDragging: game.turn() === 'w' && !isGameOver && !botThinking,
                  showNotation: true,
                  animationDurationInMs: 220,
                  boardStyle: {
                    width: `${boardWidth}px`,
                    maxWidth: '100%',
                    borderRadius: '24px',
                    boxShadow: '0 22px 80px rgba(2, 6, 23, 0.55)',
                  },
                  darkSquareStyle: { backgroundColor: '#4c1d95' },
                  lightSquareStyle: { backgroundColor: '#ddd6fe' },
                  squareStyles,
                }}
              />

              <AnimatePresence>
                {captureAnimation ? (
                  <motion.div
                    key={captureAnimation.id}
                    className={`capture-flyout ${captureAnimation.color === 'w' ? 'light' : 'dark'}`}
                    initial={{
                      opacity: 0.95,
                      x: captureAnimation.start.x,
                      y: captureAnimation.start.y,
                      scale: 1,
                    }}
                    animate={{
                      opacity: [1, 1, 0.15],
                      x: captureAnimation.end.x,
                      y: captureAnimation.end.y,
                      scale: [1, 1.05, 0.6],
                    }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: ANIMATION_MS / 1000, ease: 'easeInOut' }}
                  >
                    {captureAnimation.symbol}
                  </motion.div>
                ) : null}
              </AnimatePresence>

              <AnimatePresence>
                {outcome ? (
                  <motion.div
                    className="game-overlay"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <motion.div
                      className="game-overlay-card"
                      initial={{ scale: 0.9, y: 10 }}
                      animate={{ scale: 1, y: 0 }}
                      transition={{ duration: 0.35 }}
                    >
                      <Crown size={20} />
                      <strong>{outcome}</strong>
                      <span>{game.isCheckmate() ? 'Clean finish.' : 'No legal way through.'}</span>
                    </motion.div>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>
          </div>

          <aside ref={whitePanelRef} className="capture-panel capture-panel--white">
            <span className="capture-label">White losses</span>
            <div className="capture-grid">
              <AnimatePresence>
                {capturedWhite.map((piece) => (
                  <motion.span
                    key={piece.id}
                    className="captured-piece"
                    initial={{ opacity: 0, y: -14, scale: 0.8 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.28 }}
                  >
                    {PIECE_SYMBOLS[`${piece.color}${piece.type}`]}
                  </motion.span>
                ))}
              </AnimatePresence>
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}
