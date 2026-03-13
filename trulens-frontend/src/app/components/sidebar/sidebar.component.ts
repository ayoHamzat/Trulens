import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.css',
})
export class SidebarComponent {
  private auth = inject(AuthService);

  get user() { return this.auth.currentUser(); }
  get initial(): string {
    const name = this.user?.business_name ?? this.user?.owner_name ?? '';
    return name.charAt(0).toUpperCase() || 'T';
  }
}
