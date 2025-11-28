import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Profile, Strategy } from 'passport-google-oauth20';
import { AuthService } from '../auth.service';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  private readonly logger = new Logger(GoogleStrategy.name);

  constructor(
    configService: ConfigService,
    private readonly authService: AuthService,
  ) {
    super({
      clientID: configService.get<string>('GOOGLE_CLIENT_ID'),
      clientSecret: configService.get<string>('GOOGLE_CLIENT_SECRET'),
      callbackURL:
        configService.get<string>('GOOGLE_CALLBACK_URL') ??
        'http://localhost:3000/v1/auth/google/callback',
      scope: ['profile', 'email'],
    });
  }

  async validate(
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
  ): Promise<any> {
    this.logger.debug('Google profile received', { profile });

    const email =
      profile.emails && profile.emails.length > 0
        ? profile.emails[0].value
        : `${profile.id}@google.local`;

    const photo_url = profile.photos && profile.photos.length > 0 ? profile.photos[0].value : ''

    const user = await this.authService.handleOAuthLogin('google', {
      email,
      firstName: profile.name?.givenName,
      lastName: profile.name?.familyName,
      providerId: profile.id,
      avatarUrl: photo_url
    });

    return user;
  }
}
