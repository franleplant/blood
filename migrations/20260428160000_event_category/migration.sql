-- Add NOT NULL events.category. SQLite can't add a NOT NULL column without a
-- default to a non-empty table, so we redefine the table and backfill via CASE
-- on title. Categories: medications, supplements, lifestyle, nutrition, sleep,
-- training.
PRAGMA defer_foreign_keys = ON;
PRAGMA foreign_keys = OFF;

CREATE TABLE "new_events" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "start_date" DATETIME NOT NULL,
    "end_date" DATETIME,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "user_id" INTEGER NOT NULL,
    CONSTRAINT "events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

INSERT INTO "new_events" ("id", "start_date", "end_date", "title", "description", "category", "user_id")
SELECT
    "id",
    "start_date",
    "end_date",
    "title",
    "description",
    CASE "title"
        WHEN 'starts metformin'                 THEN 'medications'
        WHEN 'starts ozempic'                   THEN 'medications'
        WHEN 'starts t4 and t3'                 THEN 'medications'
        WHEN 'Clomifeno course'                 THEN 'medications'
        WHEN 'starts tongkat ali and test shake' THEN 'supplements'
        WHEN 'starts glycine'                   THEN 'supplements'
        WHEN 'starts thiamine'                  THEN 'supplements'
        WHEN 'starts vit E'                     THEN 'supplements'
        WHEN 'starts magnesium'                 THEN 'supplements'
        ELSE 'medications'
    END AS "category",
    "user_id"
FROM "events";

DROP TABLE "events";
ALTER TABLE "new_events" RENAME TO "events";

PRAGMA foreign_keys = ON;
PRAGMA defer_foreign_keys = OFF;
