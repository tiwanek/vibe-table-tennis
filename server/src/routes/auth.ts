import { Router, Request, Response, NextFunction } from 'express'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { z } from 'zod'
import { prisma } from '../index.js'
import { AppError } from '../middleware/errorHandler.js'
import { randomBytes } from 'crypto'

const router = Router()

const signupSchema = z.object({
  username: z.string().min(3).max(30),
  email: z.string().email(),
  password: z.string().min(6),
})

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
})

const resetRequestSchema = z.object({
  email: z.string().email(),
})

const resetPasswordSchema = z.object({
  token: z.string(),
  password: z.string().min(6),
})

// Signup
router.post('/signup', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = signupSchema.parse(req.body)

    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ email: data.email }, { username: data.username }],
      },
    })

    if (existingUser) {
      throw new AppError('User with this email or username already exists', 400)
    }

    const hashedPassword = await bcrypt.hash(data.password, 10)

    const user = await prisma.user.create({
      data: {
        username: data.username,
        email: data.email,
        password: hashedPassword,
      },
      select: {
        id: true,
        username: true,
        email: true,
        mmr: true,
        createdAt: true,
      },
    })

    const secret = process.env.JWT_SECRET || 'default-secret'
    const token = jwt.sign({ userId: user.id }, secret, { expiresIn: '7d' })

    res.status(201).json({ user, token })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return next(new AppError(error.errors[0].message, 400))
    }
    next(error)
  }
})

// Login
router.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = loginSchema.parse(req.body)

    const user = await prisma.user.findUnique({
      where: { email: data.email },
    })

    if (!user) {
      throw new AppError('Invalid credentials', 401)
    }

    const validPassword = await bcrypt.compare(data.password, user.password)

    if (!validPassword) {
      throw new AppError('Invalid credentials', 401)
    }

    const secret = process.env.JWT_SECRET || 'default-secret'
    const token = jwt.sign({ userId: user.id }, secret, { expiresIn: '7d' })

    res.json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        mmr: user.mmr,
        createdAt: user.createdAt,
      },
      token,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return next(new AppError(error.errors[0].message, 400))
    }
    next(error)
  }
})

// Request password reset
router.post('/reset-password', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = resetRequestSchema.parse(req.body)

    const user = await prisma.user.findUnique({
      where: { email: data.email },
    })

    if (!user) {
      // Don't reveal if user exists
      return res.json({ message: 'If the email exists, a reset link has been sent' })
    }

    const token = randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + 3600000) // 1 hour

    await prisma.passwordReset.create({
      data: {
        userId: user.id,
        token,
        expiresAt,
      },
    })

    // In production, send email with reset link
    // For now, just return the token (development only)
    res.json({
      message: 'If the email exists, a reset link has been sent',
      // Remove this in production:
      devToken: token,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return next(new AppError(error.errors[0].message, 400))
    }
    next(error)
  }
})

// Complete password reset
router.post('/reset-password/:token', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token } = req.params
    const { password } = resetPasswordSchema.parse({ token, password: req.body.password })

    const resetRecord = await prisma.passwordReset.findUnique({
      where: { token },
      include: { user: true },
    })

    if (!resetRecord || resetRecord.used || resetRecord.expiresAt < new Date()) {
      throw new AppError('Invalid or expired reset token', 400)
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    await prisma.$transaction([
      prisma.user.update({
        where: { id: resetRecord.userId },
        data: { password: hashedPassword },
      }),
      prisma.passwordReset.update({
        where: { id: resetRecord.id },
        data: { used: true },
      }),
    ])

    res.json({ message: 'Password reset successfully' })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return next(new AppError(error.errors[0].message, 400))
    }
    next(error)
  }
})

export default router
