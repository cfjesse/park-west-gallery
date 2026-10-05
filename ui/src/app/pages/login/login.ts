import { ChangeDetectorRef, Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { AuthenticationService } from '../../services/authentication';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { debounceTime, tap } from 'rxjs';

@Component({
  imports: [ReactiveFormsModule, NzButtonModule, NzInputModule, NzFormModule, NzIconModule, NzAlertModule],
  selector: 'app-login',
  styleUrl: './login.scss',
  templateUrl: './login.html',
})
export class Login {
  readonly authService = inject(AuthenticationService);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);

  private readonly fb = inject(FormBuilder).nonNullable;
  public loginForm = this.fb.group({
    username: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(20), Validators.pattern('[A-Za-z0-9_\\.]*')]],
    password: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(20), Validators.pattern('[A-Za-z0-9_\\.@]*')]],
  });
  public errorMessage = signal<string | null>(null);
  public isLoading = signal<boolean>(false);
  public showAlerts = signal<boolean>(false);

  constructor() {
    this.loginForm.valueChanges.pipe(
      tap(() => this.showAlerts.set(false)),
      debounceTime(2000),
      takeUntilDestroyed(),
    ).subscribe(() => {
      this.showAlerts.set(true);
    })
  }

  public onLogin(): void {
    if (this.loginForm.invalid) return;

    this.isLoading.set(true);
    this.errorMessage.set(null);

    const { username, password } = this.loginForm.getRawValue();

    this.authService
      .login({ username, password })
      .subscribe({
        next: (response) => {
          this.isLoading.set(false);
          const user = response?.user;
          const role = user?.role;

          if (role === 'accountant') {
            this.router.navigate(['/accounting']);
          } else if (role === 'inventory_specialist') {
            this.router.navigate(['/inventory']);
          } else if (role === 'customer') {
            this.router.navigate(['/customer']);
          } else {
            this.router.navigate(['/home']);
          }
        },
        error: (err) => {
          this.isLoading.set(false);
          this.errorMessage.set(err?.error?.error || 'Invalid username or password.');
        },
      });
  }
}
