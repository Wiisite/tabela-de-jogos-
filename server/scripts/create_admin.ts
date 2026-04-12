import { drizzle } from "drizzle-orm/mysql2";
import { users } from "../drizzle/schema";
import "dotenv/config";
import { nanoid } from "nanoid";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL not found");
    return;
  }

  const db = drizzle(url);
  const email = "apefaa1998@gmail.com";
  const password = "admin_apef_2026"; // Senha temporária sugerida
  
  console.log(`Creating super admin: ${email}...`);
  
  await db.insert(users).values({
    openId: `manual_${nanoid()}`,
    name: "Super Admin",
    email: email,
    password: password,
    role: "admin",
    lastSignedIn: new Date()
  }).onDuplicateKeyUpdate({
    set: {
      password: password,
      role: "admin"
    }
  });

  console.log("Super Admin created successfully!");
  console.log(`Email: ${email}`);
  console.log(`Password: ${password}`);
  process.exit(0);
}

main().catch(console.error);
