import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Request, Response, NextFunction } from 'express'
import { AppError, errorHandler } from './errorHandler'

describe('AppError', () => {
  it('should create an error with message and status code', () => {
    const error = new AppError('Not found', 404)

    expect(error.message).toBe('Not found')
    expect(error.statusCode).toBe(404)
    expect(error.isOperational).toBe(true)
  })

  it('should be an instance of Error', () => {
    const error = new AppError('Bad request', 400)

    expect(error).toBeInstanceOf(Error)
    expect(error).toBeInstanceOf(AppError)
  })

  it('should capture stack trace', () => {
    const error = new AppError('Test error', 500)

    expect(error.stack).toBeDefined()
  })
})

describe('errorHandler', () => {
  let mockReq: Partial<Request>
  let mockRes: Partial<Response>
  let mockNext: NextFunction
  let jsonMock: ReturnType<typeof vi.fn>
  let statusMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    jsonMock = vi.fn()
    statusMock = vi.fn().mockReturnValue({ json: jsonMock })
    mockReq = {}
    mockRes = {
      status: statusMock,
    }
    mockNext = vi.fn()
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  it('should handle AppError with correct status code and message', () => {
    const error = new AppError('Resource not found', 404)

    errorHandler(error, mockReq as Request, mockRes as Response, mockNext)

    expect(statusMock).toHaveBeenCalledWith(404)
    expect(jsonMock).toHaveBeenCalledWith({ error: 'Resource not found' })
  })

  it('should handle AppError with 400 status', () => {
    const error = new AppError('Invalid input', 400)

    errorHandler(error, mockReq as Request, mockRes as Response, mockNext)

    expect(statusMock).toHaveBeenCalledWith(400)
    expect(jsonMock).toHaveBeenCalledWith({ error: 'Invalid input' })
  })

  it('should handle AppError with 401 status', () => {
    const error = new AppError('Unauthorized', 401)

    errorHandler(error, mockReq as Request, mockRes as Response, mockNext)

    expect(statusMock).toHaveBeenCalledWith(401)
    expect(jsonMock).toHaveBeenCalledWith({ error: 'Unauthorized' })
  })

  it('should handle generic Error with 500 status and generic message', () => {
    const error = new Error('Some internal error')

    errorHandler(error, mockReq as Request, mockRes as Response, mockNext)

    expect(statusMock).toHaveBeenCalledWith(500)
    expect(jsonMock).toHaveBeenCalledWith({ error: 'Internal server error' })
  })

  it('should log unexpected errors to console', () => {
    const error = new Error('Unexpected error')

    errorHandler(error, mockReq as Request, mockRes as Response, mockNext)

    expect(console.error).toHaveBeenCalledWith('Unexpected error:', error)
  })

  it('should not log AppError to console', () => {
    const error = new AppError('Expected error', 400)

    errorHandler(error, mockReq as Request, mockRes as Response, mockNext)

    expect(console.error).not.toHaveBeenCalled()
  })
})
