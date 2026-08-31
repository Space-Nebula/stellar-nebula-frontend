import { useEffect } from 'react'
import { Toaster, useToasterStore, toast } from 'react-hot-toast'
import { TOAST_DURATION, TOAST_GUTTER, TOAST_POSITION, TOAST_STACK_LIMIT } from '../../utils/toast'

/**
 * Application-wide toast host. Centralises position, gutter, per-type duration
 * and visual style, and caps the number of simultaneously visible toasts so the
 * screen never fills with stacked notifications.
 */
export function AppToaster() {
  const { toasts } = useToasterStore()

  useEffect(() => {
    toasts
      .filter((t) => t.visible)
      .filter((_, index) => index >= TOAST_STACK_LIMIT)
      .forEach((t) => toast.dismiss(t.id))
  }, [toasts])

  return (
    <Toaster
      position={TOAST_POSITION}
      gutter={TOAST_GUTTER}
      toastOptions={{
        duration: TOAST_DURATION.info,
        success: { duration: TOAST_DURATION.success },
        error: { duration: TOAST_DURATION.error },
        loading: { duration: TOAST_DURATION.loading },
        style: {
          background: 'rgba(9, 17, 33, 0.96)',
          color: '#f8fbff',
          border: '1px solid rgba(159, 216, 255, 0.24)',
          maxWidth: 420,
        },
      }}
    />
  )
}

export default AppToaster
