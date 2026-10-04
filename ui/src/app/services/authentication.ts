import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, of, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthUser, LoginCredentials, LoginResponse, UserRole } from '../interfaces/auth.interface';

// Re-export interfaces for convenient access
export * from '../interfaces/auth.interface';

const TOKEN_KEY = 'auth_token';
const USER_KEY = 'auth_user';

/** Landing route for each role; also used by guards and the login redirect. */
const ROLE_HOME: Record<UserRole, string> = {
  accountant: '/accounting',
  inventory_specialist: '/inventory',
  customer: '/customer',
};
const DEFAULT_HOME = '/home';

/** Reads the `exp` claim (seconds since epoch) from a JWT without verifying it. */
function readTokenExpiry(token: string): number | null {
  try {
    const payload = token.split('.')[1];
    if (!payload) return null;
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const claims = JSON.parse(atob(base64)) as { exp?: unknown };
    return typeof claims.exp === 'number' ? claims.exp : null;
  } catch {
    return null;
  }
}

function isExpired(token: string): boolean {
  const exp = readTokenExpiry(token);
  return exp !== null && exp * 1000 <= Date.now();
}

/** sessionStorage can throw (privacy modes, disabled storage), so every access is guarded. */
function readStorage(key: string): string | null {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: string | null): void {
  try {
    if (value === null) sessionStorage.removeItem(key);
    else sessionStorage.setItem(key, value);
  } catch {
    // Storage unavailable: the in-memory signals still keep the session alive for this page load.
  }
}

function readStoredUser(): AuthUser | null {
  const stored = readStorage(USER_KEY);
  if (!stored) return null;
  try {
    return JSON.parse(stored) as AuthUser;
  } catch {
    return null;
  }
}

@Injectable({
  providedIn: 'root',
})
export class AuthenticationService {
  private readonly http = inject(HttpClient);
  private readonly authUrl = `${environment.apiBaseUrl}/api/auth`;

  private readonly _token = signal<string | null>(null);
  private readonly _currentUser = signal<AuthUser | null>(null);

  /** Public readonly signals exposed to UI components */
  readonly token = this._token.asReadonly();
  readonly currentUser = this._currentUser.asReadonly();

  /** Current user's role, or null when signed out */
  readonly userRole = computed<UserRole | null>(() => this._currentUser()?.role ?? null);

  /** Route the current user should land on after signing in */
  readonly homeRoute = computed<string>(() => {
    const role = this.userRole();
    return role ? (ROLE_HOME[role] ?? DEFAULT_HOME) : DEFAULT_HOME;
  });

  constructor() {
    // Restore the session, dropping it if the stored token has already expired.
    const token = readStorage(TOKEN_KEY);
    if (token && !isExpired(token)) {
      this._token.set(token);
      this._currentUser.set(readStoredUser());
    } else if (token) {
      this.clearSession();
    }
  }

  /** True when a token is present and has not expired. */
  isAuthenticated(): boolean {
    const token = this._token();
    return !!token && !isExpired(token);
  }

  /** Gets the current authentication token. */
  getToken(): string | null {
    return this._token();
  }

  /** Logs in and stores the session; emits the server response. */
  login(credentials: LoginCredentials): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(`${this.authUrl}/login`, credentials)
      .pipe(tap((res) => res?.token && this.setSession(res.token, res.user)));
  }

  /**
   * Clears the local session immediately, then notifies the backend on a best-effort basis.
   * Never errors: a failed network call must not keep the user signed in.
   */
  logout(): Observable<void> {
    const token = this._token();
    this.clearSession();
    if (!token) return of(undefined);

    return this.http
      .post(`${this.authUrl}/logout`, {}, { headers: { Authorization: `Bearer ${token}` } })
      .pipe(
        map(() => undefined),
        catchError(() => of(undefined)),
      );
  }

  /** Removes the stored session and resets the signals. */
  clearSession(): void {
    writeStorage(TOKEN_KEY, null);
    writeStorage(USER_KEY, null);
    this._token.set(null);
    this._currentUser.set(null);
  }

  private setSession(token: string, user: AuthUser): void {
    writeStorage(TOKEN_KEY, token);
    writeStorage(USER_KEY, JSON.stringify(user));
    this._token.set(token);
    this._currentUser.set(user);
  }
}
