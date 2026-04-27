/**
 * Reset script for Orbiter.
 *
 * Wipes all documents from every collection (preserving schemas/indexes)
 * and seeds a single admin user. Use this to start fresh while keeping
 * the database structure in place.
 *
 * Usage: npx tsx scripts/reset.ts
 */

import mongoose from 'mongoose';
import { hash } from 'bcryptjs';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '..', '.env.local') });

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error('MONGODB_URI not found in .env.local');
  process.exit(1);
}

const ADMIN_EMAIL = 'admin@agiready.io';
const ADMIN_PASSWORD = 'OrbiterTest1!';

async function reset() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(MONGODB_URI!);
  console.log('Connected.\n');

  const db = mongoose.connection.db;
  if (!db) throw new Error('No db handle on mongoose connection');

  const collections = await db.listCollections().toArray();
  if (collections.length === 0) {
    console.log('No collections found — nothing to clear.');
  } else {
    console.log(`Clearing ${collections.length} collection(s):`);
    for (const { name } of collections) {
      const result = await db.collection(name).deleteMany({});
      console.log(`  - ${name}: ${result.deletedCount} document(s) removed`);
    }
  }

  console.log(`\nCreating admin user (${ADMIN_EMAIL})...`);
  const hashedPassword = await hash(ADMIN_PASSWORD, 10);
  // Set lastLoginAt so the user.service computes inviteStatus = 'active'
  // and the admin immediately appears in team/assignee dropdowns without
  // needing to first log in to flip their status.
  const now = new Date();
  await db.collection('users').insertOne({
    name: 'Admin',
    email: ADMIN_EMAIL,
    password: hashedPassword,
    role: 'admin',
    skills: [],
    isActive: true,
    lastLoginAt: now,
    notificationPreferences: { emailDigest: 'immediate' },
    createdAt: now,
    updatedAt: now,
  });
  console.log('Admin user created.');

  console.log('\n────────────────────────────────────────');
  console.log('Reset complete.');
  console.log(`  Login: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
  console.log('────────────────────────────────────────\n');
}

reset()
  .catch((err) => {
    console.error('Reset failed:', err);
    process.exit(1);
  })
  .finally(() => {
    mongoose.disconnect();
  });
