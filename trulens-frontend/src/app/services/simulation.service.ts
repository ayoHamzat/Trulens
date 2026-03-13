import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export type AIKey = 'chatgpt' | 'gemini' | 'claude' | 'perplexity';

export interface AIResponse {
  text: string;
  mentions_brand: boolean;
  sentiment: 'positive' | 'neutral' | 'negative';
  issue: string | null;
}

export interface SimQuery {
  query: string;
  responses: Record<AIKey, AIResponse>;
}

export interface AIScore {
  bts: number;
  visibility: number;
  accuracy: number;
  sentiment: number;
  hallucination_rate: number;
}

export interface SimIssue {
  ai: AIKey;
  query: string;
  type: 'visibility' | 'pricing' | 'outdated' | 'hallucination';
  description: string;
  fix: string;
  bts_gain: number;
}

export interface BTS {
  overall: number;
  visibility_index: number;
  accuracy_rate: number;
  sentiment_score: number;
  hallucination_rate: number;
  per_ai: Record<string, AIScore>;
  issues: SimIssue[];
}

export interface SimulationResults {
  business_name: string;
  business_type: string;
  queries: SimQuery[];
  bts: BTS;
}

export interface SimulationRun {
  id: number;
  run_at: string;
  results: SimulationResults;
}

export interface SimulationSummary {
  id: number;
  run_at: string;
  bts: number;
  issue_count: number;
}

@Injectable({ providedIn: 'root' })
export class SimulationService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/simulations`;

  run(): Observable<SimulationRun> {
    return this.http.post<SimulationRun>(`${this.base}/run`, {});
  }

  getLatest(): Observable<SimulationRun | null> {
    return this.http.get<SimulationRun | null>(`${this.base}/latest`);
  }

  list(): Observable<SimulationSummary[]> {
    return this.http.get<SimulationSummary[]>(`${this.base}/`);
  }
}
