// Creates the initial "owner" account from the .env values, if it doesn't
// already exist. Run once: `npm run seed`
require("dotenv").config();
const connectDB = require("./config/db");
const User = require("./models/User");

(async () => {
  await connectDB();

  const username = (process.env.OWNER_USERNAME || "owner").toLowerCase();
  const existing = await User.findOne({ username });

  if (existing) {
    console.log(`Owner account "${username}" already exists — nothing to do.`);
  } else {
    await User.create({
      name: process.env.OWNER_NAME || "Owner",
      username,
      password: process.env.OWNER_PASSWORD || "changeme123",
      role: "owner",
    });
    console.log(`Owner account created — username: "${username}"`);
    console.log("Log in with that username and the OWNER_PASSWORD from your .env file.");
    console.log("Please change the password after your first login.");
  }

  process.exit(0);
})();
