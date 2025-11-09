import mongoose from "mongoose";

export async function connect(uri: string) {
  // keep this minimal and typed so lint/typecheck are satisfied
  await mongoose.connect(uri);
}
