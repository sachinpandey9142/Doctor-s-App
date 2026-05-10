const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const bcrypt = require("bcrypt");
const mongoose = require("mongoose");

const User = require("./models/User");

const DEFAULT_ADMIN_EMAIL = "admin@doctorsapp.com";
const DEFAULT_ADMIN_PASSWORD = "Admin@123";

const formatUser = (user) => ({
  id: String(user._id),
  email: user.email,
  role: user.role,
});

const connectMongo = async () => {
  const mongoUri = process.env.MONGODB_URI;

  if (!mongoUri) {
    throw new Error("MONGODB_URI is required to run the admin seeder.");
  }

  mongoose.set("strictQuery", true);
  await mongoose.connect(mongoUri);
};

const seedAdmin = async () => {
  await connectMongo();

  try {
    const existingAdmins = await User.find({ role: "admin" })
      .sort({ createdAt: 1 })
      .select("_id email role")
      .lean();

    if (existingAdmins.length > 0) {
      console.log("Admin already exists");
      existingAdmins.forEach((admin) => {
        console.log(`Email: ${admin.email}`);
        console.log(`Role: ${admin.role}`);
        console.log(`ID: ${admin._id}`);
        console.log("");
      });
      return;
    }

    const normalizedEmail = DEFAULT_ADMIN_EMAIL.toLowerCase().trim();
    const hashedPassword = await bcrypt.hash(DEFAULT_ADMIN_PASSWORD, 12);

    const existingUserWithEmail = await User.findOne({
      email: normalizedEmail,
    });

    let adminUser;

    if (existingUserWithEmail) {
      existingUserWithEmail.name =
        existingUserWithEmail.name?.trim() || "Admin";
      existingUserWithEmail.email = normalizedEmail;
      existingUserWithEmail.password = hashedPassword;
      existingUserWithEmail.role = "admin";
      existingUserWithEmail.isVerified = true;
      existingUserWithEmail.isBlocked = false;
      existingUserWithEmail.specialization = "";
      existingUserWithEmail.hospital = "";
      existingUserWithEmail.experience = 0;
      existingUserWithEmail.profileImage =
        existingUserWithEmail.profileImage || "";
      existingUserWithEmail.coverImage = existingUserWithEmail.coverImage || "";
      existingUserWithEmail.idDocument = existingUserWithEmail.idDocument || "";

      adminUser = await existingUserWithEmail.save();
      console.log("Existing user promoted to admin successfully");
    } else {
      adminUser = await User.create({
        name: "Admin",
        email: normalizedEmail,
        password: hashedPassword,
        role: "admin",
        specialization: "",
        hospital: "",
        experience: 0,
        isVerified: true,
        isBlocked: false,
        reputationScore: 0,
        profileImage: "",
        coverImage: "",
        idDocument: "",
      });

      console.log("Default admin created successfully");
    }

    const preview = formatUser(adminUser);
    console.log(`Email: ${preview.email}`);
    console.log(`Role: ${preview.role}`);
    console.log(`ID: ${preview.id}`);
  } finally {
    await mongoose.connection.close();
  }
};

seedAdmin().catch((error) => {
  console.error("Admin seeder failed:", error.message);
  process.exitCode = 1;
});
