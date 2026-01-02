import jwt from 'jsonwebtoken'
import dotenv from 'dotenv'

dotenv.config()

const JWT_SECRET: string = process.env.JWT_SECRET || 'melo_secret_key_123456'
const JWT_EXPIRE: string = process.env.JWT_EXPIRE || '7d'

export const generateToken = (userId: string): string => {
  return jwt.sign({ id: userId }, JWT_SECRET, {
    expiresIn: JWT_EXPIRE as string,
  } as jwt.SignOptions)
}

export const verifyToken = (token: string): any => {
  return jwt.verify(token, JWT_SECRET)
}

