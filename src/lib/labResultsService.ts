import type { LabResult } from "../generated/prisma";
import { openDatabase } from "./db";

export class LabResultsService {
  /**
   * Get all lab results, optionally filtered by date range
   */
  static async getAllResults(options?: {
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  }): Promise<LabResult[]> {
    const { prisma } = await openDatabase();

    const where: any = {};
    if (options?.startDate || options?.endDate) {
      where.date = {};
      if (options.startDate) {
        where.date.gte = options.startDate.toISOString().split("T")[0];
      }
      if (options.endDate) {
        where.date.lte = options.endDate.toISOString().split("T")[0];
      }
    }

    const results = await prisma.labResult.findMany({
      where,
      take: options?.limit,
      skip: options?.offset,
      orderBy: { date: "desc" },
    });

    return results;
  }

  /**
   * Get lab results by marker name (English or Spanish)
   */
  static async getResultsByMarker(markerName: string): Promise<LabResult[]> {
    const { prisma } = await openDatabase();

    const results = await prisma.labResult.findMany({
      where: {
        OR: [
          { marker_name_en: { contains: markerName } },
          { marker_name_es: { contains: markerName } },
        ],
      },
      orderBy: { date: "desc" },
    });

    return results;
  }

  /**
   * Get a specific lab result by ID
   */
  static async getResultById(id: number): Promise<LabResult | null> {
    const { prisma } = await openDatabase();

    const result = await prisma.labResult.findUnique({
      where: { id },
    });

    return result;
  }

  /**
   * Get results for a specific date
   */
  static async getResultsByDate(date: Date): Promise<LabResult[]> {
    const { prisma } = await openDatabase();
    const dateString = date.toISOString().split("T")[0];

    const results = await prisma.labResult.findMany({
      where: { date: dateString },
      orderBy: { marker_name_en: "asc" },
    });

    return results;
  }

  /**
   * Get all unique marker names
   */
  static async getUniqueMarkers(): Promise<{ en: string; es: string }[]> {
    const { prisma } = await openDatabase();

    const results = await prisma.labResult.findMany({
      select: {
        marker_name_en: true,
        marker_name_es: true,
      },
      distinct: ["marker_name_en", "marker_name_es"],
    });

    return results.map((r) => ({
      en: r.marker_name_en,
      es: r.marker_name_es,
    }));
  }

  /**
   * Get all unique dates with lab results
   */
  static async getUniqueDates(): Promise<Date[]> {
    const { prisma } = await openDatabase();

    const results = await prisma.labResult.findMany({
      select: { date: true },
      distinct: ["date"],
      orderBy: { date: "desc" },
    });

    return results.map((r) => new Date(r.date));
  }

  /**
   * Search lab results by text across multiple fields
   */
  static async searchResults(searchTerm: string): Promise<LabResult[]> {
    const { prisma } = await openDatabase();

    const results = await prisma.labResult.findMany({
      where: {
        OR: [
          { marker_name_en: { contains: searchTerm } },
          { marker_name_es: { contains: searchTerm } },
          { lab_name: { contains: searchTerm } },
          { doctor_protocol_notes: { contains: searchTerm } },
          { comments: { contains: searchTerm } },
        ],
      },
      orderBy: { date: "desc" },
    });

    return results;
  }

  /**
   * Get count of total lab results
   */
  static async getResultsCount(): Promise<number> {
    const { prisma } = await openDatabase();
    return await prisma.labResult.count();
  }
}
