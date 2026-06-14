import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const chars = await prisma.$queryRaw`
    SELECT 
      p.id as planet_id,
      p.title,
      p.opening_message,
      pc.name,
      pc.bio,
      pc.era,
      pc.location,
      pc.voice_profile,
      pc.teaching_goal
    FROM planet_characters pc
    JOIN planets p ON p.id = pc.planet_id
    WHERE pc.is_approved = true
    ORDER BY p.title
  ` as any[];
  console.log(JSON.stringify(chars, null, 2));
}
main().finally(() => prisma.$disconnect());
