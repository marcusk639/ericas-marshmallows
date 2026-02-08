/**
 * Script to seed quick pick messages to Firestore
 * Run with: npm run seed-quick-picks
 */

import * as admin from "firebase-admin";

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(
      require("../../shared/firebase-private-key.json"),
    ),
  });
}

const db = admin.firestore();

const QUICK_PICKS = [
  { message: "Thinking of you", emoji: "💭", category: "sweet", order: 1 },
  { message: "I love you", emoji: "❤️", category: "loving", order: 2 },
  { message: "Miss you", emoji: "🥺", category: "sweet", order: 3 },
  { message: "You're amazing", emoji: "✨", category: "loving", order: 4 },
  {
    message: "Can't wait to see you",
    emoji: "😍",
    category: "playful",
    order: 5,
  },
  { message: "You make me smile", emoji: "😊", category: "sweet", order: 6 },
  { message: "Grateful for you", emoji: "🙏", category: "loving", order: 7 },
  { message: "You're my favorite", emoji: "💖", category: "playful", order: 8 },
  { message: "Sending you a hug", emoji: "🤗", category: "sweet", order: 9 },
  { message: "You're beautiful", emoji: "🌸", category: "loving", order: 10 },
];

async function seedQuickPicks() {
  console.log("Seeding quick picks to Firestore...");

  const batch = db.batch();
  const quickPicksRef = db.collection("quickPicks");

  QUICK_PICKS.forEach((pick) => {
    const docRef = quickPicksRef.doc();
    batch.set(docRef, {
      ...pick,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  });

  await batch.commit();
  console.log(`Successfully seeded ${QUICK_PICKS.length} quick picks!`);
  process.exit(0);
}

seedQuickPicks().catch((error) => {
  console.error("Error seeding quick picks:", error);
  process.exit(1);
});
