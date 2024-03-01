// import { ChessGameStateFen, GameRecord } from "dstnd-io";
import { Engine, EngineChain, SearchOptions, SearchResult } from 'node-uci';

// const stockfish = new UCIEngine('/opt/homebrew/bin/stockfish');

// stockfish.init()

type ChessFen = string;

export type GameToAnalyze = {
  id: string;
  fen: string;
};

export type AnalyzerOpts = {
  searchOpts?: SearchOptions;
  searchInfiniteOpts?: SearchOptions;
  searchInfiniteWaitMs?: number;
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

  private opts: AnalyzerOpts = {
    searchOpts: { depth: 7, nodes: 2500 },
    searchInfiniteOpts: { depth: 3, nodes: 250 },
    searchInfiniteWaitMs: 5 * 1000,
  };

  constructor(private game: GameToAnalyze, opts: Partial<AnalyzerOpts> = {}) {
    this.opts = {
      ...this.opts,
      ...opts,
    };

    this.initiatedEngine = this.initiate(
      new Engine('/stockfish/stockfish'),
      // new Engine("/opt/homebrew/bin/stockfish"),
      game
    );
  }

  private async initiate(engine: Engine, game: GameToAnalyze) {
    await engine.init();
    await engine.setoption('UCI_AnalyseMode', 'true');
    await engine.setoption('MultiPV', '3');
    await engine.setoption('Hash', '50');
    await engine.isready();
    await engine.ucinewgame();
    await engine.position(game.fen);

    console.log('[Analyzer] Engine Initiated', {
      gameId: game.id,
      engineOpts: (engine as any).options,
      config: this.opts,
    });

    return engine;
  }

  private async setPositionCmd(fen: ChessFen) {
    if (this.hasQuit) {
      return;
    }

    const engine = await this.initiatedEngine;

    await engine.isready();
    await engine.position(fen);
  }

  async updateAndSearchOnce(fen: ChessFen) {
    await this.setPositionCmd(fen);
    const engine = await this.initiatedEngine;

    await engine.isready();

    return await engine.go(this.opts.searchOpts || {});
  }

  async updateAndSearchInfinite(fen: ChessFen, onFound: () => {}) {
    await this.setPositionCmd(fen);
    const engine = await this.initiatedEngine;

    await engine.isready();

    const emitter = engine.goInfinite(this.opts.searchInfiniteOpts || {});

    emitter.on('data', (a) => {
      // TODO: Test
      console.log('data', a);
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
