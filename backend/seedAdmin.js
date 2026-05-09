require("dotenv").config();

const bcrypt = require("bcrypt");
const mongoose = require("mongoose");

const connectDB = require("./config/db");
const User = require("./models/User");

const ADMIN_EMAIL = "admin@doctorsapp.com";
const ADMIN_PASSWORD = "Admin@123";

const seedAdmin = async () => {
  try {
    await connectDB();

    const normalizedEmail = ADMIN_EMAIL.toLowerCase().trim();
    const existingAdmin = await User.findOne({
      email: normalizedEmail,
      role: "admin"
    }).select("+password");

    if (existingAdmin) {
      const passwordCompatible = await bcrypt.compare(ADMIN_PASSWORD, existingAdmin.password);

      console.log("Admin already exists");
      console.log(`Email: ${existingAdmin.email}`);
      console.log(`Role: ${existingAdmin.role}`);
      console.log(`MongoDB ID: ${existingAdmin._id}`);
      console.log(`Login compatibility: ${passwordCompatible ? "verified" : "password mismatch"}`);
      return;
    }

    const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 12);

    const createdAdmin = await User.create({
      name: "Doctor's App Admin",
      email: normalizedEmail,
      password: hashedPassword,
      role: "admin",
      specialization: "",
      hospital: "",
      experience: 0,
      isVerified: true,
      reputationScore: 0,
      profileImage: ""
    });

    const createdAdminWithPassword = await User.findById(createdAdmin._id).select("+password");
    const passwordCompatible = await bcrypt.compare(ADMIN_PASSWORD, createdAdminWithPassword.password);

    console.log("Admin seeded successfully");
    console.log(`Email: ${ADMIN_EMAIL}`);
    console.log(`Password: ${ADMIN_PASSWORD}`);
    console.log("Role: admin");
    console.log(`MongoDB ID: ${createdAdmin._id}`);
    console.log(`Login compatibility: ${passwordCompatible ? "verified" : "failed"}`);
  } catch (error) {
    console.error("Failed to seed admin:", error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.connection.close();
  }
};

seedAdmin();