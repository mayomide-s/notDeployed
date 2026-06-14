import { useEffect, useMemo, useRef, useState } from 'react'
import confetti from 'canvas-confetti'
import { AnimatePresence, motion } from 'framer-motion'
import { Chess } from 'chess.js'
import { Chessboard } from 'react-chessboard'
import { Crown, RefreshCcw, ShieldAlert, Swords } from 'lucide-react'
import type { CaptureAnimation, CapturedPiece, PieceColor } from '../types'
import type { Square } from 'chess.js'

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] as const
const ANIMATION_MS = 850

const PIECE_SYMBOLS: Record<`${PieceColor}${string}`, string> = {
  wp: '♙',
  wn: '♘',
  wb: '♗',
  wr: '♖',
  wq: '♕',
  wk: '♔',
  bp: '♟',
  bn: '♞',
  bb: '♝',
  br: '♜',
  bq: '♛',
  bk: '♚',
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

function chooseComputerMove(game: Chess) {
  const moves = game.moves({ verbose: true })
  if (!moves.length) {
    return null
  }

  const scoredMoves = moves.map((move) => {
    const next = new Chess(game.fen())
    next.move(move)

    let score = Math.random()
    if (move.captured) score += 20
    if (next.inCheck()) score += 12
    if (move.promotion) score += 8
    if (['e4', 'd4', 'e5', 'd5'].includes(move.to)) score += 2

    return { move, score }
  })

  scoredMoves.sort((left, right) => right.score - left.score)
  return scoredMoves[0].move
}

function getStatusText(game: Chess) {
  if (game.isCheckmate()) {
    return `${game.turn() === 'w' ? 'Black' : 'White'} wins by checkmate`
  }
  if (game.isDraw()) {
    return 'Draw game'
  }
  if (game.inCheck()) {
    return `${game.turn() === 'w' ? 'White' : 'Black'} is in check`
  }
  return `${game.turn() === 'w' ? 'White' : 'Black'} to move`
}

export function ChessGame() {
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
  const statusText = getStatusText(game)

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

  const runCaptureEffects = (
    move: { from: Square; to: Square; captured?: string; color: PieceColor; san: string },
    nextGame: Chess,
  ) => {
    if (!move.captured || !boardShellRef.current) {
      return
    }

    const capturedColor: PieceColor = move.color === 'w' ? 'b' : 'w'
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
      const start = getSquareCenter(move.to, boardRect)
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

  const completeMove = (
    nextGame: Chess,
    move: { from: Square; to: Square; captured?: string; color: PieceColor; san: string } | null,
  ) => {
    if (!move) {
      return false
    }

    if (move.captured) {
      runCaptureEffects(move, nextGame)
    } else {
      setGame(nextGame)
    }
    return true
  }

  const handlePieceDrop = ({
    sourceSquare,
    targetSquare,
  }: {
    sourceSquare: string
    targetSquare: string | null
  }) => {
    if (!targetSquare || game.turn() !== 'w' || isGameOver) {
      return false
    }

    const nextGame = new Chess(game.fen())
    const move = nextGame.move({
      from: sourceSquare as Square,
      to: targetSquare as Square,
      promotion: 'q',
    })

    return completeMove(nextGame, move as never)
  }

  useEffect(() => {
    if (game.turn() !== 'b' || game.isGameOver()) {
      return
    }

    aiTimeoutRef.current = window.setTimeout(() => {
      const nextGame = new Chess(game.fen())
      const move = chooseComputerMove(nextGame)
      if (!move) {
        return
      }
      nextGame.move(move)
      completeMove(nextGame, move as never)
    }, 520)

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
          <aside ref={blackPanelRef} className="capture-panel">
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

          <div ref={boardShellRef} className="board-shell">
            <Chessboard
              options={{
                id: 'domain-hold-board',
                position: game.fen(),
                boardOrientation: 'white',
                onPieceDrop: handlePieceDrop,
                allowDragging: game.turn() === 'w' && !isGameOver,
                showNotation: true,
                animationDurationInMs: 220,
                boardStyle: {
                  width: '100%',
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

          <aside ref={whitePanelRef} className="capture-panel">
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
