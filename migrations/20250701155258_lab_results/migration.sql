-- CreateTable
CREATE TABLE "lab_results" (
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
    "other" TEXT
);
