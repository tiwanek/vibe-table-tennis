import { Router, Response, NextFunction } from 'express'
import { prisma } from '../index.js'
import { authenticate, AuthRequest } from '../middleware/auth.js'
import { AppError } from '../middleware/errorHandler.js'

const router = Router()

// Get current user
router.get('/me', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true,
        username: true,
        email: true,
        mmr: true,
        createdAt: true,
      },
    })

    if (!user) {
      throw new AppError('User not found', 404)
    }

    res.json(user)
  } catch (error) {
    next(error)
  }
})

// Get all users (for opponent selection)
router.get('/', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        mmr: true,
      },
      orderBy: { mmr: 'desc' },
    })

    res.json(users)
  } catch (error) {
    next(error)
  }
})

// Get user by ID
router.get('/:id', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: {
        id: true,
        username: true,
        mmr: true,
        createdAt: true,
      },
    })

    if (!user) {
      throw new AppError('User not found', 404)
    }

    res.json(user)
  } catch (error) {
    next(error)
  }
})

// Get user's match history
router.get(
  '/:id/matches',
  authenticate,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const matches = await prisma.match.findMany({
        where: {
          OR: [{ player1Id: req.params.id }, { player2Id: req.params.id }],
          status: 'CONFIRMED',
        },
        include: {
          player1: { select: { id: true, username: true } },
          player2: { select: { id: true, username: true } },
          tournament: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
      })

      res.json(matches)
    } catch (error) {
      next(error)
    }
  }
)

export default router
