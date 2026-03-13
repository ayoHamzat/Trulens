import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GeminiService, OnboardingQuestion } from '../../services/gemini.service';
import { UserProfileService } from '../../services/user-profile.service';

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
  private router = inject(Router);

  loading = true;
  error = false;
  errorMessage = '';
  questions: OnboardingQuestion[] = [];
  answers: Record<string, any> = {};

  get businessType(): string {
    return this.userProfile.businessType || 'Retail';
  }

  get businessName(): string {
    return this.userProfile.businessName;
  }

  ngOnInit(): void {
    this.loadQuestions();
  }

  loadQuestions(): void {
    this.loading = true;
    this.error = false;

    this.gemini.generateOnboardingQuestions(this.businessType).subscribe({
      next: (questions) => {
        this.questions = questions;
        this.loading = false;
      },
      error: (err) => {
        this.error = true;
        this.loading = false;
        this.errorMessage = err?.error?.error?.message || err?.message || JSON.stringify(err);
        console.error('Gemini error:', err);
      }
    });
  }

  saveProfile(): void {
    console.log('Profile answers:', this.answers);
    this.router.navigate(['/dashboard']);
  }
}
