import { Component, inject, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ThemeService } from '../../../core/services/theme.service';

function resetPasswordMatchValidator(control: AbstractControl): ValidationErrors | null {
  const newPassword = control.get('newPassword');
  const confirmPassword = control.get('confirmPassword');

  if (newPassword && confirmPassword && newPassword.value !== confirmPassword.value) {
    return { passwordMismatch: true };
  }
  return null;
}

export type LoginStep = 'login' | 'forgot-password' | 'reset-password';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent implements OnDestroy {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  themeService = inject(ThemeService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  currentStep: LoginStep = 'login';
  errorMessage: string | null = null;
  successMessage: string | null = null;
  isLoading = false;

  pendingEmail: string = '';

  // Resend cooldown timer for password reset
  resendCountdown = 0;
  private timerInterval: any = null;

  // 1. Primary Login Form
  loginForm: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
  });

  // 2. Forgot Password Request Form
  forgotForm: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
  });

  // 3. Reset Password Form
  resetForm: FormGroup = this.fb.group(
    {
      code: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(6)]],
      newPassword: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', [Validators.required]],
    },
    { validators: resetPasswordMatchValidator }
  );

  /**
   * Submit Step 1: Direct Login with Email & Password
   */
  onSubmitLogin(): void {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.errorMessage = null;
    this.successMessage = null;
    this.isLoading = true;

    const { email, password } = this.loginForm.value;
    const cleanEmail = email.trim();

    this.authService.login({ email: cleanEmail, password }).subscribe({
      next: () => {
        this.isLoading = false;
        const returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/dashboard';
        this.router.navigateByUrl(returnUrl);
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = err.error?.error?.message || err.error?.message || 'Login failed. Please check your credentials.';
      },
    });
  }

  /**
   * Resend password recovery code
   */
  onResendResetCode(): void {
    if (this.resendCountdown > 0 || this.isLoading || !this.pendingEmail) return;

    this.errorMessage = null;
    this.successMessage = null;
    this.isLoading = true;

    this.authService.forgotPassword(this.pendingEmail).subscribe({
      next: (res) => {
        this.isLoading = false;
        this.successMessage = res.message || 'A fresh reset code has been sent to your email.';
        this.startResendCooldown();
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = err.error?.error?.message || err.error?.message || 'Could not resend reset code. Please try again.';
      },
    });
  }

  /**
   * Switch to Forgot Password
   */
  switchToForgotPassword(): void {
    this.currentStep = 'forgot-password';
    this.errorMessage = null;
    this.successMessage = null;
    const currentEmail = this.loginForm.get('email')?.value;
    if (currentEmail) {
      this.forgotForm.patchValue({ email: currentEmail });
    }
  }

  /**
   * Submit Forgot Password Form
   */
  onSubmitForgotPassword(): void {
    if (this.forgotForm.invalid) {
      this.forgotForm.markAllAsTouched();
      return;
    }

    this.errorMessage = null;
    this.successMessage = null;
    this.isLoading = true;

    const email = this.forgotForm.value.email.trim();
    this.pendingEmail = email;

    this.authService.forgotPassword(email).subscribe({
      next: (res) => {
        this.isLoading = false;
        this.currentStep = 'reset-password';
        this.resetForm.reset();
        this.successMessage = res.message || 'If an account exists, a 6-digit password reset code has been emailed.';
        this.startResendCooldown();
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = err.error?.error?.message || err.error?.message || 'Failed to request password reset.';
      },
    });
  }

  /**
   * Submit Reset Password Form
   */
  onSubmitResetPassword(): void {
    if (this.resetForm.invalid) {
      this.resetForm.markAllAsTouched();
      return;
    }

    this.errorMessage = null;
    this.successMessage = null;
    this.isLoading = true;

    const { code, newPassword } = this.resetForm.value;

    this.authService.resetPassword({
      email: this.pendingEmail,
      code: code.trim(),
      newPassword,
    }).subscribe({
      next: (res) => {
        this.isLoading = false;
        this.currentStep = 'login';
        this.loginForm.patchValue({ email: this.pendingEmail, password: '' });
        this.successMessage = res.message || 'Password reset successfully! Please sign in with your new password.';
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = err.error?.error?.message || err.error?.message || 'Invalid or expired reset code. Please try again.';
      },
    });
  }

  backToLogin(): void {
    this.currentStep = 'login';
    this.errorMessage = null;
    this.successMessage = null;
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

  ngOnDestroy(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
  }

  get email() {
    return this.loginForm.get('email');
  }

  get password() {
    return this.loginForm.get('password');
  }

  get forgotEmail() {
    return this.forgotForm.get('email');
  }

  get resetCode() {
    return this.resetForm.get('code');
  }

  get resetNewPassword() {
    return this.resetForm.get('newPassword');
  }

  get resetConfirmPassword() {
    return this.resetForm.get('confirmPassword');
  }

  get isResetPasswordMismatch() {
    return (
      this.resetForm.errors?.['passwordMismatch'] &&
      this.resetConfirmPassword?.touched
    );
  }
}
