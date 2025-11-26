import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

const connectionString = `${process.env.DATABASE_URL}`;

const adapter = new PrismaPg({ connectionString });
const prismaOptions = { adapter };
const prisma = new PrismaClient(prismaOptions);

export { prisma, prismaOptions };
