import { useContext } from 'react'
import { AppCtx } from './appCtx'

/** Contexte de travail : école consultée, année scolaire, rôle. */
export function useApp() {
  const ctx = useContext(AppCtx)
  if (!ctx) throw new Error('useApp doit être utilisé dans un AppProvider')
  return ctx
}
