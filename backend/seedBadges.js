const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const connectDB = require("./config/db");
const Badge = require("./models/Badge");

const DEFAULT_BADGES = [
  // ── Contribution ────────────────────────────────────────────────────────────
  { slug: "first-post", name: "First Post", description: "Published your first post", tier: "bronze", category: "contribution", icon: "pen-line", isAutomatic: false, criteria: { type: "post_count", value: 1 }, sortOrder: 1 },
  { slug: "prolific-writer", name: "Prolific Writer", description: "Published 50 posts", tier: "silver", category: "contribution", icon: "file-text", isAutomatic: false, criteria: { type: "post_count", value: 50 }, sortOrder: 2 },
  { slug: "thought-leader", name: "Thought Leader", description: "Published 200 posts", tier: "gold", category: "contribution", icon: "book-open", isAutomatic: false, criteria: { type: "post_count", value: 200 }, sortOrder: 3 },

  // ── Expertise ───────────────────────────────────────────────────────────────
  { slug: "rising-expert", name: "Rising Expert", description: "Reached 500 reputation", tier: "bronze", category: "expertise", icon: "trending-up", isAutomatic: true, criteria: { type: "reputation_threshold", value: 500 }, sortOrder: 1 },
  { slug: "specialist-badge", name: "Specialist", description: "Reached 1,000 reputation", tier: "silver", category: "expertise", icon: "shield-check", isAutomatic: true, criteria: { type: "reputation_threshold", value: 1000 }, sortOrder: 2 },
  { slug: "expert-voice", name: "Expert Voice", description: "Reached 2,500 reputation", tier: "gold", category: "expertise", icon: "mic", isAutomatic: true, criteria: { type: "reputation_threshold", value: 2500 }, sortOrder: 3 },
  { slug: "verified-authority", name: "Verified Authority", description: "Reached 10,000 reputation", tier: "diamond", category: "expertise", icon: "crown", isAutomatic: true, criteria: { type: "reputation_threshold", value: 10000 }, sortOrder: 4 },

  // ── Community ───────────────────────────────────────────────────────────────
  { slug: "community-builder", name: "Community Builder", description: "Gained 100 followers", tier: "silver", category: "community", icon: "users", isAutomatic: true, criteria: { type: "follower_count", value: 100 }, sortOrder: 1 },
  { slug: "influencer", name: "Medical Influencer", description: "Gained 500 followers", tier: "gold", category: "community", icon: "star", isAutomatic: true, criteria: { type: "follower_count", value: 500 }, sortOrder: 2 },

  // ── Milestone ───────────────────────────────────────────────────────────────
  { slug: "streak-7", name: "Weekly Warrior", description: "7-day active streak", tier: "bronze", category: "milestone", icon: "flame", isAutomatic: true, criteria: { type: "streak_days", value: 7 }, sortOrder: 1 },
  { slug: "streak-30", name: "Monthly Dedication", description: "30-day active streak", tier: "silver", category: "milestone", icon: "flame", isAutomatic: true, criteria: { type: "streak_days", value: 30 }, sortOrder: 2 },
  { slug: "streak-100", name: "Century Club", description: "100-day active streak", tier: "gold", category: "milestone", icon: "flame", isAutomatic: true, criteria: { type: "streak_days", value: 100 }, sortOrder: 3 },

  // ── Special (admin-only) ────────────────────────────────────────────────────
  { slug: "founding-member", name: "Founding Member", description: "Early adopter of the platform", tier: "platinum", category: "special", icon: "award", isAutomatic: false, criteria: { type: "manual" }, sortOrder: 1 },
  { slug: "top-contributor", name: "Top Contributor", description: "Recognized for exceptional contributions", tier: "diamond", category: "special", icon: "trophy", isAutomatic: false, criteria: { type: "manual" }, sortOrder: 2 },
  { slug: "research-pioneer", name: "Research Pioneer", description: "Outstanding research contributions", tier: "platinum", category: "special", icon: "microscope", isAutomatic: false, criteria: { type: "manual" }, sortOrder: 3 },
  { slug: "community-mentor", name: "Community Mentor", description: "Dedicated to mentoring others", tier: "gold", category: "special", icon: "heart-handshake", isAutomatic: false, criteria: { type: "manual" }, sortOrder: 4 },
];

const seedBadges = async () => {
  await connectDB();

  console.log("Seeding badges...");

  for (const badge of DEFAULT_BADGES) {
    await Badge.findOneAndUpdate(
      { slug: badge.slug },
      { $set: badge },
      { upsert: true, new: true }
    );
    console.log(`  ✓ ${badge.name}`);
  }

  console.log(`\nSeeded ${DEFAULT_BADGES.length} badges successfully.`);
  process.exit(0);
};

seedBadges().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
