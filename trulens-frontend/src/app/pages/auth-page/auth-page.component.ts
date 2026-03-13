import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { BUSINESS_TYPES } from '../../shared/constants/business-types';
import { UserProfileService } from '../../services/user-profile.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-auth-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './auth-page.component.html',
  styleUrl: './auth-page.component.css'
})
export class AuthPageComponent {
  private router = inject(Router);
  private userProfile = inject(UserProfileService);
  private authService = inject(AuthService);

  mode: 'login' | 'signup' = 'login';
  businessTypes = BUSINESS_TYPES;
  loading = false;
  errorMessage = '';

  signUpData = {
    ownerName: '',
    email: '',
    password: '',
    businessName: '',
    businessType: '',
    otherBusinessType: ''
  };

  loginData = {
    email: '',
    password: ''
  };

  signUp(): void {
    this.loading = true;
    this.errorMessage = '';

    const businessType = this.signUpData.businessType === 'Other'
      ? this.signUpData.otherBusinessType
      : this.signUpData.businessType;

    this.authService.register({
      owner_name: this.signUpData.ownerName,
      email: this.signUpData.email,
      password: this.signUpData.password,
      business_name: this.signUpData.businessName,
      business_type: businessType,
    }).subscribe({
      next: (res) => {
        this.userProfile.businessType = res.user.business_type;
        this.userProfile.businessName = res.user.business_name;
        this.loading = false;
        this.router.navigate(['/onboarding']);
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = err?.error?.detail || 'Registration failed. Please try again.';
      }
    });
  }

  login(): void {
    this.loading = true;
    this.errorMessage = '';

    this.authService.login({
      email: this.loginData.email,
      password: this.loginData.password,
    }).subscribe({
      next: (res) => {
        this.userProfile.businessType = res.user.business_type;
        this.userProfile.businessName = res.user.business_name;
        this.loading = false;
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = err?.error?.detail || 'Invalid email or password.';
      }
    });
  }
}
