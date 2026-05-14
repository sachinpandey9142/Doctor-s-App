const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const User = require("./models/User");
const Post = require("./models/Post");
const Comment = require("./models/Comment");

// Healthcare avatar URLs
const DOCTOR_AVATARS = [
  "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&q=80",
  "https://images.unsplash.com/photo-1594824436998-d784a0d8c0b5?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&q=80",
  "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&q=80",
  "https://images.unsplash.com/photo-1622253692010-333f2da6031d?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&q=80",
  "https://images.unsplash.com/photo-1537368910025-700350fe46c7?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&q=80",
  "https://images.unsplash.com/photo-1651008376811-b90baee60c1f?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&q=80",
  "https://images.unsplash.com/photo-1594824410940-272e5077227d?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&q=80",
  "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&q=80",
  "https://images.unsplash.com/photo-1537368910025-700350fe46c7?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&q=80",
];

// Healthcare cover URLs
const COVER_IMAGES = [
  "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80", // Hospital hallway
  "https://images.unsplash.com/photo-1584362917165-526a968579e8?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80", // Scan
  "https://images.unsplash.com/photo-1551076805-e1869033e561?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80", // Conference
  "https://images.unsplash.com/photo-1516549655169-df83a0774514?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80", // Lab
];

// Realistic Post Images
const POST_IMAGES = [
  "https://images.unsplash.com/photo-1530497610245-94d3c16cda28?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80", // Surgery
  "https://images.unsplash.com/photo-1579684385127-1ef15d508118?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80", // Op Theatre
  "https://images.unsplash.com/photo-1516549655169-df83a0774514?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80", // Lab
  "https://images.unsplash.com/photo-1576091160550-2173dba999ef?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80", // Clinical setting
  "https://images.unsplash.com/photo-1581594693702-fbdc51b2763b?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80", // XRay
  "https://images.unsplash.com/photo-1551190822-a9333d87dfb1?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80", // Consultation
];

const minutes = (value) => value * 60 * 1000;
const hours = (value) => minutes(value * 60);
const days = (value) => hours(value * 24);

const timestampFromOffset = (offsetMs) => new Date(Date.now() - offsetMs);

const pickRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];

const pickUniqueUsers = (users, count, excludedIds = []) => {
  const excluded = new Set(excludedIds.map((id) => String(id)));
  const pool = users.filter((user) => !excluded.has(String(user._id)));
  const next = [];
  const available = [...pool];

  while (available.length > 0 && next.length < count) {
    const index = Math.floor(Math.random() * available.length);
    next.push(available.splice(index, 1)[0]);
  }

  return next;
};

const pickUserByRoles = (users, roles, excludedIds = []) => {
  const excluded = new Set(excludedIds.map((id) => String(id)));
  const pool = users.filter(
    (user) => roles.includes(user.role) && !excluded.has(String(user._id)),
  );

  return pool.length > 0 ? pickRandom(pool) : pickRandom(users);
};

const buildReactionMap = (users, reactionSpec = {}, excludedIds = []) => {
  const usedIds = new Set(excludedIds.map((id) => String(id)));
  const reactions = {};

  Object.entries(reactionSpec).forEach(([reactionKey, count]) => {
    const picked = pickUniqueUsers(users, count, Array.from(usedIds));
    if (picked.length > 0) {
      reactions[reactionKey] = picked.map((user) => user._id);
      picked.forEach((user) => usedIds.add(String(user._id)));
    }
  });

  return reactions;
};

const assignTimestamp = async (Model, documentId, createdAt) => {
  await Model.updateOne(
    { _id: documentId },
    { $set: { createdAt, updatedAt: createdAt } },
  );
};

const USERS_DATA = [
  { name: "Dr. Emily Carter", role: "doctor", spec: "General Surgery", hosp: "St. Jude's Hospital", exp: 12 },
  { name: "Dr. Ahmed Rahman", role: "doctor", spec: "Cardiology", hosp: "Heart & Vascular Inst.", exp: 15 },
  { name: "Sarah Chen, RN", role: "nurse", spec: "ICU", hosp: "City General", exp: 8 },
  { name: "Dr. Priya Menon", role: "doctor", spec: "Radiology", hosp: "Central Imaging", exp: 10 },
  { name: "Michael Torres, MD", role: "doctor", spec: "Emergency Medicine", hosp: "Metro Health", exp: 9 },
  { name: "NeuroResident_21", role: "medical-student", spec: "Neurology", hosp: "University Hospital", exp: 3 },
  { name: "Dr. James Wilson", role: "doctor", spec: "Oncology", hosp: "Hope Cancer Center", exp: 20 },
  { name: "Anita Desai, NP", role: "nurse", spec: "Pediatrics", hosp: "Children's Hospital", exp: 11 },
  { name: "Dr. Sofia Rossi", role: "doctor", spec: "Dermatology", hosp: "Skin Clinic", exp: 7 },
  { name: "Kevin Park, PA", role: "doctor", spec: "Orthopedics", hosp: "Sports Med Center", exp: 6 },
  { name: "Dr. Elena Gilbert", role: "doctor", spec: "Pathology", hosp: "Central Lab", exp: 14 },
  { name: "Resident_Sky", role: "medical-student", spec: "Internal Medicine", hosp: "General Hospital", exp: 2 },
  { name: "Nurse_Betty", role: "nurse", spec: "Maternity", hosp: "Woman's Hospital", exp: 18 },
  { name: "Dr. Liam O'Connor", role: "doctor", spec: "Psychiatry", hosp: "Mind Care", exp: 13 },
  { name: "Dr. Zara Khan", role: "doctor", spec: "Endocrinology", hosp: "Diabetic Care", exp: 10 },
];

const POST_BLUEPRINTS = [
  {
    key: "complex_surgery",
    type: "image",
    content: "Just completed a challenging 10-hour resection. The anatomy was quite distorted by previous radiation, but we managed a clean margin. Grateful for an incredible OR team today. 🙌",
    mediaUrl: POST_IMAGES[0],
    age: hours(5),
    likesRange: [15, 45],
    commentSets: [
      [
        {
          authorRoles: ["doctor"],
          text: "Excellent exposure on this approach 👏 How did you handle the vascular adherence?",
          offset: hours(4),
          likesRange: [5, 12],
          replies: [
            {
              authorRoles: ["doctor"],
              text: "We had to do a sharp dissection along the adventitia. Very tedious but necessary.",
              offset: hours(3),
              likesRange: [2, 5],
            },
            {
              authorRoles: ["medical-student"],
              text: "This is incredible. Was a bypass on standby just in case?",
              offset: hours(2),
              likesRange: [1, 2],
            }
          ]
        },
        {
          authorRoles: ["nurse"],
          text: "Very clean instrumentation setup. The OR workflow looks like it was on point.",
          offset: hours(4) + minutes(30),
          likesRange: [3, 8],
        },
        {
          authorRoles: ["doctor"],
          text: "Resection in a radiated field is no joke. Well done.",
          offset: hours(1),
          likesRange: [4, 10],
        }
      ]
    ]
  },
  {
    key: "radiology_catch",
    type: "image",
    content: "Interesting contrast pattern on this MRI. Initially thought it was a simple cyst, but the enhancement profile suggests something more aggressive. Sending for biopsy tomorrow. 🔬",
    mediaUrl: POST_IMAGES[4],
    age: hours(18),
    likesRange: [10, 30],
    commentSets: [
      [
        {
          authorRoles: ["doctor"],
          text: "Interesting contrast pattern here. Did you check the T2 signal for any solid components?",
          offset: hours(16),
          likesRange: [4, 9],
          replies: [
            {
              authorRoles: ["doctor"],
              text: "Yes, there was a subtle T2 hypointense rim that tipped me off.",
              offset: hours(15),
              likesRange: [2, 4],
            }
          ]
        },
        {
          authorRoles: ["medical-student"],
          text: "Great catch. I probably would have missed that enhancement in the early phase.",
          offset: hours(14),
          likesRange: [1, 3],
        },
        {
          authorRoles: ["doctor"],
          text: "Did pathology confirm the findings yet?",
          offset: hours(2),
          likesRange: [2, 5],
          replies: [
            {
              authorRoles: ["doctor"],
              text: "Not yet, expecting results by Thursday.",
              offset: minutes(45),
              likesRange: [1, 2],
            }
          ]
        }
      ]
    ]
  },
  {
    key: "stroke_case",
    type: "case",
    content: "45yo male presenting with sudden onset weakness in left arm and slurred speech. Administered tPA within the 3-hour window. Door-to-needle time: 42 minutes.",
    symptoms: "Left-sided hemiparesis, facial droop, expressive aphasia.",
    observations: "NIHSS 14, BP 175/95, CT Head negative for hemorrhage.",
    age: days(1) + hours(4),
    likesRange: [20, 50],
    commentSets: [
      [
        {
          authorRoles: ["doctor"],
          text: "42 mins door-to-needle is impressive! That's going to save a lot of penumbra.",
          offset: days(1) + hours(2),
          likesRange: [8, 15],
          reactionSpec: { insightful: 2 }
        },
        {
          authorRoles: ["nurse"],
          text: "That kind of door-to-needle timing makes a real difference 👏 Our team is aiming for sub-45 this quarter.",
          offset: days(1) + hours(1),
          likesRange: [5, 10],
        },
        {
          authorRoles: ["doctor"],
          text: "Was CTA done to rule out an LVO before thrombolysis?",
          offset: hours(22),
          likesRange: [3, 7],
          replies: [
            {
              authorRoles: ["doctor"],
              text: "We did it concurrently. Confirmed M1 occlusion, patient is currently in IR for thrombectomy.",
              offset: hours(21),
              likesRange: [4, 8],
            }
          ]
        }
      ]
    ]
  },
  {
    key: "pathology_slide",
    type: "image",
    content: "Fascinating pathology slides today from a rare case of amyloidosis. The Congo red stain under polarized light never ceases to amaze me. #pathology",
    mediaUrl: POST_IMAGES[2],
    age: days(2),
    likesRange: [12, 28],
    commentSets: [
      [
        {
          authorRoles: ["lab-technician", "doctor"],
          text: "Congo red under polarized light never gets old. The apple-green birefringence is textbook perfect here.",
          offset: days(1) + hours(20),
          likesRange: [6, 11],
        },
        {
          authorRoles: ["doctor"],
          text: "Was there any cardiac involvement on the workup?",
          offset: days(1) + hours(18),
          likesRange: [3, 6],
          replies: [
            {
              authorRoles: ["doctor"],
              text: "Echo showed increased wall thickness, so we are suspecting systemic involvement.",
              offset: days(1) + hours(16),
              likesRange: [2, 5],
            }
          ]
        },
        {
          authorRoles: ["medical-student"],
          text: "Beautifully handled 👏 Would love to see more rare slides like this.",
          offset: hours(12),
          likesRange: [1, 4],
        }
      ]
    ]
  },
  {
    key: "research_paper",
    type: "text",
    content: "Just published our meta-analysis on SGLT2 inhibitors in non-diabetic heart failure patients. The results are even more promising than we expected. Full paper in the comments!",
    age: days(3),
    likesRange: [30, 80],
    commentSets: [
      [
        {
          authorRoles: ["doctor"],
          text: "Would love to read the full paper. This is a game changer for HFpEF management.",
          offset: days(2) + hours(22),
          likesRange: [12, 25],
          reactionSpec: { research: 3 }
        },
        {
          authorRoles: ["doctor"],
          text: "What was the sample size for the meta-analysis?",
          offset: days(2) + hours(20),
          likesRange: [5, 12],
          replies: [
            {
              authorRoles: ["doctor"],
              text: "We pooled data from 5 major trials, total n=12,450.",
              offset: days(2) + hours(19),
              likesRange: [4, 9],
            }
          ]
        },
        {
          authorRoles: ["medical-student"],
          text: "Promising results honestly. How does this compare to the EMPEROR-Preserved findings?",
          offset: days(1),
          likesRange: [2, 6],
        }
      ]
    ]
  },
  {
    key: "emergency_care",
    type: "image",
    content: "A busy night in the ER. Multiple trauma arrivals simultaneously, but the team coordination was flawless. Proud of this crew. 🏥⚡",
    mediaUrl: POST_IMAGES[3],
    age: hours(2),
    likesRange: [25, 60],
    commentSets: [
      [
        {
          authorRoles: ["nurse"],
          text: "You guys are rockstars. Stay safe out there!",
          offset: hours(1) + minutes(45),
          likesRange: [8, 18],
        },
        {
          authorRoles: ["doctor"],
          text: "The coordination in high-stress situations is what makes or breaks patient outcomes. Great work.",
          offset: hours(1) + minutes(20),
          likesRange: [5, 12],
        },
        {
          authorRoles: ["doctor"],
          text: "That setup looks incredible. How many bays were occupied?",
          offset: minutes(30),
          likesRange: [3, 7],
          replies: [
            {
              authorRoles: ["doctor"],
              text: "All 12 major bays and we had to overflow into the fast-track area temporarily.",
              offset: minutes(15),
              likesRange: [2, 5],
            }
          ]
        }
      ]
    ]
  },
  {
    key: "hospital_infrastructure",
    type: "image",
    content: "The new robotic surgery suite is finally ready for its first case! Excited to see how the new Da Vinci Xi performs. 🤖🔪",
    mediaUrl: POST_IMAGES[1],
    age: hours(10),
    likesRange: [18, 40],
    commentSets: [
      [
        {
          authorRoles: ["doctor"],
          text: "That docking setup looks tight. Much better than the older models.",
          offset: hours(8),
          likesRange: [5, 10],
        },
        {
          authorRoles: ["nurse"],
          text: "The turnover workflow is going to be so much faster with this layout.",
          offset: hours(7),
          likesRange: [4, 9],
        },
        {
          authorRoles: ["doctor"],
          text: "Beautiful case. Would love to know the follow-up outcome on the first patient.",
          offset: hours(2),
          likesRange: [2, 5],
        }
      ]
    ]
  },
  {
    key: "medical_student_life",
    type: "text",
    content: "Day 14 of the internal medicine rotation. I think I've forgotten what sunlight looks like. But hey, I finally got a sub-centimeter lung nodule right on the X-ray! Small wins. ☕️📚",
    age: hours(12),
    likesRange: [10, 25],
    commentSets: [
      [
        {
          authorRoles: ["doctor"],
          text: "Small wins are the only way to survive residency. Hang in there!",
          offset: hours(10),
          likesRange: [5, 10],
          replies: [
            {
              authorRoles: ["medical-student"],
              text: "Thanks! Just trying to stay caffeinated.",
              offset: hours(9),
              likesRange: [2, 4],
            }
          ]
        },
        {
          authorRoles: ["nurse"],
          text: "We see you! The interns this year are doing great. Don't forget to eat lunch once in a while.",
          offset: hours(8),
          likesRange: [3, 7],
        }
      ]
    ]
  },
  {
    key: "orthopedic_update",
    type: "image",
    content: "New approach for total hip arthroplasty today. Minimal soft tissue disruption and the patient was already mobilizing 4 hours post-op. Technology is amazing. 🦴✨",
    mediaUrl: POST_IMAGES[0],
    age: days(1),
    likesRange: [20, 45],
    commentSets: [
      [
        {
          authorRoles: ["doctor"],
          text: "Anterior approach? The recovery times are getting incredible.",
          offset: hours(20),
          likesRange: [6, 12],
          replies: [
            {
              authorRoles: ["doctor"],
              text: "Yes, anterior. The learning curve was steep but definitely worth it.",
              offset: hours(18),
              likesRange: [4, 8],
            }
          ]
        },
        {
          authorRoles: ["doctor"],
          text: "What was the blood loss like on this one?",
          offset: hours(16),
          likesRange: [2, 5],
        }
      ]
    ]
  }
];

const createSeedComment = async ({
  post,
  author,
  text,
  parentCommentId = null,
  createdAt,
  likesCount = 0,
  reactionSpec = {},
  excludedUserIds = [],
  replyCount = 0,
}) => {
  const excludedIds = [author._id, ...(excludedUserIds || [])];
  const likes = pickUniqueUsers(createdUsersCache, likesCount, excludedIds).map(
    (user) => user._id,
  );
  const reactions = buildReactionMap(createdUsersCache, reactionSpec, [
    ...excludedIds,
    ...likes,
  ]);

  const comment = await Comment.create({
    postId: post._id,
    userId: author._id,
    text,
    parentCommentId,
    replyCount,
    likes,
    reactions,
  });

  await assignTimestamp(Comment, comment._id, createdAt);
  return comment;
};

let createdUsersCache = [];

const seedThreadedCommentsForPost = async (post, blueprint, variantIndex) => {
  const variant =
    blueprint.commentSets[variantIndex % blueprint.commentSets.length];
  let totalComments = 0;

  for (const thread of variant) {
    const rootAuthor = pickUserByRoles(
      createdUsersCache,
      thread.authorRoles,
      [],
    );

    const rootComment = await createSeedComment({
      post,
      author: rootAuthor,
      text: thread.text,
      createdAt: timestampFromOffset(thread.offset),
      likesCount: pickRandom(thread.likesRange ?? [0, 0]),
      reactionSpec: thread.reactionSpec,
      replyCount: thread.replies?.length ?? 0,
    });

    totalComments += 1;

    for (const reply of thread.replies ?? []) {
      const replyAuthor = pickUserByRoles(
        createdUsersCache,
        reply.authorRoles,
        [rootAuthor._id],
      );

      await createSeedComment({
        post,
        author: replyAuthor,
        text: reply.text,
        parentCommentId: rootComment._id,
        createdAt: timestampFromOffset(reply.offset),
        likesCount: pickRandom(reply.likesRange ?? [0, 0]),
        reactionSpec: reply.reactionSpec,
        excludedUserIds: [rootAuthor._id],
      });
      totalComments += 1;
    }
  }

  return totalComments;
};

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
    await Comment.deleteMany({});
    await User.deleteMany({ role: { $ne: "admin" } });

    console.log("Generating realistic healthcare users...");
    const hashedPassword = await bcrypt.hash("Password@123", 10);

    const createdUsers = [];
    for (let i = 0; i < USERS_DATA.length; i++) {
      const u = USERS_DATA[i];
      const user = await User.create({
        name: u.name,
        email: `user${i}@example.com`,
        password: hashedPassword,
        role: u.role,
        specialization: u.spec,
        hospital: u.hosp,
        experience: u.exp,
        isVerified: true,
        reputationScore: Math.floor(Math.random() * 800) + 200,
        profileImage: DOCTOR_AVATARS[i % DOCTOR_AVATARS.length],
        coverImage: getRandom(COVER_IMAGES),
        isBlocked: false,
      });
      createdUsers.push(user);
    }

    createdUsersCache = createdUsers;

    console.log("Generating realistic posts...");

    for (let i = 0; i < 20; i++) {
      const author = getRandom(createdUsers);
      const blueprint = getRandom(POST_BLUEPRINTS);
      const variantIndex = i % blueprint.commentSets.length;

      const post = await Post.create({
        userId: author._id,
        content: blueprint.content,
        type: blueprint.type,
        mediaUrl: blueprint.mediaUrl || "",
        symptoms: blueprint.symptoms || "",
        observations: blueprint.observations || "",
        reportImages: blueprint.reportImages || [],
        likes: pickUniqueUsers(createdUsers, pickRandom(blueprint.likesRange), [
          author._id,
        ]).map((user) => user._id),
        commentCount: 0,
        isAnonymous: false,
      });

      // Add variation if it's a repeated blueprint
      if (i >= POST_BLUEPRINTS.length) {
         post.content += " (Follow up on previous case)";
      }

      await assignTimestamp(Post, post._id, timestampFromOffset(blueprint.age + (i * hours(1))));

      const totalComments = await seedThreadedCommentsForPost(
        post,
        blueprint,
        variantIndex,
      );

      post.commentCount = totalComments;
      await post.save();
    }

    console.log("Database seeded successfully with healthcare content!");
  } catch (error) {
    console.error("Seeder failed:", error);
  } finally {
    await mongoose.connection.close();
  }
};

seedHealthcareData();
