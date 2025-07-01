import * as sqlite from "sqlite";
import sqlite3 from "sqlite3";

const defaultConfig = {
  filename: "./blood_markers.sqlite",
  driver: sqlite3.Database,
};

export async function openDatabase(
  config: Partial<sqlite.ISqlite.Config> = {}
) {
  const finalConfig = { ...defaultConfig, ...config };
  const db = await sqlite.open(finalConfig);
  console.log(`>>> SQL: connected to ${finalConfig.filename}`);

  const rawDb = db.getDatabaseInstance();
  rawDb.on("trace", (query: string) => {
    console.log(`>>> SQL: ${query}`);
  });

  return {
    db,
    [Symbol.asyncDispose]: async () => {
      await db.close();
      console.log(`>>> SQL: closed connection to ${finalConfig.filename}`);
    },
  };
}
