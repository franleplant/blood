-- Rename events.date -> events.start_date and add nullable end_date.
-- SQLite doesn't support column renames in-place, so we redefine the table.
PRAGMA defer_foreign_keys = ON;
PRAGMA foreign_keys = OFF;

CREATE TABLE "new_events" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "start_date" DATETIME NOT NULL,
    "end_date" DATETIME,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "user_id" INTEGER NOT NULL,
    CONSTRAINT "events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

INSERT INTO "new_events" ("id", "start_date", "title", "description", "user_id")
SELECT "id", "date", "title", "description", "user_id" FROM "events";

DROP TABLE "events";
ALTER TABLE "new_events" RENAME TO "events";

PRAGMA foreign_keys = ON;
PRAGMA defer_foreign_keys = OFF;
