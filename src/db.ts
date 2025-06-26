import * as sqlite from "sqlite";

export async function openDatabase(config: sqlite.ISqlite.Config) {
  const db = await sqlite.open(config);
  return {
    db,
    [Symbol.asyncDispose]: async () => {
      await db.close();
      console.log("\nDatabase connection closed.");
    },
  };
}
