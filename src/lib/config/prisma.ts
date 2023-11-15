import { PrismaClient } from '@prisma/client';

declare global {
    let prismaClient: PrismaClient | undefined;
}
let prismaClient: PrismaClient | undefined;
const prisma = prismaClient || new PrismaClient();

if (process.env.NODE_ENV !== 'production') prismaClient = prisma

export default prisma