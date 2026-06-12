import path from "path";
import { config } from "dotenv";

/** Load `.env` from the repo root so env vars work regardless of `cwd`. */
config({
  path: path.resolve(import.meta.dirname, "..", "..", ".env"),
});
