import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Button } from './button'

describe('Button', () => {
  it('renders button with text', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument()
  })

  it('applies default variant styles', () => {
    render(<Button>Default</Button>)
    const button = screen.getByRole('button')
    expect(button).toHaveClass('bg-primary')
  })

  it('applies destructive variant styles', () => {
    render(<Button variant="destructive">Delete</Button>)
    const button = screen.getByRole('button')
    expect(button).toHaveClass('bg-destructive')
  })

  it('applies outline variant styles', () => {
    render(<Button variant="outline">Outline</Button>)
    const button = screen.getByRole('button')
    expect(button).toHaveClass('border')
  })

  it('applies size styles', () => {
    render(<Button size="sm">Small</Button>)
    const button = screen.getByRole('button')
    expect(button).toHaveClass('h-9')
  })

  it('can be disabled', () => {
    render(<Button disabled>Disabled</Button>)
    const button = screen.getByRole('button')
    expect(button).toBeDisabled()
  })

  it('accepts custom className', () => {
    render(<Button className="custom-class">Custom</Button>)
    const button = screen.getByRole('button')
    expect(button).toHaveClass('custom-class')
  })
})
