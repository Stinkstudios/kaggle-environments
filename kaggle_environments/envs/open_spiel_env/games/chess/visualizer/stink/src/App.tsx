import { createReplayVisualizer, LegacyAdapter } from '@kaggle-environments/core'
import { useEffect, useRef } from 'react'
import { create } from 'zustand'
import { Chessboard } from 'react-chessboard'
import './App.css'

interface ChessStore {
  position: string
  action: string
  legalActions: string
  setState: (data: any) => void
}

const useChessStore = create<ChessStore>((set) => ({
  position: '',
  legalActions: '',
  action: '',

  setState: (data: any) => {
    const step = data.steps[data.step]
    const active = step.find((el:any) => el.status === "ACTIVE")
    const inactive = step.find((el:any) => el.status === "INACTIVE")

    set({
      position: active.observation.observationString,
      legalActions: active.observation.legalActionStrings?.join(" "),
      action: inactive?.action.actionString,
    })
  },
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
      <div id="moves"><b>{action}</b> {legalActions}</div>
    </div>
  )
}

export default App
