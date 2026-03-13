import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, catchError, of } from 'rxjs';
import { environment } from '../../environments/environment';

export interface OnboardingQuestion {
  label: string;
  field_name: string;
  input_type: 'text' | 'select' | 'textarea';
  options?: string[];
}

const FALLBACK_QUESTIONS: OnboardingQuestion[] = [
  {
    label: 'Who is your primary target customer?',
    field_name: 'target_customer',
    input_type: 'select',
    options: ['Men', 'Women', 'Both men and women', 'Teens', 'Kids', 'Seniors', 'Businesses (B2B)']
  },
  {
    label: 'What are your top 3 products or services?',
    field_name: 'top_products',
    input_type: 'textarea'
  },
  {
    label: 'What price range do your products typically fall into?',
    field_name: 'price_range',
    input_type: 'select',
    options: ['Under $25', '$25 – $75', '$75 – $150', '$150 – $500', '$500+']
  },
  {
    label: 'Which region is your primary market?',
    field_name: 'primary_market',
    input_type: 'select',
    options: ['United States', 'Canada', 'United Kingdom', 'Europe', 'Australia', 'Asia', 'Global']
  },
  {
    label: 'Who are your top 2–3 competitors?',
    field_name: 'competitors',
    input_type: 'text'
  },
  {
    label: "How would you describe your brand's personality and tone?",
    field_name: 'brand_tone',
    input_type: 'select',
    options: ['Premium & sophisticated', 'Fun & playful', 'Bold & edgy', 'Trustworthy & professional', 'Eco-conscious & ethical', 'Affordable & accessible']
  },
  {
    label: 'What makes your brand unique compared to competitors?',
    field_name: 'unique_value',
    input_type: 'textarea'
  }
];

@Injectable({ providedIn: 'root' })
export class GeminiService {
  private http = inject(HttpClient);

  private get apiUrl(): string {
    return `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${environment.geminiApiKey}`;
  }

  generateOnboardingQuestions(businessType: string): Observable<OnboardingQuestion[]> {
    const prompt = `You are helping a "${businessType}" business owner set up an AI brand monitoring profile.

Generate exactly 7 thoughtful questions to understand their business. Cover: target customers, top products or services, price range, primary geographic market, main competitors, brand personality/tone, and what makes them unique.

Return ONLY a valid JSON array — no markdown, no explanation, no code fences. Use this exact structure:
[
  {
    "label": "The question text",
    "field_name": "snake_case_key",
    "input_type": "text",
    "options": []
  }
]

Rules:
- Use "select" with a populated "options" array when a predefined list makes sense (e.g. age range, region, price tier).
- Use "textarea" for questions expecting longer, descriptive answers.
- Use "text" for short open-ended answers.
- Keep labels conversational and natural, not robotic.`;

    const body = {
      contents: [{ parts: [{ text: prompt }] }],
    };

    return this.http.post<any>(this.apiUrl, body).pipe(
      map(response => {
        const rawText: string = response.candidates[0].content.parts[0].text;
        const cleaned = rawText
          .replace(/```json\s*/gi, '')
          .replace(/```\s*/gi, '')
          .trim();
        return JSON.parse(cleaned) as OnboardingQuestion[];
      }),
      catchError(() => of(FALLBACK_QUESTIONS))
    );
  }
}
