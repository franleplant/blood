/*
 Warnings:
 
 - Added the required column `user_id` to the `events` table without a default value. This is not possible if the table is not empty.
 - Added the required column `user_id` to the `lab_results` table without a default value. This is not possible if the table is not empty.
 
 */
-- CreateTable
CREATE TABLE "users" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "height" REAL,
    "gender" TEXT
);
-- Insert a default user for existing data
INSERT INTO "users" ("name", "height", "gender")
VALUES ('Default User', NULL, NULL);
-- RedefineTables
PRAGMA defer_foreign_keys = ON;
PRAGMA foreign_keys = OFF;
CREATE TABLE "new_events" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "date" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "user_id" INTEGER NOT NULL,
    CONSTRAINT "events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_events" ("date", "description", "id", "title", "user_id")
SELECT "date",
    "description",
    "id",
    "title",
    1
FROM "events";
DROP TABLE "events";
ALTER TABLE "new_events"
    RENAME TO "events";
CREATE TABLE "new_lab_results" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "date" TEXT NOT NULL,
    "marker_name_es" TEXT NOT NULL,
    "marker_name_en" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "unit" TEXT,
    "reference_range" TEXT,
    "lab_name" TEXT,
    "doctor_protocol_notes" TEXT,
    "derived" TEXT,
    "comments" TEXT,
    "other" TEXT,
    "user_id" INTEGER NOT NULL,
    CONSTRAINT "lab_results_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_lab_results" (
        "comments",
        "date",
        "derived",
        "doctor_protocol_notes",
        "id",
        "lab_name",
        "marker_name_en",
        "marker_name_es",
        "other",
        "reference_range",
        "unit",
        "value",
        "user_id"
    )
SELECT "comments",
    "date",
    "derived",
    "doctor_protocol_notes",
    "id",
    "lab_name",
    "marker_name_en",
    "marker_name_es",
    "other",
    "reference_range",
    "unit",
    "value",
    1
FROM "lab_results";
DROP TABLE "lab_results";
ALTER TABLE "new_lab_results"
    RENAME TO "lab_results";
PRAGMA foreign_keys = ON;
PRAGMA defer_foreign_keys = OFF;