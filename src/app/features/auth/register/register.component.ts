import { Component, inject, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ThemeService } from '../../../core/services/theme.service';

function passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
  const password = control.get('password');
  const confirmPassword = control.get('confirmPassword');

  if (password && confirmPassword && password.value !== confirmPassword.value) {
    return { passwordMismatch: true };
  }
  return null;
}

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterLink],
  templateUrl: './register.component.html',
  styleUrl: './register.component.scss',
})
export class RegisterComponent implements OnDestroy {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  themeService = inject(ThemeService);
  private router = inject(Router);

  errorMessage: string | null = null;
  successMessage: string | null = null;
  isLoading = false;

  // Step state: 'register' | 'verify'
  currentStep: 'register' | 'verify' = 'register';
  pendingEmail: string = '';
  verificationCode: string = '';

  // Resend cooldown timer
  resendCountdown = 0;
  private timerInterval: any = null;

  registerForm: FormGroup = this.fb.group(
    {
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', [Validators.required]],
    },
    { validators: passwordMatchValidator }
  );

  onSubmit(): void {
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      return;
    }

    this.errorMessage = null;
    this.successMessage = null;
    this.isLoading = true;

    const { email, password } = this.registerForm.value;
    this.pendingEmail = email.trim();

    this.authService.register({ email: this.pendingEmail, password }).subscribe({
      next: (res) => {
        this.isLoading = false;
        // If registration requires email verification
        if (res.data?.requireVerification || !res.data?.accessToken) {
          this.currentStep = 'verify';
          this.successMessage = res.message || 'Verification code sent to your email!';
          this.startResendCooldown();
        } else {
          // If already authenticated
          this.router.navigate(['/dashboard']);
        }
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = err.error?.error?.message || err.error?.message || 'Registration failed. Please try again.';
      },
    });
  }

  onVerifyCode(): void {
    const cleanCode = this.verificationCode.trim();
    if (!cleanCode || cleanCode.length < 6) {
      this.errorMessage = 'Please enter the 6-digit verification code.';
      return;
    }

    this.errorMessage = null;
    this.successMessage = null;
    this.isLoading = true;

    this.authService.verifyEmail({ email: this.pendingEmail, code: cleanCode }).subscribe({
      next: () => {
        this.isLoading = false;
        this.successMessage = 'Email verified successfully! Welcome to Univasos.';
        setTimeout(() => {
          this.router.navigate(['/dashboard']);
        }, 800);
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = err.error?.error?.message || err.error?.message || 'Invalid or expired code. Please try again.';
      },
    });
  }

  onResendCode(): void {
    if (this.resendCountdown > 0 || this.isLoading) return;

    this.errorMessage = null;
    this.successMessage = null;
    this.isLoading = true;

    this.authService.resendVerification(this.pendingEmail).subscribe({
      next: (res) => {
        this.isLoading = false;
        this.successMessage = res.message || 'A new verification code has been sent.';
        this.startResendCooldown();
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = err.error?.error?.message || err.error?.message || 'Could not resend code. Please try again.';
      },
    });
  }

  startResendCooldown(): void {
    this.resendCountdown = 45;
    if (this.timerInterval) clearInterval(this.timerInterval);
    this.timerInterval = setInterval(() => {
      this.resendCountdown--;
      if (this.resendCountdown <= 0) {
        clearInterval(this.timerInterval);
      }
    }, 1000);
  }

  backToRegister(): void {
    this.currentStep = 'register';
    this.verificationCode = '';
    this.errorMessage = null;
    this.successMessage = null;
  }

  ngOnDestroy(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
  }

  get email() {
    return this.registerForm.get('email');
  }

  get password() {
    return this.registerForm.get('password');
  }

  get confirmPassword() {
    return this.registerForm.get('confirmPassword');
  }

  get isPasswordMismatch() {
    return (
      this.registerForm.errors?.['passwordMismatch'] &&
      this.confirmPassword?.touched
    );
  }
}
