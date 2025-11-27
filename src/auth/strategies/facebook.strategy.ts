import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Profile, Strategy } from 'passport-facebook';
import { AuthService } from '../auth.service';

@Injectable()
export class FacebookStrategy extends PassportStrategy(Strategy, 'facebook') {
  private readonly logger = new Logger(FacebookStrategy.name);

  constructor(
    configService: ConfigService,
    private readonly authService: AuthService,
  ) {
    super({
      clientID: configService.get<string>('FACEBOOK_CLIENT_ID'),
      clientSecret: configService.get<string>('FACEBOOK_CLIENT_SECRET'),
      callbackURL:
        configService.get<string>('FACEBOOK_CALLBACK_URL') ??
        'http://localhost:3000/auth/facebook/callback',
      scope: ['email'],
      profileFields: ['id', 'emails', 'name'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: Profile,
  ): Promise<any> {
    const email =
      profile.emails && profile.emails.length > 0
        ? profile.emails[0].value
        : `${profile.id}@facebook.local`;

    const photo_url = profile.photos && profile.photos.length > 0 ? profile.photos[0].value : ''

    try {
      const user =
        (await this.authService.handleOAuthLogin('facebook', {
          email,
          firstName: profile.name?.givenName,
          lastName: profile.name?.familyName,
          providerId: profile.id,
          avatarUrl: photo_url
        })) ?? null;

      return user;
    } catch (error) {
      this.logger.error('Facebook auth failed', error?.stack, {
        providerId: profile.id,
        email,
      });
      throw new UnauthorizedException('Facebook authentication failed');
    }
  }
}
