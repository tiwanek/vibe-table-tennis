import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { reducer } from './use-toast'

// Mock toast type for testing
interface MockToast {
  id: string
  title?: string
  description?: string
  open?: boolean
}

interface State {
  toasts: MockToast[]
}

describe('toast reducer', () => {
  describe('ADD_TOAST', () => {
    it('should add a toast to empty state', () => {
      const state: State = { toasts: [] }
      const toast: MockToast = { id: '1', title: 'Test Toast' }

      const result = reducer(state, {
        type: 'ADD_TOAST',
        toast: toast as never,
      })

      expect(result.toasts).toHaveLength(1)
      expect(result.toasts[0]).toEqual(toast)
    })

    it('should add toast to the beginning of the list', () => {
      const state: State = {
        toasts: [{ id: '1', title: 'First Toast' }],
      }
      const newToast: MockToast = { id: '2', title: 'Second Toast' }

      const result = reducer(state, {
        type: 'ADD_TOAST',
        toast: newToast as never,
      })

      expect(result.toasts).toHaveLength(1) // TOAST_LIMIT is 1
      expect(result.toasts[0].id).toBe('2')
    })

    it('should respect TOAST_LIMIT of 1', () => {
      const state: State = { toasts: [] }

      let result = reducer(state, {
        type: 'ADD_TOAST',
        toast: { id: '1', title: 'First' } as never,
      })

      result = reducer(result, {
        type: 'ADD_TOAST',
        toast: { id: '2', title: 'Second' } as never,
      })

      expect(result.toasts).toHaveLength(1)
      expect(result.toasts[0].id).toBe('2')
    })
  })

  describe('UPDATE_TOAST', () => {
    it('should update an existing toast', () => {
      const state: State = {
        toasts: [{ id: '1', title: 'Original Title', description: 'Original' }],
      }

      const result = reducer(state, {
        type: 'UPDATE_TOAST',
        toast: { id: '1', title: 'Updated Title' },
      })

      expect(result.toasts[0].title).toBe('Updated Title')
      expect(result.toasts[0].description).toBe('Original')
    })

    it('should not modify other toasts', () => {
      const state: State = {
        toasts: [{ id: '1', title: 'Toast 1' }],
      }

      const result = reducer(state, {
        type: 'UPDATE_TOAST',
        toast: { id: '2', title: 'Updated' },
      })

      expect(result.toasts[0].title).toBe('Toast 1')
    })
  })

  describe('DISMISS_TOAST', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('should set open to false for specific toast', () => {
      const state: State = {
        toasts: [{ id: '1', title: 'Toast', open: true }],
      }

      const result = reducer(state, {
        type: 'DISMISS_TOAST',
        toastId: '1',
      })

      expect(result.toasts[0].open).toBe(false)
    })

    it('should dismiss all toasts when no toastId provided', () => {
      const state: State = {
        toasts: [{ id: '1', open: true }],
      }

      const result = reducer(state, {
        type: 'DISMISS_TOAST',
        toastId: undefined,
      })

      expect(result.toasts[0].open).toBe(false)
    })
  })

  describe('REMOVE_TOAST', () => {
    it('should remove a specific toast', () => {
      const state: State = {
        toasts: [{ id: '1', title: 'Toast' }],
      }

      const result = reducer(state, {
        type: 'REMOVE_TOAST',
        toastId: '1',
      })

      expect(result.toasts).toHaveLength(0)
    })

    it('should remove all toasts when no toastId provided', () => {
      const state: State = {
        toasts: [{ id: '1' }],
      }

      const result = reducer(state, {
        type: 'REMOVE_TOAST',
        toastId: undefined,
      })

      expect(result.toasts).toHaveLength(0)
    })

    it('should not remove other toasts', () => {
      const state: State = {
        toasts: [{ id: '1', title: 'Keep' }],
      }

      const result = reducer(state, {
        type: 'REMOVE_TOAST',
        toastId: '2',
      })

      expect(result.toasts).toHaveLength(1)
      expect(result.toasts[0].id).toBe('1')
    })
  })

  describe('state immutability', () => {
    it('should not mutate the original state on ADD_TOAST', () => {
      const state: State = { toasts: [] }

      reducer(state, {
        type: 'ADD_TOAST',
        toast: { id: '1' } as never,
      })

      expect(state.toasts).toHaveLength(0)
    })

    it('should not mutate the original state on UPDATE_TOAST', () => {
      const originalTitle = 'Original'
      const state: State = {
        toasts: [{ id: '1', title: originalTitle }],
      }

      reducer(state, {
        type: 'UPDATE_TOAST',
        toast: { id: '1', title: 'Updated' },
      })

      expect(state.toasts[0].title).toBe(originalTitle)
    })

    it('should not mutate the original state on REMOVE_TOAST', () => {
      const state: State = {
        toasts: [{ id: '1' }],
      }

      reducer(state, {
        type: 'REMOVE_TOAST',
        toastId: '1',
      })

      expect(state.toasts).toHaveLength(1)
    })
  })
})
