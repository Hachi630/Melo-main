import mongoose, { Document, Schema, Types } from 'mongoose'

export interface ICampaign extends Document {
  userId: Types.ObjectId
  name: string
  description?: string
  startDate: Date
  endDate: Date
  status: 'draft' | 'active' | 'completed'
  createdAt: Date
  updatedAt: Date
}

const CampaignSchema: Schema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ['draft', 'active', 'completed'],
      default: 'draft',
    },
  },
  {
    timestamps: true,
  }
)

// Create index to improve query performance
CampaignSchema.index({ userId: 1, startDate: -1 })
CampaignSchema.index({ userId: 1, status: 1 })

export default mongoose.model<ICampaign>('Campaign', CampaignSchema)

