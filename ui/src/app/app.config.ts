import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { routes } from './app.routes';
import { provideNzI18n, en_US } from 'ng-zorro-antd/i18n';
import { registerLocaleData } from '@angular/common';
import en from '@angular/common/locales/en';
import { jwtInterceptor } from './interceptors/jwt-interceptor';
import { provideNzIcons } from 'ng-zorro-antd/icon';
import { CheckCircleOutline, ClockCircleOutline, CloseCircleOutline, LockOutline, UserOutline } from '@ant-design/icons-angular/icons';

registerLocaleData(en);

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(withFetch(), withInterceptors([jwtInterceptor])),
    provideAnimationsAsync(),
    provideNzI18n(en_US),
    provideNzIcons([UserOutline, LockOutline, CheckCircleOutline, ClockCircleOutline, CloseCircleOutline]),
  ]
};

