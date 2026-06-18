import { ObjectId, type Document } from "mongodb";
import { getDb } from "@/lib/mongodb";
import type { AnalysisType, ReportDocument, ReportStats, ScamAnalysis, ScamReport } from "@/lib/types";

const REPORTS_COLLECTION = "reports";

function serializeReport(document: Document): ScamReport {
  return {
    id: document._id.toString(),
    content: document.content,
    type: document.type,
    scamScore: document.scamScore,
    riskLevel: document.riskLevel,
    category: document.category,
    redFlags: document.redFlags ?? [],
    explanation: document.explanation,
    recommendation: document.recommendation,
    coach: document.coach,
    createdAt: document.createdAt.toISOString()
  };
}

export async function createReport(input: {
  content: string;
  type: AnalysisType;
  analysis: ScamAnalysis;
}): Promise<ScamReport> {
  const db = await getDb();
  const document: ReportDocument = {
    content: input.content,
    type: input.type,
    ...input.analysis,
    createdAt: new Date()
  };

  const result = await db.collection(REPORTS_COLLECTION).insertOne(document);
  return serializeReport({ _id: result.insertedId, ...document });
}

export async function listReports(limit = 50): Promise<ScamReport[]> {
  const db = await getDb();
  const reports = await db
    .collection(REPORTS_COLLECTION)
    .find({})
    .sort({ createdAt: -1 })
    .limit(Math.min(Math.max(limit, 1), 100))
    .toArray();

  return reports.map(serializeReport);
}

export async function getReportById(id: string): Promise<ScamReport | null> {
  if (!ObjectId.isValid(id)) {
    return null;
  }

  const db = await getDb();
  const report = await db.collection(REPORTS_COLLECTION).findOne({ _id: new ObjectId(id) });
  return report ? serializeReport(report) : null;
}

export async function getReportStats(): Promise<ReportStats> {
  const db = await getDb();
  const collection = db.collection(REPORTS_COLLECTION);
  const [totalReports, highRiskAlerts, categoryCounts, riskCounts] = await Promise.all([
    collection.countDocuments(),
    collection.countDocuments({ riskLevel: { $in: ["High", "Critical"] } }),
    collection
      .aggregate<{ _id: string; count: number }>([
        { $group: { _id: "$category", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 8 }
      ])
      .toArray(),
    collection
      .aggregate<{ _id: string; count: number }>([
        { $group: { _id: "$riskLevel", count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ])
      .toArray()
  ]);

  return {
    totalReports,
    highRiskAlerts,
    categoryCounts: categoryCounts.map((item) => ({
      category: item._id || "Unknown",
      count: item.count
    })),
    riskCounts: riskCounts.map((item) => ({
      riskLevel: item._id as ReportStats["riskCounts"][number]["riskLevel"],
      count: item.count
    }))
  };
}
