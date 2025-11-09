import mongoose from "mongoose";

export async function connect(uri: string) {
  // If you previously computed duration but didn't use it, remove or prefix with _
  await mongoose.connect(uri);
}
