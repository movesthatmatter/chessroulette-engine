import bodyParser from "body-parser";
import { GameRecord } from "dstnd-io";
import express, { Application, Request, Response } from "express";
import { Engine } from "node-uci";
import { Analyzer, GameToAnalyze } from "./src/Engine";

const app: Application = express();
const port = 5454;

// Body parsing Middleware
// app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(bodyParser.json());

const analyzersByGameId: Record<GameRecord["id"], Analyzer> = {};

const getExistentAnalyzerOrCreateNew = (game: GameToAnalyze) => {
  const { [game.id]: engine } = analyzersByGameId;

  if (engine && !engine.hasQuit) {
    return engine;
  }

  analyzersByGameId[game.id] = new Analyzer(game, {
    searchOpts: { depth: 10, nodes: 25000 },
  });

  return analyzersByGameId[game.id];
};

app.get("/", async (req, res) => {
  const fen = "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1";
  const engine = getExistentAnalyzerOrCreateNew({ id: "test", fen });

  const engineRes = await engine.updateAndSearchOnce(fen);

  return res.status(200).send({
    ok: true,
    engineRes,
  });
});

app.post("/analyze", async (req: Request, res: Response) => {
  try {
    const { gameId, fen } = req.body;

    if (!(gameId && fen)) {
      throw new Error("Body not good");
    }

    const engine = getExistentAnalyzerOrCreateNew({ id: gameId, fen });

    const engineRes = await engine.updateAndSearchOnce(fen);

    // console.log("engine res", engineRes);

    return res.status(200).send({
      // message: "ok",
      // works: 'good',
      // ...req.body,
      ...engineRes,
    });
  } catch (e) {
    console.error("Stockfish errror", e);
    return res.status(500).send({
      error: e,
    });
  }
});

try {
  app.listen(port, () => {
    console.log(`Connected successfully on port ${port}`);
  });
} catch (error) {
  console.error(`Error occured`, error);
}
