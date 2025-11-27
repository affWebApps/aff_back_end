import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class GoogleAuthGuard extends AuthGuard('google') {
  private readonly logger = new Logger(GoogleAuthGuard.name);

  getAuthenticateOptions() {
    return { failWithError: true, scope: ['profile', 'email'] };
  }

  handleRequest(err: any, user: any, info: any) {
    if (err || !user) {
      const message =
        info?.message || info?.toString() || 'Google authentication failed, the code might have expired or is invalid';
      this.logger.error('Google auth error', err?.stack || message, { info });
      throw new UnauthorizedException(message);
    }
    return user;
  }
}
