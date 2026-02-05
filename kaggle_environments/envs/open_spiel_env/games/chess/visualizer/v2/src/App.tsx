import { useEffect, useRef } from 'react';
import { create } from 'zustand';
import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard';
import {
  createReplayVisualizer,
  processEpisodeData,
  LegacyAdapter,
  LegacyRendererOptions,
  ReplayData,
  ChessStep,
  ChessPlayer,
} from '@kaggle-environments/core';
import './App.css';

interface ChessStore {
  chess: Chess;
  setState: (data: LegacyRendererOptions<ChessStep[]>) => void;
}

const useChessStore = create<ChessStore>((set) => ({
  chess: new Chess(),

  setState: (data: LegacyRendererOptions<ChessStep[]>) => {
    const step = data.steps.at(data.step)!;
    const move = step.players.find((element: ChessPlayer) => element.isTurn);

    if (move) {
      const history = data.replay.info!.stateHistory;
      const chess = new Chess(history.at(data.step));
      chess.move(move.actionDisplayText!);

      set({ chess });
    }
  },
}));

function App() {
  const { chess, setState } = useChessStore();
  const controlsRef = useRef(null);

  useEffect(() => {
    const app = controlsRef.current!;
    const adapter = new LegacyAdapter<ChessStep[]>(setState);
    const transformer = (replay: ReplayData) => processEpisodeData(replay, 'open_spiel_chess');

    createReplayVisualizer(app, adapter, { transformer });
  }, [setState]);

  return (
    <div className="container">
      <Chessboard options={{ position: chess.fen() }} />
      <div id="controls" ref={controlsRef} />
      <div id="moves">
        <b>{chess.history()[0]}</b> {chess.moves().join(' ')}
      </div>
    </div>
  );
}

export default App;
