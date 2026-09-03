import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaClient } from "./generated/prisma/client";

const globalFormPrisma = globalThis

function createPrismaClient() {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL})
    const adapter = new PrismaPg(pool)
    return new PrismaClient({ adapter})
}

export const db = globalFormPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== "production") globalFormPrisma.prisma = db