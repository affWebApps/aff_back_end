import { Injectable } from '@nestjs/common';

@Injectable()
export class UsersService {
  buildProfile(authUser: any) {
    if (!authUser) {
      return null;
    }

    return {
      auth0Sub: authUser.auth0Sub ?? authUser.sub,
      email: authUser.email ?? null,
      permissions: authUser.permissions ?? [],
      roles: authUser.roles ?? [],
    };
  }
}
