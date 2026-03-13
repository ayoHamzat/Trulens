import { Component } from '@angular/core';
import { SidebarComponent } from '../../components/sidebar/sidebar.component';

@Component({
  selector: 'app-insights-page',
  standalone: true,
  imports: [SidebarComponent],
  templateUrl: './insights-page.component.html',
  styleUrl: './insights-page.component.css'
})
export class InsightsPageComponent {}
