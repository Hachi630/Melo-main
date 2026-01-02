import mongoose, { Document, Schema, Types } from 'mongoose'

export interface ICalendarItemVariants {
  tiktok?: string
  instagram_post?: string
  instagram_story?: string
  instagram_reels?: string
  facebook?: string
  twitter?: string
}

export interface ICalendarItem extends Document {
  userId: Types.ObjectId
  campaignId?: Types.ObjectId | null
  companyId?: string | null
  platform: string
  date: Date
  time?: string | null
  title: string
  content: string
  imageUrl?: string | null
  variants?: ICalendarItemVariants
  status: 'draft' | 'scheduled' | 'published'
  createdAt: Date
  updatedAt: Date
}

const CalendarItemVariantsSchema: Schema = new Schema(
  {
    tiktok: { type: String, trim: true },
    instagram_post: { type: String, trim: true },
    instagram_story: { type: String, trim: true },
    instagram_reels: { type: String, trim: true },
    facebook: { type: String, trim: true },
    twitter: { type: String, trim: true },
  },
  { _id: false }
)

const CalendarItemSchema: Schema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    campaignId: {
      type: Schema.Types.ObjectId,
      ref: 'Campaign',
      default: null,
    },
    companyId: {
      type: String,
      trim: true,
      default: null,
    },
    platform: {
      type: String,
      required: true,
      trim: true,
    },
    date: {
      type: Date,
      required: true,
      index: true,
    },
    time: {
      type: String,
      trim: true,
      match: /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    content: {
      type: String,
      required: true,
      trim: true,
    },
    imageUrl: {
      type: String,
      trim: true,
      default: null,
    },
    variants: {
      type: CalendarItemVariantsSchema,
      default: {},
    },
    status: {
      type: String,
      enum: ['draft', 'scheduled', 'published'],
      default: 'draft',
    },
  },
  {
    timestamps: true,
  }
)

// Create compound index for efficient date range queries
CalendarItemSchema.index({ userId: 1, date: 1 })
CalendarItemSchema.index({ userId: 1, campaignId: 1 })
CalendarItemSchema.index({ userId: 1, status: 1 })

export default mongoose.model<ICalendarItem>('CalendarItem', CalendarItemSchema)

