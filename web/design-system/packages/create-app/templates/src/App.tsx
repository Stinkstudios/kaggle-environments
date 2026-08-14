import { GameAnnouncer, InfoPopup } from "@kaggle-environments/design-system-components";

/*
 * __GAME_TITLE__ — scaffolded by `gc-new-app`, wired to the "__LAYOUT__" layout
 * variant. This file is structure only; fill it in by following the Gamecraft
 * skills in order (skills/README.md):
 *   1. BRIEF.md              — complete every step before writing UI
 *   2. skills/layout.md      — layout is already picked; don't change the grid
 *   3. skills/component-selection.md — map each TODO below to a stock component
 *   4. skills/assets.md, game-behavior.md, animation.md, theming.md, audio.md
 */

export function __COMPONENT_NAME__() {
  return (
    <div className="gc-layout" data-layout="__LAYOUT__">
      <GameAnnouncer message="" />
      <div className="gc-grid">
        <div className="gc-slot-opponent">
          {/* TODO: <PlayerBadge> (+ hand/pieces) for the opponent. */}
        </div>

        <div className="gc-slot-board">
          {/* TODO: <BoardGrid> or table area. The play area only — nothing else goes here. */}
        </div>

        <div className="gc-slot-player">
          {/* TODO: <PlayerBadge> (+ hand/pieces) for "you". */}
        </div>

        <div className="gc-slot-hud flex flex-col items-start gap-3">
          {/* TODO: <TurnIndicator>, <ScoreValue> if shared (pot, round number). */}
          <InfoPopup>TODO: 1-2 sentence game explanation from BRIEF.md step 1.</InfoPopup>
        </div>

        <div className="gc-slot-controls flex gap-3">
          {/* TODO: <Button> row, 2-4 actions, exactly one variant="primary". */}
        </div>
      </div>
    </div>
  );
}
