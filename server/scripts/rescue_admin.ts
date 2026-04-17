import { drizzle } from "drizzle-orm/mysql2";
import { users } from "../../drizzle/schema";
import "dotenv/config";
import { eq } from "drizzle-orm";

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL not found in .env");
    process.exit(1);
  }

  const db = drizzle(process.env.DATABASE_URL);
  
  console.log("--- Current Users in Database ---");
  const allUsers = await db.select().from(users);
  allUsers.forEach(u => {
    console.log(`- ID: ${u.id} | Email: ${u.email} | Role: ${u.role} | Password: ${u.password}`);
  });

  const targetEmail = process.argv[2];
  const newPassword = process.argv[3];

  if (targetEmail && newPassword) {
    console.log(`\nUpdating password for ${targetEmail}...`);
    await db.update(users)
      .set({ password: newPassword, role: 'admin' })
      .where(eq(users.email, targetEmail));
    console.log("Update successful!");
  } else {
    console.log("\nUsage: npx tsx server/scripts/rescue_admin.ts <email> <new_password>");
  }
}

main().catch(console.error);
