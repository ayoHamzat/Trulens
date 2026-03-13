import { Routes } from '@angular/router';
import { AuthPageComponent } from './pages/auth-page/auth-page.component';
import { OnboardingPageComponent } from './pages/onboarding-page/onboarding-page.component';
import { DashboardPageComponent } from './pages/dashboard-page/dashboard-page.component';
import { SimulationsPageComponent } from './pages/simulations-page/simulations-page.component';
import { InsightsPageComponent } from './pages/insights-page/insights-page.component';
import { SettingsPageComponent } from './pages/settings-page/settings-page.component';

export const routes: Routes = [
  { path: '', redirectTo: 'auth', pathMatch: 'full' },
  { path: 'auth', component: AuthPageComponent },
  { path: 'onboarding', component: OnboardingPageComponent },
  { path: 'dashboard', component: DashboardPageComponent },
  { path: 'simulations', component: SimulationsPageComponent },
  { path: 'insights', component: InsightsPageComponent },
  { path: 'settings', component: SettingsPageComponent },
];
