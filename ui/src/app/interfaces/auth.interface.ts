/**
 * Authentication and authorization related interfaces
 */

export interface LoginCredentials {
  username: string;
  password: string;
}

export type UserRole = 'accountant' | 'inventory_specialist' | 'customer';

export interface AuthUser {
  id: string | number;
  username: string;
  role: UserRole;
}

export interface LoginResponse {
  message: string;
  token: string;
  user: AuthUser;
}

export interface LogoutResponse {
  message: string;
}
