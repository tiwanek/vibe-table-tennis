import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { prisma } from '../index.js'
import { AppError } from './errorHandler.js'

export interface AuthRequest extends Request {
  user?: {
    id: string
    username: string
    email: string
  }
}

export async function authenticate(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const authHeader = req.headers.authorization

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('No token provided', 401)
    }

    const token = authHeader.split(' ')[1]
    const secret = process.env.JWT_SECRET || 'default-secret'

    const decoded = jwt.verify(token, secret) as { userId: string }

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, username: true, email: true },
    })

    if (!user) {
      throw new AppError('User not found', 401)
    }

    req.user = user
    next()
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return next(new AppError('Invalid token', 401))
    }
    next(error)
  }
}
