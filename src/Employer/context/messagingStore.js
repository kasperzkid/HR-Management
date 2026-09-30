import { createContext, useContext } from 'react'

export const MessagingContext = createContext(null)

export function useMessaging() {
  const ctx = useContext(MessagingContext)
  if (!ctx) throw new Error('useMessaging must be used within MessagingProvider')
  return ctx
}

// Same as useMessaging but returns null instead of throwing when the
// component is rendered outside a MessagingProvider (e.g. shared
// layout chrome reused by both the HR and the Employee workspace).
export function useMessagingOptional() {
  return useContext(MessagingContext)
}