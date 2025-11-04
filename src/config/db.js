import mongoose from "mongoose";

// Track last error for diagnostics (do not leak sensitive details)
let lastDbError = "";
let connectionPromise = null;

// 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
export const getDBState = () => mongoose.connection?.readyState ?? 0;

export const getDBStatus = () => {
  const state = getDBState();
  const label = state === 1 ? "Connected" : state === 2 ? "Connecting" : state === 3 ? "Disconnecting" : "Disconnected";
  return { state, label };
};

export const getLastDBError = () => lastDbError;
export const isMongoUriConfigured = () => Boolean(process.env.MONGO_URI);

export const connectDB = async () => {
  try {
    const state = getDBState();
    if (state === 1) return true; // already connected
    if (state === 2 && connectionPromise) {
      await connectionPromise; // wait for in-flight connect
      return getDBState() === 1;
    }

    if (!process.env.MONGO_URI) {
      lastDbError = "MONGO_URI is not set";
      console.error("❌ MONGO_URI is not set");
      return false;
    }

    // Start a single shared connection attempt
    connectionPromise = mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 8000,
    });
    await connectionPromise;
    console.log("✅ MongoDB Connected");
    lastDbError = "";
    return true;
  } catch (error) {
    lastDbError = error?.message || String(error);
    console.error("❌ MongoDB Connection Failed:", lastDbError);
    // Do not exit the process in serverless; allow retry on next request
    return false;
  } finally {
    connectionPromise = null;
  }
};
