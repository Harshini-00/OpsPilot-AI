import { MongoClient, ServerApiVersion } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

const DB_NAME = 'opspilot';

let client = null;
let database = null;
let connectionState = {
  isConnected: false,
  database: DB_NAME,
  cluster: null,
  error: null,
  diagnostic: null,
  lastAttempt: null
};

/**
 * Sanitizes and fixes common MongoDB URI syntax mistakes (such as unencoded '@' in password).
 */
export function sanitizeMongoUri(rawUri) {
  if (!rawUri || typeof rawUri !== 'string') return rawUri;
  try {
    const trimmed = rawUri.trim();
    const match = trimmed.match(/^(mongodb(?:\+srv)?:\/\/)(.*)$/);
    if (!match) return trimmed;

    const [, scheme, rest] = match;
    const lastAtIndex = rest.lastIndexOf('@');
    if (lastAtIndex === -1) return trimmed;

    const userPass = rest.slice(0, lastAtIndex);
    const hostPart = rest.slice(lastAtIndex + 1);
    const colonIndex = userPass.indexOf(':');
    if (colonIndex === -1) return trimmed;

    const username = userPass.slice(0, colonIndex);
    const password = userPass.slice(colonIndex + 1);

    // Decode if partially encoded to avoid double encoding, then encode cleanly
    let decodedPassword = password;
    try {
      decodedPassword = decodeURIComponent(password);
    } catch {
      decodedPassword = password;
    }
    const safePassword = encodeURIComponent(decodedPassword);

    return `${scheme}${username}:${safePassword}@${hostPart}`;
  } catch {
    return rawUri;
  }
}

/**
 * Generates a safe masked string of the URI for logging and client status (hiding password).
 */
export function maskMongoUri(uri) {
  if (!uri || typeof uri !== 'string') return 'Not Configured';
  try {
    return uri.replace(/(mongodb(?:\+srv)?:\/\/[^:]+:)([^@]+)(@.+)/, '$1******$3');
  } catch {
    return 'mongodb+srv://******';
  }
}

/**
 * Diagnoses connection error codes to give precise, actionable feedback.
 */
function diagnoseError(err, uri) {
  const msg = err?.message || String(err);

  if (msg.includes('querySrv ENOTFOUND') || msg.includes('ENOTFOUND')) {
    return {
      diagnostic: 'DNS resolution failed. The cluster hostname in MONGODB_URI does not exist.',
      actionableAdvice: 'Atlas cluster hostnames typically look like "cluster0.xxxxx.mongodb.net". If using "cluster0.mongodb.net", verify your exact cluster name from MongoDB Atlas (Database -> Connect -> Drivers).'
    };
  }

  if (msg.includes('Authentication failed') || msg.includes('bad auth')) {
    return {
      diagnostic: 'Authentication failed for the provided database user credentials.',
      actionableAdvice: 'Verify your username and password in MongoDB Atlas (Database Access -> Database Users). Ensure special characters like "@" are percent-encoded ("%40").'
    };
  }

  if (msg.includes('Server selection timed out') || msg.includes('MongoServerSelectionError')) {
    return {
      diagnostic: 'MongoDB server selection timed out.',
      actionableAdvice: 'Check MongoDB Atlas Network Access: ensure your current IP address (or 0.0.0.0/0 for anywhere) is whitelisted in MongoDB Atlas -> Security -> Network Access.'
    };
  }

  if (msg.includes('Invalid connection string')) {
    return {
      diagnostic: 'Invalid connection string format.',
      actionableAdvice: 'Check the format of MONGODB_URI in server/.env. Ensure special characters in password are properly encoded.'
    };
  }

  return {
    diagnostic: msg,
    actionableAdvice: 'Verify your MongoDB Atlas cluster state, network connection, and connection string.'
  };
}

/**
 * Connects to MongoDB Atlas using process.env.MONGODB_URI.
 * Preserves backend stability by gracefully falling back if connection fails.
 */
export async function connectDB() {
  const rawUri = process.env.MONGODB_URI;
  connectionState.lastAttempt = new Date().toISOString();

  if (!rawUri || rawUri.trim() === '' || rawUri.includes('your_mongodb_uri')) {
    const errorMsg = 'MONGODB_URI is not defined or is empty in server/.env';
    connectionState.isConnected = false;
    connectionState.error = errorMsg;
    connectionState.diagnostic = 'Configure MONGODB_URI in server/.env to enable Atlas cloud storage.';
    console.warn(`[OpsPilot DB] ⚠️  ${errorMsg}. Operating in local JSON fallback mode.`);
    return null;
  }

  const safeUri = sanitizeMongoUri(rawUri);
  const masked = maskMongoUri(safeUri);

  // Extract cluster hostname safely for display
  try {
    const hostMatch = safeUri.match(/@([^/?]+)/);
    connectionState.cluster = hostMatch ? hostMatch[1] : 'Atlas Cluster';
  } catch {
    connectionState.cluster = 'Atlas Cluster';
  }

  console.log(`[OpsPilot DB] 🔄 Connecting to MongoDB Atlas: ${masked}`);
  console.log(`[OpsPilot DB] 📂 Target Database: "${DB_NAME}"`);

  try {
    client = new MongoClient(safeUri, {
      serverApi: {
        version: ServerApiVersion.v1,
        strict: false,
        deprecationErrors: true
      },
      serverSelectionTimeoutMS: 2000,
      connectTimeoutMS: 3000
    });

    await client.connect();

    // Ping the opspilot database to confirm read/write connectivity
    database = client.db(DB_NAME);
    await database.command({ ping: 1 });

    connectionState.isConnected = true;
    connectionState.error = null;
    connectionState.diagnostic = 'Successfully connected to MongoDB Atlas cluster.';

    console.log(`[OpsPilot DB] ✅ MongoDB Atlas connection established successfully to database: "${DB_NAME}"`);
    return database;
  } catch (err) {
    const diag = diagnoseError(err, safeUri);
    connectionState.isConnected = false;
    connectionState.error = err.message;
    connectionState.diagnostic = `${diag.diagnostic} ${diag.actionableAdvice}`;

    console.error(`[OpsPilot DB] ❌ MongoDB Atlas connection error: ${err.message}`);
    console.warn(`[OpsPilot DB] ℹ️  Diagnostic: ${diag.diagnostic}`);
    console.warn(`[OpsPilot DB] 💡 Action required: ${diag.actionableAdvice}`);
    console.warn(`[OpsPilot DB] 🛡️  Fallback: Preserving all API routes and operations using local JSON persistence.`);

    if (client) {
      try {
        await client.close();
      } catch {
        // ignore close errors
      }
      client = null;
    }
    database = null;
    return null;
  }
}

/**
 * Returns active database instance or null
 */
export function getDB() {
  return database;
}

/**
 * Returns specific collection if connected, else null
 */
export function getCollection(name) {
  if (database && connectionState.isConnected) {
    return database.collection(name);
  }
  return null;
}

/**
 * Returns current sanitized connection status without exposing sensitive credentials
 */
export function getConnectionStatus() {
  return {
    ...connectionState
  };
}

/**
 * Graceful shutdown
 */
export async function closeDB() {
  if (client) {
    await client.close();
    connectionState.isConnected = false;
    client = null;
    database = null;
    console.log('[OpsPilot DB] Connection closed.');
  }
}
