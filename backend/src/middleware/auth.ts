import { Response, NextFunction } from 'express'
import { verifyToken } from '../utils/jwt.js'
import User from '../models/User.js'
import { AuthRequest } from '../types/index.js'

export const requireAuth = async (req: AuthRequest, res: Response, next: NextFunction) => {
  let token

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1]
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'Not authorized to access this route' })
  }

  try {
    const decoded = verifyToken(token)
    const user = await User.findById(decoded.id)

    if (!user) {
      return res.status(404).json({ success: false, message: 'No user found with this id' })
    }

    req.user = user
    next()
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Not authorized to access this route' })
  }
}

// alias for backwards compatibility
export const protect = requireAuth
