import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { BUSINESS_TYPES } from '../../shared/constants/business-types';
import { UserProfileService } from '../../services/user-profile.service';

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

  mode: 'login' | 'signup' = 'login';
  businessTypes = BUSINESS_TYPES;

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
    const businessType = this.signUpData.businessType === 'Other'
      ? this.signUpData.otherBusinessType
      : this.signUpData.businessType;

    this.userProfile.businessType = businessType;
    this.userProfile.businessName = this.signUpData.businessName;

    this.router.navigate(['/onboarding']);
  }

  login(): void {
    this.router.navigate(['/dashboard']);
  }
}