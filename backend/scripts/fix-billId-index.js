/**
 * Migration script to fix the billId index issue
 * 
 * This script:
 * 1. Drops the existing unique index on billId
 * 2. Updates all documents with billId: null to remove the billId field
 * 3. Recreates the index with sparse: true (which only indexes documents where the field exists)
 * 
 * Run with: node scripts/fix-billId-index.js
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load env from backend root
dotenv.config({ path: resolve(__dirname, "../.env") });

const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error("❌ MONGO_URI not found in environment variables");
  process.exit(1);
}

async function fixBillIdIndex() {
  try {
    console.log("🔌 Connecting to MongoDB...");
    await mongoose.connect(MONGO_URI);
    console.log("✅ Connected to MongoDB\n");

    const db = mongoose.connection.db;
    const receiptsCollection = db.collection("receipts");

    // Step 1: List current indexes
    console.log("📋 Current indexes on receipts collection:");
    const indexes = await receiptsCollection.indexes();
    indexes.forEach((idx) => {
      console.log(`   - ${idx.name}: ${JSON.stringify(idx.key)}${idx.unique ? " (unique)" : ""}${idx.sparse ? " (sparse)" : ""}`);
    });
    console.log("");

    // Step 2: Drop the billId index if it exists
    const billIdIndex = indexes.find((idx) => idx.key && idx.key.billId !== undefined);
    if (billIdIndex) {
      console.log(`🗑️  Dropping existing index: ${billIdIndex.name}...`);
      try {
        await receiptsCollection.dropIndex(billIdIndex.name);
        console.log("✅ Index dropped successfully\n");
      } catch (dropErr) {
        if (dropErr.code === 27) {
          console.log("⚠️  Index doesn't exist, skipping drop\n");
        } else {
          throw dropErr;
        }
      }
    } else {
      console.log("ℹ️  No billId index found\n");
    }

    // Step 3: Update all documents with billId: null to remove the field
    console.log("🔄 Removing billId field from documents where billId is null...");
    const updateResult = await receiptsCollection.updateMany(
      { billId: null },
      { $unset: { billId: "" } }
    );
    console.log(`✅ Updated ${updateResult.modifiedCount} documents\n`);

    // Step 4: Recreate the index with sparse: true
    console.log("🔨 Creating new billId index (unique, sparse)...");
    await receiptsCollection.createIndex(
      { billId: 1 },
      { unique: true, sparse: true, name: "billId_1" }
    );
    console.log("✅ Index created successfully\n");

    // Step 5: Verify
    console.log("📋 Updated indexes on receipts collection:");
    const newIndexes = await receiptsCollection.indexes();
    newIndexes.forEach((idx) => {
      console.log(`   - ${idx.name}: ${JSON.stringify(idx.key)}${idx.unique ? " (unique)" : ""}${idx.sparse ? " (sparse)" : ""}`);
    });

    console.log("\n✅ Migration completed successfully!");

  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log("\n🔌 Disconnected from MongoDB");
  }
}

fixBillIdIndex();
