import bodyParser from "body-parser";
import { GameRecord } from "dstnd-io";
import express, { Application, Request, Response } from "express";
import { SearchOptions } from "node-uci";
import { Analyzer, AnalyzerOpts, GameToAnalyze } from "./src/Engine";

const app: Application = express();
const port = 5454;

// Body parsing Middleware
// app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(bodyParser.json());

const analyzersByGameId: Record<GameRecord["id"], Analyzer> = {};

const getExistentAnalyzerByGameId = (gameId: GameToAnalyze["id"]) => {
  const { [gameId]: engine } = analyzersByGameId;

  return engine;
};

const getExistentAnalyzerOrCreateNew = (
  game: GameToAnalyze,
  opts?: AnalyzerOpts
) => {
  const { [game.id]: engine } = analyzersByGameId;

  if (engine && !engine.hasQuit) {
    return engine;
  }

  analyzersByGameId[game.id] = new Analyzer(game, {
    ...{ searchOpts: { depth: 25, nodes: 25 * 10000 } },
    ...opts,
  });

  return analyzersByGameId[game.id];
};

app.get("/", async (req, res) => {
  const fen = "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1";
  const engine = getExistentAnalyzerOrCreateNew({ id: "test", fen });

  const engineRes = await engine.updateAndSearchOnce(fen);

  await engine.quit();

  return res.status(200).send({
    ok: true,
    engineRes,
  });
});

app.post("/analyze", async (req: Request, res: Response) => {
  try {
    const { gameId, fen, searchOpts } = req.body;

    if (!(gameId && fen)) {
      throw new Error("Body not good");
    }

    const engine = getExistentAnalyzerOrCreateNew(
      { id: gameId, fen },
      typeof searchOpts === "object"
        ? { searchOpts: searchOpts as SearchOptions }
        : {}
    );
    const engineRes = await engine.updateAndSearchOnce(fen);

    return res.status(200).send(engineRes);
  } catch (e) {
    console.error("Engine errror", e);
    return res.status(500).send({
      error: e,
    });
  }
});

app.post("/quit", async (req: Request, res: Response) => {
  try {
    const { gameId } = req.body;

    if (!gameId) {
      throw new Error("Body not good");
    }

    const engine = getExistentAnalyzerByGameId(gameId);

    if (!engine) {
      return res.status(200).send({ message: "Engine Not Existent" });
    }

    if (engine.hasQuit) {
      return res.status(200).send({ message: "Engine Already Quitted" });
    }

    await engine.quit();

    return res.status(200).send({ message: "Engine Quitted" });
  } catch (e) {
    console.error("Engine errror", e);
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
