import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { AuthenticationService } from '../../../services/authentication';

@Component({
  imports: [FormsModule, NzButtonModule, NzInputModule, NzFormModule, NzIconModule, NzAlertModule],
  selector: 'app-login',
  styleUrl: './login.scss',
  templateUrl: './login.html',
})
export class Login {
  readonly authService = inject(AuthenticationService);
  private readonly router = inject(Router);

  public username = '';
  public password = '';
  public errorMessage = signal<string | null>(null);
  public isLoading = signal<boolean>(false);

  public onLogin(): void {
    if (!this.username || !this.password) return;

    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.authService
      .login({ username: this.username, password: this.password })
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
