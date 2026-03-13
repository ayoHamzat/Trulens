import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { SidebarComponent } from '../../components/sidebar/sidebar.component';
import {
  SimulationService,
  SimulationRun,
  SimIssue,
  AIKey,
} from '../../services/simulation.service';

const AI_LABELS: Record<AIKey, string> = {
  chatgpt: 'ChatGPT', gemini: 'Gemini', claude: 'Claude', perplexity: 'Perplexity',
};
const AI_COLORS: Record<AIKey, string> = {
  chatgpt: '#10a37f', gemini: '#4285f4', claude: '#c96442', perplexity: '#5436da',
};

@Component({
  selector: 'app-insights-page',
  standalone: true,
  imports: [CommonModule, SidebarComponent, RouterLink],
  templateUrl: './insights-page.component.html',
  styleUrl: './insights-page.component.css',
})
export class InsightsPageComponent implements OnInit {
  private simService = inject(SimulationService);

  latest: SimulationRun | null = null;
  loading = true;

  ngOnInit(): void {
    this.simService.getLatest().subscribe({
      next: (r) => { this.latest = r; this.loading = false; },
      error: () => { this.loading = false; },
    });
  }

  get bts() { return this.latest?.results?.bts ?? null; }
  get queries() { return this.latest?.results?.queries ?? []; }
  get aiKeys(): AIKey[] { return ['chatgpt', 'gemini', 'claude', 'perplexity']; }

  aiLabel(k: string) { return AI_LABELS[k as AIKey] ?? k; }
  aiColor(k: string) { return AI_COLORS[k as AIKey] ?? '#888'; }

  btsColor(s: number) {
    if (s >= 70) return '#16a34a';
    if (s >= 50) return 'var(--gold-500)';
    return '#ef4444';
  }

  mentionCount(ai: AIKey): number {
    return this.queries.filter(q => q.responses[ai].mentions_brand).length;
  }

  get issueSummary(): { type: string; count: number; color: string }[] {
    const issues = this.bts?.issues ?? [];
    const counts: Record<string, number> = {};
    issues.forEach(i => { counts[i.type] = (counts[i.type] ?? 0) + 1; });
    const colors: Record<string, string> = {
      visibility: 'var(--blue-600)', pricing: '#ec4899',
      outdated: 'var(--gold-500)', hallucination: '#ef4444',
    };
    return Object.entries(counts).map(([type, count]) => ({ type, count, color: colors[type] ?? '#888' }));
  }

  get topOpportunities(): SimIssue[] {
    return [...(this.bts?.issues ?? [])].sort((a, b) => b.bts_gain - a.bts_gain).slice(0, 4);
  }

  get bestAI(): [string, any] | null {
    const entries = Object.entries(this.bts?.per_ai ?? {});
    if (!entries.length) return null;
    return entries.reduce((a, b) => (a[1] as any).bts > (b[1] as any).bts ? a : b) as [string, any];
  }

  sentimentPct(ai: AIKey, sentiment: 'positive' | 'neutral' | 'negative'): number {
    if (!this.queries.length) return 0;
    const count = this.queries.filter(q => q.responses[ai].sentiment === sentiment).length;
    return Math.round((count / this.queries.length) * 100);
  }

  get worstAI(): [string, any] | null {
    const entries = Object.entries(this.bts?.per_ai ?? {});
    if (!entries.length) return null;
    return entries.reduce((a, b) => (a[1] as any).bts < (b[1] as any).bts ? a : b) as [string, any];
  }

  formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('en-US', {
      month: 'long', day: 'numeric', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  }
}
