import { TestBed } from '@angular/core/testing';
import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpResponse } from '@angular/common/http';
import { of } from 'rxjs';
import { jwtInterceptor } from './jwt-interceptor';
import { AuthenticationService } from '../services/authentication';

describe('jwtInterceptor', () => {
  const interceptor: HttpInterceptorFn = (req, next) =>
    TestBed.runInInjectionContext(() => jwtInterceptor(req, next));

  let authServiceSpy: jasmine.SpyObj<AuthenticationService>;

  beforeEach(() => {
    authServiceSpy = jasmine.createSpyObj('AuthenticationService', ['getToken']);

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthenticationService, useValue: authServiceSpy }
      ]
    });
  });

  it('should be created', () => {
    expect(interceptor).toBeTruthy();
  });

  it('should attach Bearer token to requests when token exists', (done) => {
    authServiceSpy.getToken.and.returnValue('mock-token-123');
    const request = new HttpRequest('GET', '/api/inventory');
    const next: HttpHandlerFn = (req) => {
      expect(req.headers.get('Authorization')).toBe('Bearer mock-token-123');
      return of(new HttpResponse({ status: 200 }));
    };

    interceptor(request, next).subscribe({
      next: () => done(),
      error: done.fail
    });
  });

  it('should not attach Authorization header for login requests', (done) => {
    authServiceSpy.getToken.and.returnValue('mock-token-123');
    const request = new HttpRequest('POST', '/api/auth/login');
    const next: HttpHandlerFn = (req) => {
      expect(req.headers.has('Authorization')).toBeFalse();
      return of(new HttpResponse({ status: 200 }));
    };

    interceptor(request, next).subscribe({
      next: () => done(),
      error: done.fail
    });
  });

  it('should forward request unchanged when no token exists', (done) => {
    authServiceSpy.getToken.and.returnValue(null);
    const request = new HttpRequest('GET', '/api/inventory');
    const next: HttpHandlerFn = (req) => {
      expect(req.headers.has('Authorization')).toBeFalse();
      return of(new HttpResponse({ status: 200 }));
    };

    interceptor(request, next).subscribe({
      next: () => done(),
      error: done.fail
    });
  });
});
