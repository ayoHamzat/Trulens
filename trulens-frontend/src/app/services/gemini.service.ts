import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface OnboardingQuestion {
  label: string;
  field_name: string;
  input_type: 'text' | 'select' | 'textarea';
  options?: string[];
}

@Injectable({ providedIn: 'root' })
export class GeminiService {
  private http = inject(HttpClient);

  generateOnboardingQuestions(businessType: string): Observable<OnboardingQuestion[]> {
    return this.http.post<OnboardingQuestion[]>(
      `${environment.apiUrl}/onboarding/questions`,
      { business_type: businessType }
    );
  }
}
