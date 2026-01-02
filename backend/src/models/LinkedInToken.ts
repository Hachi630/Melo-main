import { Schema, model } from "mongoose";

const LinkedInTokenSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  liMemberId: { type: String },
  accessToken: { type: String },
  expiresAt: { type: Date }
});

export default model("LinkedInToken", LinkedInTokenSchema);

