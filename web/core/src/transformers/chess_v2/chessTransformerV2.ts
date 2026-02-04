import { BaseGameStep } from '../../types';

export interface ChessReplayStep {
  action?: {
    actionString?: string;
    generate_returns?: string[];
    status?: string;
    submission: number;
    thoughts?: string;
  };
  info?: {
    actionApplied?: number;
    actionSubmitted?: number;
    actionSubmittedToString?: string;
    agentSelfReportedStatus?: string;
    timeTaken?: number;
  };
  observation: {
    currentPlayer: number;
    isTerminal: boolean;
    legalActionStrings: string[];
    legalActions: number[];
    observationString: string;
    playerId: number;
    remainingOverageTime: number;
    serializedGameAndState: string;
    step: number;
  };
  reward: number | null;
  status: 'ACTIVE' | 'INACTIVE' | 'DONE';
}

export interface ChessReplay extends BaseGameStep {
  configuration: {
    actTimeout: number;
    episodeSteps: number;
    metadata: Record<string, any>;
    openSpielGameName: string;
    openSpielGameParameters: {
      chess960: boolean;
    };
    openSpielGameString: string;
    runTimeout: number;
    seed: number;
  };
  description: string;
  id: string;
  info: {
    EpisodeId: number;
    LiveVideoPath: string | null;
    TeamNames: string[];
    actionHistory: string[];
    stateHistory?: string[];
  };
  steps: Array<ChessReplayStep[]>;
}

export interface ChessGameStep extends BaseGameStep {
  entries: ChessReplayStep[];
}

export const chessTransformerV2 = (environment: any) => {
  const chessReplay = environment as ChessReplay;
  const chessSteps: ChessGameStep[] = [];

  for (const [index, step] of chessReplay.steps.entries()) {
    chessSteps.push({
      step: index,
      players: [],
      entries: step,
    })
  }

  return chessSteps;
};
