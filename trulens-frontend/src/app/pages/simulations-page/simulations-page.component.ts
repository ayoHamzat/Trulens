import { Component } from '@angular/core';
import { SidebarComponent } from '../../components/sidebar/sidebar.component';

@Component({
  selector: 'app-simulations-page',
  standalone: true,
  imports: [SidebarComponent],
  templateUrl: './simulations-page.component.html',
  styleUrl: './simulations-page.component.css'
})
export class SimulationsPageComponent {}
