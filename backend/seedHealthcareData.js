const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const User = require("./models/User");
const Post = require("./models/Post");

// Healthcare avatar URLs
const DOCTOR_AVATARS = [
  "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&q=80",
  "https://images.unsplash.com/photo-1594824436998-d784a0d8c0b5?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&q=80",
  "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&q=80",
  "https://images.unsplash.com/photo-1622253692010-333f2da6031d?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&q=80",
  "https://images.unsplash.com/photo-1537368910025-700350fe46c7?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&q=80",
  "https://images.unsplash.com/photo-1651008376811-b90baee60c1f?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&q=80",
];

// Healthcare cover URLs
const COVER_IMAGES = [
  "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80", // Hospital hallway
  "https://images.unsplash.com/photo-1584362917165-526a968579e8?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80", // Scan
  "https://images.unsplash.com/photo-1551076805-e1869033e561?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80", // Conference
];

// Realistic Post Images
const POST_IMAGES = [
  "https://images.unsplash.com/photo-1530497610245-94d3c16cda28?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80", // Surgery
  "https://images.unsplash.com/photo-1579684385127-1ef15d508118?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80", // Op Theatre
  "https://images.unsplash.com/photo-1516549655169-df83a0774514?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80", // Lab
  "https://images.unsplash.com/photo-1576091160550-2173dba999ef?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80", // Clinical setting
  "https://images.unsplash.com/photo-1581594693702-fbdc51b2763b?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80", // XRay
];

const connectMongo = async () => {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) throw new Error("MONGODB_URI is required to run the seeder.");
  mongoose.set("strictQuery", true);
  await mongoose.connect(mongoUri);
};

const getRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];

const seedHealthcareData = async () => {
  await connectMongo();

  try {
    console.log("Clearing old non-admin users and posts...");
    await Post.deleteMany({});
    await User.deleteMany({ role: { $ne: "admin" } });

    console.log("Generating realistic healthcare users...");
    const hashedPassword = await bcrypt.hash("Password@123", 10);
    
    const usersData = [
      { name: "Dr. Sarah Chen", role: "doctor", spec: "Neurology", hosp: "General Hospital", exp: 12 },
      { name: "Dr. Marcus Thorne", role: "doctor", spec: "Cardiology", hosp: "Heart Center", exp: 15 },
      { name: "Emily Watson", role: "nurse", spec: "ICU Specialist", hosp: "City Medical", exp: 8 },
      { name: "Dr. Ahmed Rahman", role: "doctor", spec: "Orthopedics", hosp: "Sports Clinic", exp: 10 },
      { name: "Jessica Liu", role: "lab-technician", spec: "Pathology", hosp: "Central Lab", exp: 5 },
      { name: "Dr. Elena Rostova", role: "doctor", spec: "Pediatrics", hosp: "Children's Health", exp: 9 },
    ];

    const createdUsers = [];
    for (let i = 0; i < usersData.length; i++) {
      const u = usersData[i];
      const user = await User.create({
        name: u.name,
        email: `user${i}@example.com`,
        password: hashedPassword,
        role: u.role,
        specialization: u.spec,
        hospital: u.hosp,
        experience: u.exp,
        isVerified: true,
        reputationScore: Math.floor(Math.random() * 500) + 100,
        profileImage: DOCTOR_AVATARS[i % DOCTOR_AVATARS.length],
        coverImage: getRandom(COVER_IMAGES),
        isBlocked: false,
      });
      createdUsers.push(user);
    }

    console.log("Generating realistic posts...");
    const postContents = [
      { type: "text", content: "Excited to be presenting our latest findings on minimally invasive cardiac surgery at the ACC conference next week! Let me know if anyone else is attending. 🫀" },
      { type: "image", content: "Just finished a successful 8-hour spinal fusion surgery. The new 3D mapping tools are incredibly helpful for screw placement.", mediaUrl: POST_IMAGES[0] },
      { type: "case", content: "45yo male presenting with sudden onset weakness in left arm and slurred speech. CT scan shows early ischemic changes in the right MCA territory. Administered tPA within the 3-hour window.", symptoms: "Left arm weakness, slurred speech, facial droop.", observations: "NIHSS score 12, BP 160/90, HR 88." },
      { type: "image", content: "Fascinating pathology slides today from a rare case of amyloidosis. The Congo red stain under polarized light never ceases to amaze me. #pathology", mediaUrl: POST_IMAGES[2] },
      { type: "case", content: "Unusual presentation of appendicitis in a pregnant patient (24 weeks). Diagnosis was tricky due to shifted organ positions. Went straight to laparoscopic appendectomy.", symptoms: "Right upper quadrant pain, mild fever, nausea.", observations: "Ultrasound inconclusive, MRI confirmed inflamed appendix.", reportImages: [POST_IMAGES[4]] },
      { type: "image", content: "The new surgical suites at City Medical are state-of-the-art. Setting up for the first robotics case of the day. 🤖🔪", mediaUrl: POST_IMAGES[1] },
    ];

    for (let i = 0; i < 15; i++) {
      const author = getRandom(createdUsers);
      const postTemplate = getRandom(postContents);
      
      const post = await Post.create({
        userId: author._id,
        content: postTemplate.content + (i > 5 ? ` [Variation ${i}]` : ""),
        type: postTemplate.type,
        mediaUrl: postTemplate.mediaUrl || "",
        symptoms: postTemplate.symptoms || "",
        observations: postTemplate.observations || "",
        reportImages: postTemplate.reportImages || [],
        likes: [getRandom(createdUsers)._id, getRandom(createdUsers)._id],
        commentCount: Math.floor(Math.random() * 10),
      });
    }

    console.log("Database seeded successfully with healthcare content!");
  } catch (error) {
    console.error("Seeder failed:", error);
  } finally {
    await mongoose.connection.close();
  }
};

seedHealthcareData();
