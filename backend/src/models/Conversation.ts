import mongoose, { Document, Schema, Types } from "mongoose";

export interface IConversationFile {
  url: string;
  name: string;
  type: string;
  size: number;
}

export interface IConversationMessage {
  role: "user" | "assistant";
  content: string;
  images?: string[];
  files?: IConversationFile[];
  timestamp: Date;
}

export interface IConversation extends Document {
  userId: Types.ObjectId;
  title: string;
  folderId?: Types.ObjectId | null;
  messages: IConversationMessage[];
  createdAt: Date;
  updatedAt: Date;
}

const ConversationFileSchema: Schema = new Schema(
  {
    url: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      required: true,
    },
    size: {
      type: Number,
      required: true,
    },
  },
  { _id: false }
);

const ConversationMessageSchema: Schema = new Schema(
  {
    role: {
      type: String,
      enum: ["user", "assistant"],
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    images: {
      type: [String],
      default: undefined,
    },
    files: {
      type: [ConversationFileSchema],
      default: undefined,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const ConversationSchema: Schema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    folderId: {
      type: Schema.Types.ObjectId,
      ref: "ProjectFolder",
      default: null,
      index: true,
    },
    messages: {
      type: [ConversationMessageSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

// Create index to improve query performance
ConversationSchema.index({ userId: 1, updatedAt: -1 });

export default mongoose.model<IConversation>(
  "Conversation",
  ConversationSchema
);
