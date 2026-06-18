export type RiskLevel = "Low" | "Medium" | "High" | "Critical";

export type AnalysisType = "message" | "url" | "screenshot";

export type ScamAnalysis = {
  scamScore: number;
  riskLevel: RiskLevel;
  category: string;
  redFlags: string[];
  explanation: string;
  recommendation: string;
  coach?: {
    manipulationTechniques: string[];
    safetySteps: string[];
    reportingSuggestions: string[];
  };
};

export type ScamReport = ScamAnalysis & {
  id: string;
  content: string;
  type: AnalysisType;
  createdAt: string;
};

export type ReportDocument = Omit<ScamReport, "id" | "createdAt"> & {
  createdAt: Date;
};

export type ReportStats = {
  totalReports: number;
  highRiskAlerts: number;
  categoryCounts: { category: string; count: number }[];
  riskCounts: { riskLevel: RiskLevel; count: number }[];
};
