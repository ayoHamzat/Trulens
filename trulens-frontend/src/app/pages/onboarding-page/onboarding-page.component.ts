import { Component, OnInit, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GeminiService, OnboardingQuestion } from '../../services/gemini.service';
import { UserProfileService } from '../../services/user-profile.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-onboarding-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './onboarding-page.component.html',
  styleUrl: './onboarding-page.component.css'
})
export class OnboardingPageComponent implements OnInit {
  private gemini = inject(GeminiService);
  private userProfile = inject(UserProfileService);
  private http = inject(HttpClient);
  private router = inject(Router);

  loading = true;
  saving = false;
  error = false;
  errorMessage = '';
  questions: OnboardingQuestion[] = [];
  answers: Record<string, any> = {};
  currentIndex = 0;

  get businessType(): string {
    return this.userProfile.businessType || 'Retail';
  }

  get businessName(): string {
    return this.userProfile.businessName;
  }

  get currentQuestion(): OnboardingQuestion | null {
    return this.questions[this.currentIndex] ?? null;
  }

  get progress(): number {
    if (!this.questions.length) return 0;
    return Math.round(((this.currentIndex + 1) / this.questions.length) * 100);
  }

  get isLast(): boolean {
    return this.currentIndex === this.questions.length - 1;
  }

  ngOnInit(): void {
    this.loadQuestions();
  }

  loadQuestions(): void {
    this.loading = true;
    this.error = false;
    this.currentIndex = 0;

    this.gemini.generateOnboardingQuestions(this.businessType).subscribe({
      next: (questions) => {
        this.questions = questions;
        this.loading = false;
      },
      error: (err) => {
        this.error = true;
        this.loading = false;
        this.errorMessage = err?.error?.detail || err?.message || 'Failed to load questions.';
      }
    });
  }

  next(): void {
    if (this.currentIndex < this.questions.length - 1) {
      this.currentIndex++;
    }
  }

  prev(): void {
    if (this.currentIndex > 0) {
      this.currentIndex--;
    }
  }

  saveProfile(): void {
    this.saving = true;
    this.http.post(`${environment.apiUrl}/onboarding/save`, { answers: this.answers }).subscribe({
      next: () => { this.saving = false; this.router.navigate(['/dashboard']); },
      error: () => { this.saving = false; this.router.navigate(['/dashboard']); }
    });
  }
}
