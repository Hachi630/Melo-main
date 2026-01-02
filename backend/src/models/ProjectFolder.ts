import mongoose, { Document, Schema, Types } from "mongoose";

export interface IProjectFolder extends Document {
  userId: Types.ObjectId;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

const ProjectFolderSchema: Schema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
  },
  {
    timestamps: true,
  }
);

// Create index to improve query performance
ProjectFolderSchema.index({ userId: 1, updatedAt: -1 });

export default mongoose.model<IProjectFolder>(
  "ProjectFolder",
  ProjectFolderSchema
);
