import mongoose from "mongoose";

// 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
export const getDBState = () => mongoose.connection?.readyState ?? 0;

export const connectDB = async () => {
  try {
    const state = getDBState();
    if (state === 1) return true; // already connected
    if (state === 2) return true; // connecting

    if (!process.env.MONGO_URI) {
      console.error("❌ MONGO_URI is not set");
      return false;
    }

    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ MongoDB Connected");
    return true;
  } catch (error) {
    console.error("❌ MongoDB Connection Failed:", error.message);
    // Do not exit the process in serverless; allow retry on next request
    return false;
  }
};
