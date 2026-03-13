import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SidebarComponent } from '../../components/sidebar/sidebar.component';
import {
  SimulationService,
  SimulationRun,
  SimulationSummary,
  BTS,
  SimIssue,
  AIScore,
  AIKey,
} from '../../services/simulation.service';

const AI_LABELS: Record<AIKey, string> = {
  chatgpt: 'ChatGPT',
  gemini: 'Gemini',
  claude: 'Claude',
  perplexity: 'Perplexity',
};

const AI_COLORS: Record<AIKey, string> = {
  chatgpt: '#10a37f',
  gemini: '#4285f4',
  claude: '#c96442',
  perplexity: '#5436da',
};

@Component({
  selector: 'app-simulations-page',
  standalone: true,
  imports: [CommonModule, SidebarComponent],
  templateUrl: './simulations-page.component.html',
  styleUrl: './simulations-page.component.css',
})
export class SimulationsPageComponent implements OnInit {
  private simService = inject(SimulationService);

  running = false;
  latest: SimulationRun | null = null;
  history: SimulationSummary[] = [];
  expandedQuery: number | null = null;
  readonly aiKeys: AIKey[] = ['chatgpt', 'gemini', 'claude', 'perplexity'];

  ngOnInit(): void {
    this.simService.getLatest().subscribe({ next: (r) => (this.latest = r) });
    this.simService.list().subscribe({ next: (h) => (this.history = h) });
  }

  runSimulation(): void {
    this.running = true;
    this.simService.run().subscribe({
      next: (run) => {
        this.latest = run;
        this.running = false;
        this.simService.list().subscribe({ next: (h) => (this.history = h) });
      },
      error: () => (this.running = false),
    });
  }

  toggleQuery(i: number): void {
    this.expandedQuery = this.expandedQuery === i ? null : i;
  }

  get bts(): BTS | null {
    return this.latest?.results?.bts ?? null;
  }

  get aiEntries(): { key: AIKey; label: string; color: string; score: AIScore }[] {
    if (!this.bts?.per_ai) return [];
    return Object.entries(this.bts.per_ai).map(([key, score]) => ({
      key: key as AIKey,
      label: AI_LABELS[key as AIKey],
      color: AI_COLORS[key as AIKey],
      score: score as AIScore,
    }));
  }

  get issues(): SimIssue[] {
    return this.bts?.issues ?? [];
  }

  aiLabel(key: AIKey): string {
    return AI_LABELS[key];
  }

  aiColor(key: AIKey): string {
    return AI_COLORS[key];
  }

  /** SVG arc dash for the BTS gauge (270° arc, r=54, cx=cy=64) */
  gaugeDash(score: number): string {
    const arc = 254.5; // 270/360 * 2π*54
    return `${(score / 100) * arc} 339.3`;
  }

  btsColor(score: number): string {
    if (score >= 70) return '#16a34a';
    if (score >= 50) return 'var(--gold-500)';
    return '#ef4444';
  }

  issueIcon(type: string): string {
    switch (type) {
      case 'visibility':  return 'M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z';
      case 'pricing':     return 'M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z';
      case 'outdated':    return 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z';
      default:            return 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z';
    }
  }

  formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  }
}
