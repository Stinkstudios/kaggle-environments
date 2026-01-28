# Chess Visualizer (React + Zustand)

This is a test version of a visualizer that is built with `react` as the 
frontend framework, and `zustand` for state management. It also uses 
`react-chessboard`.

Before anything else, take a look here for general info on visualizers in 
this monorepo.

https://github.com/Stinkstudios/kaggle-environments/blob/logs-playground/VISUALIZER_README.md

This visualizer follows this description, and also follows a general pattern 
and uses the same shared code as other OpenSpiel games.

https://github.com/Stinkstudios/kaggle-environments/tree/logs-playground/kaggle_environments/envs/open_spiel_env

## Quick Start

Install requirements.

`pnpm install`

Run for dev using a local data file for the chess match.

`pnpm dev-with-replay`

You can also build a deployable version that uses the data file for sharing and
internal review.

`pnpm build-with-replay`

## Notes about the visualizer

Here's an example of the Chess visualizer on the Kaggle website.

Kaggle.com > Benchmarks > Game Arena > Chess Text Input > Replay

https://www.kaggle.com/benchmarks/kaggle/chess-text/versions/1?episodeId=72903677

Searching the `kaggle-environments` repo there are few different places where 
Chess pops up. But it looks like the best match is one of the visualizer code 
in the `open_spiel_env` folder.

https://github.com/Kaggle/kaggle-environments/tree/chess-image/kaggle_environments/envs/open_spiel/games/chess/visualizer/default

This is a mostly self-contained web app that gets iframed into the Kaggle 
website. The web app creates a visualization of a game of chess played between 
two LLMs.

OpenSpiel is used to simulate the game of chess between the LLMs.

https://github.com/google-deepmind/open_spiel

One important part of the way the app works that is not included in the 
visualizer folder. Some shared code that is specific to the chess game lives in 
another part of the monorepo handles pre-processing raw OpenSpiel log files 
before they are used in the visualizer.

https://github.com/Kaggle/kaggle-environments/tree/master/web/core/src/transformers/chess

The preprocessing restructures the visualizer and a seperate component 
in the page alongside it that shows the LLM reasoning at each step.

The transformer function run by functions that are shared to many of the 
different game visualizers. These functions handle receiving the data when it's 
posted into the visualizer iframe, syncronising play state between the iframe 
LLM reasoning logs player and also a set of simple playback controls when the 
player is running in dev mode.

https://github.com/Kaggle/kaggle-environments/blob/master/web/core/src/replay-visualizer-factory.ts
https://github.com/Kaggle/kaggle-environments/blob/master/web/core/src/player.ts

Conveniently this all gets added in at a [single place](https://github.com/Kaggle/kaggle-environments/blob/d2c07edf42f19ca8c8547294161489fbc8444acc/kaggle_environments/envs/chess/visualizer/default/src/main.ts#L10-L12) in the OpenSpiel chess 
visualizer code.

https://github.com/Kaggle/kaggle-environments/blob/master/kaggle_environments/envs/chess/visualizer/default/src/main.ts
 
## Notes about the chess logs

It looks the OpenSpiel is simulating Chess960.

Chess960, or Fischer Random Chess, is a chess variant introduced by Bobby 
Fischer in 1996 designed to eliminate the advantage of memorized opening 
theory. It randomizes the starting positions of the back-rank pieces while 
retaining standard rules, resulting in 960 distinct possible setups. 

https://www.houseofstaunton.com/blogs/chess-variants/chess960-a-guide

Makes sense, as changing up the board starting position means the LLM can't 
rely on on just memorising and repeating historical games, many of which will 
use the standard chess starting position. Instead it should better test the 
LLMs reasoning ability more than it's access to a volume of games in memory.

Importantly for us, it means we need to support arbitary board starting states, 
instead of the visualizer assuming the standard chess starting positions for 
each piece.

The raw OpenSpiel logs include board state and move information in FEN 
(Forsyth-Edwards Notation) - the standard format for representing chess 
positions.

https://www.chess.com/terms/fen-chess

This unambiguously describes the positions of all pieces on the chessboard.

eg. `r1bqk2r/5p1p/p1n3p1/1p1Qp3/1b6/2N1N3/PPP2PPP/R1B1KB1R b KQkq - 0 12`

Breaking down this example...

Board state: `r1bqk2r/5p1p/p1n3p1/1p1Qp3/1b6/2N1N3/PPP2PPP/R1B1KB1R`

- 8 rank sections separated by `/` (top to bottom)
- Pieces: uppercase = White, lowercase = Black
- Numbers: empty squares (5 = 5 empty squares)
- Example: r1bqk2r = rook, empty, bishop, queen, king, 2 empty, rook

Active color: `b`

- b = Black's turn
- w = White's turn

Castling rights: `KQkq`

https://www.chess.com/terms/castling-chess

- K: White can castle kingside
- Q: White can castle queenside
- k: Black can castle kingside
- q: Black can castle queenside

En passant target: `-` 

https://www.chess.com/terms/en-passant

- The square where en passant capture is possible, or - if none

Halfmove clock: `0` 

https://www.chessprogramming.org/Halfmove_Clock

- Moves since last capture/pawn move (for 50-move rule)

Fullmove number: `12`

- The move count

The FEN notation is useful as it's not only unambiguous, clearly defining the 
position of every piece on the board. But it's also commonly used across other 
chess projects, modules and libraries.

In our example in this folder, we're using the FEN position string to update 
the `react-chessboard` component directly. And libraries like `chess.js` 
support using FEN notation too.

https://github.com/jhlywa/chess.js


## Notes on interesting moves/moments

Watch this video.

https://www.youtube.com/watch?v=vtHfJ6iYyEY

Kaggle have been enhancing how the reasoning logs and game visualizations are 
displayed by highlighting interesting, important and novel moments.

They described adding extra game steps and adapting animation timings to 
bring focus to these features of the match.

Reasoning logs playback timing:

https://github.com/Stinkstudios/kaggle-environments/blob/logs-playground/web/core/src/timing.ts

Example of adjusting timings in the poker visualizer:

https://github.com/Stinkstudios/kaggle-environments/blob/4b907c7d684a5becac84803ac912ca3026bc2ba0/web/core/src/transformers/repeated_poker/v2/repeatedPokerTransformerV2.ts#L42C1-L42C40

Although this is defined in the transformer, it actually gets used in the 
dev mode player (and maybe the full production reasoning logs player too):

https://github.com/Stinkstudios/kaggle-environments/blob/4b907c7d684a5becac84803ac912ca3026bc2ba0/web/core/src/transformers.ts#L121C7-L121C95

https://github.com/Stinkstudios/kaggle-environments/blob/4b907c7d684a5becac84803ac912ca3026bc2ba0/web/core/src/player.ts#L532C1-L533C1

Example of finding interesting events in the poker visualizer:

https://github.com/Stinkstudios/kaggle-environments/blob/4b907c7d684a5becac84803ac912ca3026bc2ba0/web/core/src/transformers/repeated_poker/v2/repeatedPokerTransformerV2.ts#L72

And where the poker interesting events are hooked into the transformers:

https://github.com/Stinkstudios/kaggle-environments/blob/4b907c7d684a5becac84803ac912ca3026bc2ba0/web/core/src/transformers.ts#L138C1-L145C3

But just now, this function isn't being used anywhere in `kaggle-environments` 
so it's not clear how this turns into additional steps or other change to the 
episode data that drives the visualizer components.
