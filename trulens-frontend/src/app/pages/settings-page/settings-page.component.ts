import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { SidebarComponent } from '../../components/sidebar/sidebar.component';
import { AuthService } from '../../services/auth.service';
import { ThemeService } from '../../services/theme.service';

@Component({
  selector: 'app-settings-page',
  standalone: true,
  imports: [CommonModule, SidebarComponent],
  templateUrl: './settings-page.component.html',
  styleUrl: './settings-page.component.css',
})
export class SettingsPageComponent {
  private auth   = inject(AuthService);
  theme          = inject(ThemeService);
  private router = inject(Router);

  get user() { return this.auth.currentUser(); }

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/auth']);
  }
}
