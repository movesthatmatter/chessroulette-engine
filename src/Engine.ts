import { ChessGameStateFen, GameRecord } from "dstnd-io";
import { Engine, EngineChain, SearchOptions, SearchResult } from "node-uci";

// const stockfish = new UCIEngine('/opt/homebrew/bin/stockfish');

// stockfish.init()

export type GameToAnalyze = {
  id: GameRecord["id"];
  fen: ChessGameStateFen;
};

type Opts = {
  searchOpts: SearchOptions;
  searchInfiniteOpts: SearchOptions;
  searchInfiniteWaitMs: number;
};

// const transformSearchResult = (data: SearchResult) => {
//   return {
//     ...data,
//     strings: data.info.,
//     lines: data.info.slice(1),
//   }
// }

export class Analyzer {
  hasQuit = false;

  private initiatedEngine: Promise<Engine>;

  private opts: Opts = {
    searchOpts: { depth: 7, nodes: 2500 },
    searchInfiniteOpts: { depth: 3, nodes: 250 },
    searchInfiniteWaitMs: 5 * 1000,
  };

  constructor(private game: GameToAnalyze, opts: Partial<Opts> = {}) {
    this.opts = {
      ...this.opts,
      ...opts,
    };

    this.initiatedEngine = this.initiate(
      new Engine("/stockfish/stockfish"),
      game
    );
  }

  private async initiate(engine: Engine, game: GameToAnalyze) {
    await engine.init();
    await engine.setoption("UCI_AnalyseMode", "true");
    await engine.setoption("MultiPV", "4");
    await engine.isready();
    await engine.ucinewgame();

    console.log("[Analyzer] Engine Initiated", {
      gameId: this.game.id,
      opts: (engine as any).options,
    });

    return engine;
  }

  private async setPositionCmd(fen: ChessGameStateFen) {
    if (this.hasQuit) {
      return;
    }

    const engine = await this.initiatedEngine;

    await engine.isready();
    await engine.position(fen);
  }

  async updateAndSearchOnce(fen: ChessGameStateFen) {
    await this.setPositionCmd(fen);
    const engine = await this.initiatedEngine;

    await engine.isready();

    return await engine.go(this.opts.searchOpts);
  }

  async updateAndSearchInfinite(fen: ChessGameStateFen, onFound: () => {}) {
    await this.setPositionCmd(fen);
    const engine = await this.initiatedEngine;

    await engine.isready();

    const emitter = engine.goInfinite(this.opts.searchInfiniteOpts);

    emitter.on("data", (a) => {
      // TODO: Test
      console.log("data", a);
    });

    const bestMove = new Promise(async (resolve) => {
      setTimeout(async () => {
        const bestMove = await engine.stop();

        // TODO: Test

        // await engine.quit();

        resolve(bestMove);
      }, this.opts.searchInfiniteWaitMs);
    });

    // let bestMove: Promise<SearchResult>;
    // setTimeout(async () => {
    //   const localVestMove = engine.stop();
    // }, this.opts.searchInfiniteWaitMs);

    //   emitter.on('data', a => {
    //  *   console.log('data', a)
    //  * })
    //  * setTimeout(async () => {
    //  *   const bestmove = await engine.stop()
    //  *   console.log('bestmove', bestmove)
    //  *   await engine.quit()
    //  * }, 5000)
  }

  async quit() {
    const engine = await this.initiatedEngine;

    await engine.quit();

    this.hasQuit = true;
  }

  // onSearchInfinite()

  // private update(fen: ChessGameStateFen) {
  //   this.initiatedEngine = this.initiatedEngine.isready().position(fen);
  // }

  // start(fen: ChessGameStateFen) {}
}
