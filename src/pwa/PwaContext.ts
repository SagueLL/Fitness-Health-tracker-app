import { createContext, useContext } from 'react'

export interface PwaState {
  online: boolean
  installed: boolean
  canInstall: boolean
  installing: boolean
  offlineAvailable: boolean
  needRefresh: boolean
  updating: boolean
  applyUpdate: () => Promise<void>
  message: string
  install: () => Promise<void>
  checkUpdate: () => Promise<void>
}
export const PwaContext = createContext<PwaState | undefined>(undefined)
export function usePwa() {
  const value = useContext(PwaContext)
  if (!value) throw new Error('PwaProvider no disponible')
  return value
}

