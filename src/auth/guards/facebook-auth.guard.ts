import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class FacebookAuthGuard extends AuthGuard('facebook') {
  private readonly logger = new Logger(FacebookAuthGuard.name);

  getAuthenticateOptions() {
    return { failWithError: true, scope: ['email'] };
  }

  handleRequest(err: any, user: any, info: any) {
    if (err || !user) {
      const message =
        info?.message || info?.toString() || 'Facebook authentication failed';
      this.logger.error('Facebook auth error', err?.stack || message, { info });
      throw new UnauthorizedException(err.message);
    }
    return user;
  }
}
