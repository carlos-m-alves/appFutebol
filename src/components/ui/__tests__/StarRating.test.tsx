import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '../../../test/test-utils'
import { StarRating, DisplayRating } from '../StarRating'

describe('StarRating', () => {
  it('renders 5 star buttons', () => {
    render(<StarRating value={0} onChange={() => {}} />)
    const buttons = screen.getAllByRole('button')
    expect(buttons).toHaveLength(5)
  })

  it('calls onChange when a star is clicked', () => {
    const onChange = vi.fn()
    render(<StarRating value={0} onChange={onChange} />)
    const buttons = screen.getAllByRole('button')

    fireEvent.click(buttons[2])
    expect(onChange).toHaveBeenCalledWith(3)
  })

  it('does not call onChange when readonly', () => {
    const onChange = vi.fn()
    render(<StarRating value={3} onChange={onChange} readonly />)
    const buttons = screen.getAllByRole('button')

    fireEvent.click(buttons[0])
    expect(onChange).not.toHaveBeenCalled()
  })

  it('buttons are disabled when readonly', () => {
    render(<StarRating value={3} onChange={() => {}} readonly />)
    const buttons = screen.getAllByRole('button')
    buttons.forEach(btn => expect(btn).toBeDisabled())
  })
})

describe('DisplayRating', () => {
  it('renders the rating value', () => {
    render(<DisplayRating value={4.5} />)
    expect(screen.getByText('4.5')).toBeInTheDocument()
  })

  it('renders stars as readonly', () => {
    render(<DisplayRating value={3.0} />)
    const buttons = screen.getAllByRole('button')
    buttons.forEach(btn => expect(btn).toBeDisabled())
  })
})
