import mongoose, { Document, Schema } from 'mongoose'

// Company data structure for multi-company support
export interface ICompanyData {
  id: string
  name: string
  brandName: string
  industry: string
  toneOfVoice: string
  customTone: string
  knowledgeProducts: string[]
  targetAudience: string[]
  companyDescription: string
  brandLogoUrl?: string
}

export interface IUser extends Document {
  email: string
  password?: string
  googleId?: string
  name?: string
  brandName?: string
  brandLogoUrl?: string
  phone?: string
  birthday?: string
  gender?: string
  address?: string
  aboutMe?: string
  avatar?: string
  industry?: string
  toneOfVoice?: string
  knowledgeProducts?: string[]
  targetAudience?: string[]
  companies?: ICompanyData[]
  authProvider: 'local' | 'google'
  socialConnections?: {
    instagram?: {
      accessToken: string
      userId?: string
      username?: string
      accountType?: string
      expiresAt?: Date
    }
    facebook?: {
      accessToken: string
      userId?: string
      expiresAt?: Date
    }
  }
  createdAt: Date
  updatedAt: Date
}

const UserSchema: Schema = new Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: function(this: IUser) {
        // Password is required only if user doesn't have googleId
        // If user has googleId, they are using Google OAuth and password is not required
        return !this.googleId
      },
    },
    googleId: {
      type: String,
      unique: true,
      sparse: true,
    },
    name: {
      type: String,
      trim: true,
    },
    avatar: {
      type: String,
      trim: true,
    },
    authProvider: {
      type: String,
      enum: ['local', 'google'],
      default: 'local',
    },
    brandName: {
      type: String,
      trim: true,
    },
    brandLogoUrl: {
      type: String,
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    birthday: {
      type: String,
      trim: true,
    },
    gender: {
      type: String,
      trim: true,
    },
    address: {
      type: String,
      trim: true,
    },
    aboutMe: {
      type: String,
      trim: true,
    },
    industry: {
      type: String,
      trim: true,
    },
    toneOfVoice: {
      type: String,
      trim: true,
    },
    knowledgeProducts: {
      type: [String],
      default: [],
    },
    targetAudience: {
      type: [String],
      default: [],
    },
    companies: {
      type: [{
        id: {
          type: String,
          required: true,
          trim: true,
        },
        name: {
          type: String,
          trim: true,
          default: '',
        },
        brandName: {
          type: String,
          trim: true,
          default: '',
        },
        industry: {
          type: String,
          trim: true,
          default: '',
        },
        toneOfVoice: {
          type: String,
          trim: true,
          default: 'calm',
        },
        customTone: {
          type: String,
          trim: true,
          default: '',
        },
        knowledgeProducts: {
          type: [String],
          default: [],
        },
        targetAudience: {
          type: [String],
          default: [],
        },
        companyDescription: {
          type: String,
          trim: true,
          default: '',
        },
        brandLogoUrl: {
          type: String,
          trim: true,
          default: '',
        },
      }],
      default: [],
      validate: {
        validator: function(companies: ICompanyData[]) {
          return companies.length <= 10
        },
        message: 'Maximum 10 companies allowed',
      },
    },
    socialConnections: {
      type: {
        instagram: {
          accessToken: String,
          userId: String,
          username: String,
          accountType: String,
          expiresAt: Date,
        },
        facebook: {
          accessToken: String,
          userId: String,
          expiresAt: Date,
        },
      },
      default: {},
    },
  },
  {
    timestamps: true,
  }
)

export default mongoose.model<IUser>('User', UserSchema)

