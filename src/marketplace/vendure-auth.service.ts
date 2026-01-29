import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class VendureAuthService {
  private readonly url = process.env.VENDURE_ADMIN_API || 'http://localhost:3000/admin-api';
  private readonly username = process.env.SUPERADMIN_USERNAME || 'superadmin';
  private readonly password = process.env.SUPERADMIN_PASSWORD || 'superadmin';

  constructor(private readonly http: HttpService) { }

  async getAdminToken(): Promise<string> {
    const mutation = `
      mutation ($u: String!, $p: String!) {
        authenticate(input: { native: { username: $u, password: $p } }, rememberMe: true) {
          __typename
          ... on CurrentUser { id identifier }
          ... on InvalidCredentialsError { message }
        }
      }`;

    const res = await firstValueFrom(
      this.http.post(this.url, {
        query: mutation,
        variables: { u: this.username, p: this.password },
      }),
    );

    const token = res.headers['vendure-auth-token'] as string | undefined;
    if (!token) {
      throw new Error('No vendure-auth-token header in response');
    }
    return token;
  }
}
