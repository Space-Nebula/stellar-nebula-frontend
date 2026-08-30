import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { Modal } from '../components/UI/Modal'
import type { ModalSize } from '../components/UI/Modal'

export interface ModalOptions {
  title?: string
  ariaLabel?: string
  size?: ModalSize
  closeOnBackdrop?: boolean
  closeOnEsc?: boolean
  hideHeader?: boolean
  hideCloseButton?: boolean
  footer?: ReactNode
  /** Fired after the modal is removed from the stack. */
  onClose?: () => void
}

interface ModalEntry extends ModalOptions {
  id: string
  content: ReactNode
}

interface ModalContextValue {
  /** Open a modal. Returns its id so it can be closed programmatically. */
  openModal: (content: ReactNode, options?: ModalOptions) => string
  /** Close a specific modal by id (defaults to the top-most modal). */
  closeModal: (id?: string) => void
  /** Close every open modal. */
  closeAll: () => void
  /** Ids of the currently open modals, bottom-to-top. */
  openModalIds: string[]
}

const ModalContext = createContext<ModalContextValue | null>(null)

let modalCounter = 0

interface ModalProviderProps {
  children: ReactNode
}

export function ModalProvider({ children }: ModalProviderProps) {
  const [stack, setStack] = useState<ModalEntry[]>([])

  const closeModal = useCallback((id?: string) => {
    setStack((current) => {
      if (current.length === 0) return current
      const target = id ?? current[current.length - 1].id
      const entry = current.find((item) => item.id === target)
      if (!entry) return current
      entry.onClose?.()
      return current.filter((item) => item.id !== target)
    })
  }, [])

  const closeAll = useCallback(() => {
    setStack((current) => {
      current.forEach((entry) => entry.onClose?.())
      return []
    })
  }, [])

  const openModal = useCallback((content: ReactNode, options: ModalOptions = {}) => {
    const id = `modal-${++modalCounter}`
    setStack((current) => [...current, { ...options, id, content }])
    return id
  }, [])

  const value = useMemo<ModalContextValue>(
    () => ({
      openModal,
      closeModal,
      closeAll,
      openModalIds: stack.map((entry) => entry.id),
    }),
    [openModal, closeModal, closeAll, stack]
  )

  return (
    <ModalContext.Provider value={value}>
      {children}
      {stack.map((entry) => (
        <Modal
          key={entry.id}
          isOpen
          onClose={() => closeModal(entry.id)}
          title={entry.title}
          ariaLabel={entry.ariaLabel}
          size={entry.size}
          closeOnBackdrop={entry.closeOnBackdrop}
          closeOnEsc={entry.closeOnEsc}
          hideHeader={entry.hideHeader}
          hideCloseButton={entry.hideCloseButton}
          footer={entry.footer}
        >
          {entry.content}
        </Modal>
      ))}
    </ModalContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useModal(): ModalContextValue {
  const context = useContext(ModalContext)
  if (!context) {
    throw new Error('useModal must be used within a ModalProvider')
  }
  return context
}
