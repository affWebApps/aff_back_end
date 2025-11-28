import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

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

// console.log('connect in prisma.ts is', connectionString)


const adapter = new PrismaPg({ connectionString });
const prismaOptions = { adapter };
const prisma = new PrismaClient(prismaOptions);

export { prisma, prismaOptions };
