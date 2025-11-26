import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';

describe('AppController (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/ (GET)', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect('Hello World!');
  });
});

// to test logins
// curl -H "Authorization: Bearer "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6IjZwTzlNRDJwQzJKNm1vcXcwa1ZfRyJ9.eyJpc3MiOiJodHRwczovL2Rldi0zY2g3NWk1amhtZjg1YmJ4LnVzLmF1dGgwLmNvbS8iLCJzdWIiOiJVc2dDRkJRQ21qM0ROdngyeUhPdFozcVFpSG96azVmd0BjbGllbnRzIiwiYXVkIjoiaHR0cHM6Ly9kZXYtM2NoNzVpNWpobWY4NWJieC51cy5hdXRoMC5jb20vYXBpL3YyLyIsImlhdCI6MTc2Mzc0MTY4OSwiZXhwIjoxNzYzODI4MDg5LCJndHkiOiJjbGllbnQtY3JlZGVudGlhbHMiLCJhenAiOiJVc2dDRkJRQ21qM0ROdngyeUhPdFozcVFpSG96azVmdyJ9.AbjFWgOTgDCS7e5eWKKCY-PebzKdFBvUV1eFVEFTzHlI3wf2U82VDbCALV12lqi_fipOIAYGp8GkvINlRzgPLSlIZNpeg_3NdJ5QerXmSEpyThZSZx90vSPDznmKxa35h-YTwX1nQljs50OY2MjPXqquwPMoLxPUR3GXQDnC1k3rBCrdVYVi-clfAatNZ-OlN5iIW0TzmANVVYO-DjqhkKpLULsUFOq4vAXg6llHk2gidLkrfGwAuMRv17F-XcEZjs5LbXhViqsue773EjOzIdKJ0yg3KhDGqW9tucEGBUOxHNlcTF5ngzFwptkHSF2SRAACN7qBYyb3ORUuCkNtuQ" http://localhost:3000/users/me
