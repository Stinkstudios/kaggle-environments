import { createReplayVisualizer, LegacyAdapter } from '@kaggle-environments/core'
import { useEffect, useRef } from 'react'
import { create } from 'zustand'
import { Chess } from 'chess.js'
import { Chessboard } from 'react-chessboard'
import './App.css'

interface ChessStore {
  chess: Chess
  setState: (data: any) => void
}

const useChessStore = create<ChessStore>((set) => ({
  chess: new Chess(),

  setState: (data: any) => {
    const step = data.steps[data.step]
    const inactive = step.find((el:any) => el.status === "INACTIVE")
    
    if (inactive?.action.actionString) {
      const history = data.replay.info.stateHistory
      const index = history.indexOf(inactive.observation.observationString)
      
      const chess = new Chess(history[index - 1])
      chess.move(inactive.action.actionString)

      set({ chess })
    }
  },
}))

function App() {
  const { chess, setState } = useChessStore()
  const controlsRef = useRef(null)

  useEffect(() => {
    const app = controlsRef.current!
    const adapter = new LegacyAdapter(setState)

    createReplayVisualizer(app, adapter)
  }, [])

  return (
    <div className="container">
      <Chessboard options={{ position: chess.fen() }} />
      <div id="controls" ref={controlsRef} />
      <div id="moves">
        <b>{chess.history()[0]}</b> {chess.moves().join(" ")}
      </div>
    </div>
  )
}

export default App
