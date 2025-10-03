import dotenv from "dotenv";
import { MongoClient } from "mongodb";
import bcrypt from "bcrypt";

dotenv.config();

const uri = process.env.MONGO_URI;




if (!uri) {
  throw new Error("❌ MONGO_URI environment variable not set");
}

const client = new MongoClient(uri);

async function seedAdmin() {
  try {
    await client.connect();
    const db = client.db("feedback"); // Uses the default DB from your URI
    const users = db.collection("users"); // 👈 match your existing collection name

    const existingAdmin = await users.findOne({ username: "admin" });
    if (existingAdmin) {
      console.log("✅ Admin user already exists");
      return;
    }

    const hashedPassword = await bcrypt.hash("BrumleyFeedback", 10); // default password

    await users.insertOne({
      username: "admin",
      password: hashedPassword,
      role: "admin", // 👈 we'll use this to differentiate later
    });

    console.log("✅ Admin user created");
  } catch (err) {
    console.error("❌ Error seeding admin:", err);
  } finally {
    await client.close();
  }
}

seedAdmin();
