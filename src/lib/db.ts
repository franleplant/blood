import * as sqlite from "sqlite";

export async function openDatabase(config: sqlite.ISqlite.Config) {
  const db = await sqlite.open(config);
  console.log(`>>> SQL: connected to ${config.filename}`);

  const rawDb = db.getDatabaseInstance();
  rawDb.on("trace", (query: string) => {
    console.log(`>>> SQL: ${query}`);
  });

  return {
    db,
    [Symbol.asyncDispose]: async () => {
      await db.close();
      console.log(`>>> SQL: closed connection to ${config.filename}`);
    },
  };
}
