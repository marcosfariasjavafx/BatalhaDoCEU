import { createContext, useContext, useState, useCallback, ReactNode } from 'react'

interface ToastCtx { show: (msg: string, err?: boolean) => void }
const Ctx = createContext<ToastCtx>({ show: () => {} })

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<{ msg: string; err: boolean; visible: boolean } | null>(null)

  const show = useCallback((msg: string, err = false) => {
    setToast({ msg, err, visible: true })
    setTimeout(() => setToast(t => t ? { ...t, visible: false } : null), 2700)
    setTimeout(() => setToast(null), 3000)
  }, [])

  return (
    <Ctx.Provider value={{ show }}>
      {children}
      {toast && (
        <div className={`toast${toast.visible ? ' show' : ''}${toast.err ? ' err' : ''}`}>
          {toast.msg}
        </div>
      )}
    </Ctx.Provider>
  )
}

export const useToast = () => useContext(Ctx)
