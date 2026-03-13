import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { SidebarComponent } from '../../components/sidebar/sidebar.component';
import { AuthService } from '../../services/auth.service';
import { SimulationService, SimulationRun, SimulationSummary } from '../../services/simulation.service';

@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  imports: [CommonModule, SidebarComponent, RouterLink],
  templateUrl: './dashboard-page.component.html',
  styleUrl: './dashboard-page.component.css',
})
export class DashboardPageComponent implements OnInit {
  private auth = inject(AuthService);
  private simService = inject(SimulationService);

  latestSim: SimulationRun | null = null;
  simHistory: SimulationSummary[] = [];
  loadingData = true;

  get user() { return this.auth.currentUser(); }
  get businessName() { return this.user?.business_name ?? ''; }
  get ownerName() { return this.user?.owner_name ?? ''; }

  get bts() { return this.latestSim?.results?.bts ?? null; }
  get hasData() { return this.latestSim !== null; }

  get recentSims() { return this.simHistory.slice(0, 3); }

  ngOnInit(): void {
    this.simService.getLatest().subscribe({
      next: (r) => { this.latestSim = r; this.loadingData = false; },
      error: () => { this.loadingData = false; },
    });
    this.simService.list().subscribe({
      next: (h) => (this.simHistory = h),
    });
  }

  btsColor(score: number): string {
    if (score >= 70) return '#16a34a';
    if (score >= 50) return 'var(--gold-600)';
    return '#ef4444';
  }

  formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric',
    });
  }
}
