import dotenv from 'dotenv';
import { connectDB, getConnectionStatus, closeDB, maskMongoUri, sanitizeMongoUri } from './services/db.js';

dotenv.config();

async function runTest() {
  console.log('\n======================================================');
  console.log('   🧪 OpsPilot AI - MongoDB Atlas Connection Tester');
  console.log('======================================================');

  const rawUri = process.env.MONGODB_URI;

  if (!rawUri) {
    console.error('❌ MONGODB_URI is not set in server/.env');
    console.log('\nAction required: Add MONGODB_URI to server/.env');
    process.exit(1);
  }

  console.log(`📌 Raw URI:      ${maskMongoUri(rawUri)}`);
  const sanitized = sanitizeMongoUri(rawUri);
  if (sanitized !== rawUri) {
    console.log(`🔧 Sanitized URI: ${maskMongoUri(sanitized)} (Auto-encoded special characters in password)`);
  }

  console.log('🔄 Attempting connection to MongoDB Atlas database "opspilot"...\n');

  const db = await connectDB();
  const status = getConnectionStatus();

  if (db && status.isConnected) {
    console.log('\n------------------------------------------------------');
    console.log('✅ TEST PASSED: Successfully connected to MongoDB Atlas!');
    console.log(`   Database: opspilot`);
    console.log(`   Cluster:  ${status.cluster}`);
    console.log('------------------------------------------------------\n');
    await closeDB();
    process.exit(0);
  } else {
    console.log('\n------------------------------------------------------');
    console.log('❌ TEST FAILED: Could not connect to MongoDB Atlas');
    console.log(`   Error:      ${status.error}`);
    console.log(`   Diagnostic: ${status.diagnostic}`);
    console.log('------------------------------------------------------\n');
    await closeDB();
    process.exit(1);
  }
}

runTest();
