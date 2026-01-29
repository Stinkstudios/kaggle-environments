# Chess Visualizer (React + Zustand)

This is a test version of a visualizer that is built with `react` as the 
frontend framework, and `zustand` for state management. It also uses 
`react-chessboard`.

Before doing anything else, take a look here for general info on visualizers in 
this monorepo.

https://github.com/Stinkstudios/kaggle-environments/blob/logs-playground/VISUALIZER_README.md

This visualizer follows this description. It also follows the pattern shared 
code as the other OpenSpiel games.

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
Chess pops up. But it looks like the best match is the chess visualizer found 
in the `open_spiel_env` folder.

https://github.com/Kaggle/kaggle-environments/tree/chess-image/kaggle_environments/envs/open_spiel/games/chess/visualizer/default

It's a mostly self-contained web app that gets iframed into the Kaggle 
website. The web app creates a visualization of a game of chess played between 
two LLMs.

OpenSpiel is used to simulate the game of chess between the LLMs.

https://github.com/google-deepmind/open_spiel

One important component of how the app works is not included in the visualizer 
folder. Some shared code specific to chess lives in another part of the 
monorepo. This handles pre-processing raw OpenSpiel chess log files before they 
are used in the visualizer.

https://github.com/Kaggle/kaggle-environments/tree/master/web/core/src/transformers/chess

The preprocessing restructures data used by the visualizer and the seperate 
component in the page alongside it that shows the LLM reasoning for each move.

The transformer is run by functions that handle receiving the data when it's 
posted into the visualizer iframe from the containing paage, syncronising play 
state between the iframe LLM reasoning logs player and also rendering a set of 
simple playback controls when the player is running in dev mode.

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

Changing up the board starting position means the LLM can't rely on on just 
memorising and repeating historical games, many of which will use the standard 
chess starting position. It should better test the LLMs reasoning ability more, 
and rely less on it's access to the volume of historical games it has 
memorized.

This means we need to support arbitary board starting states, instead of the 
visualizer assuming the standard chess starting positions for each piece at the 
beginning of each game.

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

The FEN notation is useful not only because it's unambiguous, clearly 
defining the position of every piece on the board. It is also commonly used 
across the chess world including other chess projects, modules and libraries.

In our example in this folder, we're using the FEN position string to update 
`react-chessboard` directly. And libraries like `chess.js` also support FEN 
notation.

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

https://github.com/Stinkstudios/kaggle-environments/blob/4b907c7d684a5becac84803ac912ca3026bc2ba0/web/core/src/transformers/repeated_poker/v2/repeatedPokerTransformerV2.ts#L72C1-L73C1

And where the poker interesting events are hooked into the transformers:

https://github.com/Stinkstudios/kaggle-environments/blob/4b907c7d684a5becac84803ac912ca3026bc2ba0/web/core/src/transformers.ts#L138C1-L145C3

But just now, this function isn't being used anywhere in `kaggle-environments` 
so it's not clear how this turns into additional steps or other change to the 
episode data that drives the visualizer components.

Key moments and features in any chess game:

- Checkmate
- Check
- Resignation
- Draw
- Escape check
- Take piece
- Pawn promotion
- Castling
- Stalemate
- En Passant
- Double check
- Underpromotion
- Attempts at illegal moves
- Endgame
- Scarifice
- Fork
- Pin
- Skewer
- Discovered Attack
- Openings (Open, Semi-Open, Closed)
- Theoretical and Tactical Positions
- Common Positional Structures

Openings: Queens Gambit, Italian Game, Sicilian Defence, French Defence, 
Ruy-Lopez, Slav Defence, Caro-Kann Defence, Scotch Game, Kings Indian Defence, 
Nimzo-Indian Defence

https://www.365chess.com/chess-openings/

Tactical: Scholar's Mate, Reti Endgame, Opera Game Mate, Lucena Position, 
Philidor Position

Common Structures: Isolated Queen's Pawn, Bishops on c5 and b4, Double 
Fianchetto

AI chess moves have some unique features, coming from the ways that different 
types of chess AI work.

Different from both humans and chess specific AI like Stockfish and AlphaZero, 
LLMs predict the next move based on millions of previously seen games in PGN 
format.

https://en.wikipedia.org/wiki/Portable_Game_Notation

Chess specific AI easily outperforms human grandmasters (3500+ ELO). Strong LLM 
models can reach 1500–1800 ELO, equivalent to an advanced amateur, but fall 
short of master level.

Key moments in LLM AI chess games:

- Piece hallucinations in LLM thoughts
- Forgetting captured pieces
- Illegal moves
- Unconventional moves
- ???

## Relative strength of positions

It'd be great to show at a glance which position is strongest.

The most complete version of this would be to use a chess engine to fully 
calculate the strength of each position.

Easy to drop into a project. Large library and compute heavy. Even larger and 
with very slow performance if not targetting the more recent browsers and 
operating systems.

https://github.com/nmrugg/stockfish.js

A lighter and simpler way is to just evaluate the material strength of each 
position from the FEN, only needing chess.js to quickly access the metrics.

- Sum of the pieces on the board (pawn: 1 point, knight/bishop: 3 points, 
queen/: 9 points etc.)
- Positional factors
  - Piece-Square Tables (Pieces have different values based on their location 
  e.g., knights in the center are better than in the corner).
  - Pawn Structure (Penalize doubled, isolated, or backward pawns)
  - Mobility (Add points for the number of legal moves available to each side)
- Search Depth (searching several half-moves ahead to see which side has the 
advantage then)

But is this enough for the more chess savvy audience?
