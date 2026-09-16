import { createContext, useContext } from 'react'

export const MessagingContext = createContext(null)

export function useMessaging() {
  const ctx = useContext(MessagingContext)
  if (!ctx) throw new Error('useMessaging must be used within MessagingProvider')
  return ctx
}