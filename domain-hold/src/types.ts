export type PieceColor = 'w' | 'b'

export type CapturedPiece = {
  id: string
  color: PieceColor
  type: string
}

export type CaptureAnimation = {
  id: string
  symbol: string
  color: PieceColor
  start: {
    x: number
    y: number
  }
  end: {
    x: number
    y: number
  }
}
