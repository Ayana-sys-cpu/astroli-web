import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
const uid = 'b4d52301-d8c7-4b00-a419-f3682021ef24';
async function main() {
  const deleted = await prisma.$executeRaw`DELETE FROM messages WHERE student_id = ${uid}::uuid`;
  console.log('Deleted messages:', deleted);
}
main().finally(() => prisma.$disconnect());
