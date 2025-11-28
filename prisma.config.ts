import { defineConfig, env } from "prisma/config";
import 'dotenv/config'

let connectionString
if (process.env.ENVIRONMENT == 'local') {
  connectionString = process.env.LOCAL_DATABASE_URL
}
else if (process.env.ENVIRONMENT == 'dev') {
  connectionString = process.env.DEV_DATABASE_URL
}
else {
  connectionString = process.env.PRODUCTION_DATABASE_URL
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "ts-node prisma/seed.ts",
  },
  datasource: {
    url: connectionString,
  },
});
