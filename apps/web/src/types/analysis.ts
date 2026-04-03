import { Issue } from './issue';

export type Status = 'completed' | 'running' | 'failed' | 'pending';

export interface AnalysisFile {
  id: string;
  name: string;
  language: string;
  score: number;
  issueCount: number;
  fixedCount: number;
  status: Status;
  date: string;
  issues: Issue[];
  code: string;
  cyclomaticComplexity?: number;
  cognitiveComplexity?: number;
  timeComplexity?: string;
  complexityScore?: number;
}

export interface Metric {
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
}
