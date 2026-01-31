import { createReplayVisualizer, LegacyAdapter } from '@kaggle-environments/core'
import { useEffect, useRef } from 'react'
import { create } from 'zustand'
import { Chessboard } from 'react-chessboard'
import './App.css'

interface ChessStore {
  position: string,
  action: string,
  legalActions: string
  setState: (state: any) => void
}

const useChessStore = create<ChessStore>((set) => ({
  position: '',
  action: '',
  legalActions: '',
  setState: (state: any) => {
    const step = state.steps[state.step]

    const active = step.filter((item: any) => item.status === "ACTIVE")
    active.forEach((item: any) => {
      set({
        position: item.observation.observationString,
        legalActions: item.observation.legalActionStrings?.join(" "),
      })
    })

    const inactive = step.filter((item: any) => item.status === "INACTIVE")
    inactive.forEach((item: any) => {
      set({
        action: item.action.actionString,
      })
    })
  }
}))

function App() {
  const { position, action, legalActions, setState } = useChessStore()
  const controlsRef = useRef(null)

  useEffect(() => {
    const app = controlsRef.current!
    const adapter = new LegacyAdapter(setState)

    createReplayVisualizer(app, adapter)
  }, [])

  return (
    <div className="container">
      <Chessboard options={{ position }} />
      <div id="controls" ref={controlsRef} />
      <div><b>{action}</b> {legalActions}</div>
    </div>
  )
}

export default App
