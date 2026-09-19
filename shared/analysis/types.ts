import type { Payslip } from '../parsing/model.js';
import type { AnalysisResult } from './findings.js';

/** Une analyse complète, telle que stockée localement (IndexedDB). */
export interface StoredAnalysis {
  id: string;
  createdAt: number;
  fileName: string;
  /** ex. « Juin 2026 · ACME TECH SARL » */
  label: string;
  /** mode de lecture du PDF ayant produit l'analyse. */
  reader: 'local' | 'ai';
  payslip: Payslip;
  result: AnalysisResult;
}
