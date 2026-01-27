import { createReplayVisualizer, LegacyAdapter, processEpisodeData } from '@kaggle-environments/core';
import { useEffect, useRef } from 'react';
import { create } from 'zustand'
import { Chessboard } from 'react-chessboard'
import './App.css'

interface ChessStore {
  position: string
  setPosition: (options: any) => void
}

const useChessStore = create<ChessStore>((set) => ({
  position: '',
  setPosition: (options: any) => {
    set({
      position: options.steps[options.step]
        .find((el: any) => el.status === "ACTIVE")
        .observation
        .observationString
    });
  }
}));

function App() {
  const { position, setPosition } = useChessStore()
  const controlsRef = useRef(null);

  useEffect(() => {
    const app = controlsRef.current!;
    const adapter = new LegacyAdapter(setPosition);

    createReplayVisualizer(app, adapter, {
      transformer: (replay: any) => processEpisodeData(replay, 'no_transformer'),
    });
  }, []);

  return (
    <div className="container">
      <Chessboard options={{ position }} />
      <div id="controls" ref={controlsRef} />
    </div>
  )
}

export default App
