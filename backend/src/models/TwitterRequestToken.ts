import { Schema, model } from "mongoose";

const TwitterRequestTokenSchema = new Schema({
  oauthToken: { type: String, required: true, unique: true },
  oauthTokenSecret: { type: String, required: true },
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  createdAt: { type: Date, default: Date.now, expires: 600 } // Expire after 10 minutes
});

export default model("TwitterRequestToken", TwitterRequestTokenSchema);

