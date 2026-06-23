import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '../../../test/test-utils'
import { ConfirmModal } from '../ConfirmModal'

describe('ConfirmModal', () => {
  const defaultProps = {
    open: true,
    title: 'Confirmar exclusão',
    message: 'Tem certeza que deseja excluir?',
    onConfirm: vi.fn(),
    onCancel: vi.fn(),
  }

  it('renders nothing when open is false', () => {
    const { container } = render(<ConfirmModal {...defaultProps} open={false} />)
    expect(container.innerHTML).toBe('')
  })

  it('renders title and message when open is true', () => {
    render(<ConfirmModal {...defaultProps} />)
    expect(screen.getByText('Confirmar exclusão')).toBeInTheDocument()
    expect(screen.getByText('Tem certeza que deseja excluir?')).toBeInTheDocument()
  })

  it('calls onConfirm when confirm button is clicked', () => {
    const onConfirm = vi.fn()
    render(<ConfirmModal {...defaultProps} onConfirm={onConfirm} />)

    const confirmBtn = screen.getByText('Confirmar')
    fireEvent.click(confirmBtn)
    expect(onConfirm).toHaveBeenCalledOnce()
  })

  it('calls onCancel when cancel button is clicked', () => {
    const onCancel = vi.fn()
    render(<ConfirmModal {...defaultProps} onCancel={onCancel} />)

    const cancelBtn = screen.getByText('Cancelar')
    fireEvent.click(cancelBtn)
    expect(onCancel).toHaveBeenCalledOnce()
  })

  it('calls onCancel when overlay is clicked', () => {
    const onCancel = vi.fn()
    render(<ConfirmModal {...defaultProps} onCancel={onCancel} />)

    const overlay = screen.getByText('Confirmar exclusão').closest('div')?.previousElementSibling
    if (overlay) fireEvent.click(overlay)
    expect(onCancel).toHaveBeenCalled()
  })

  it('renders custom button labels', () => {
    render(
      <ConfirmModal
        {...defaultProps}
        confirmLabel="Sim"
        cancelLabel="Não"
      />
    )
    expect(screen.getByText('Sim')).toBeInTheDocument()
    expect(screen.getByText('Não')).toBeInTheDocument()
  })
})
