import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { AuthContext, type AuthContextValue } from './auth-context'
import { getAuthErrorMessage } from '../lib/auth-errors'
import { environment } from '../lib/env'
import { AUTH_QUERY_KEY } from '../lib/query-keys'
import {
  getCurrentUser,
  loginWithEmail,
  logoutCurrentSession,
  registerAccount,
} from '../services/auth.service'
import type {
  AuthStatus,
  AuthUser,
  LoginCredentials,
  RegistrationDetails,
} from '../types/auth'

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const queryClient = useQueryClient()
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const authQuery = useQuery({
    queryKey: AUTH_QUERY_KEY,
    queryFn: getCurrentUser,
    retry: false,
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: true,
  })

  const { refetch } = authQuery

  const login = useCallback(
    async (credentials: LoginCredentials): Promise<AuthUser> => {
      const user = await loginWithEmail(credentials)
      queryClient.setQueryData(AUTH_QUERY_KEY, user)
      return user
    },
    [queryClient],
  )

  const register = useCallback(
    async (details: RegistrationDetails): Promise<AuthUser> => {
      const user = await registerAccount(details)
      queryClient.setQueryData(AUTH_QUERY_KEY, user)
      return user
    },
    [queryClient],
  )

  const logout = useCallback(async (): Promise<void> => {
    setIsLoggingOut(true)

    try {
      await logoutCurrentSession()

      // Drop any user-specific server-state caches on sign-out while keeping
      // the auth entry in a clean signed-out state.
      queryClient.removeQueries({
        predicate: (query) => query.queryKey[0] !== AUTH_QUERY_KEY[0],
      })
      queryClient.setQueryData(AUTH_QUERY_KEY, null)
    } finally {
      setIsLoggingOut(false)
    }
  }, [queryClient])

  const refreshSession = useCallback(async (): Promise<void> => {
    await refetch()
  }, [refetch])

  const status: AuthStatus = authQuery.isPending
    ? 'loading'
    : authQuery.isError
      ? 'error'
      : authQuery.data
        ? 'authenticated'
        : 'unauthenticated'

  const value = useMemo<AuthContextValue>(
    () => ({
      user: authQuery.data ?? null,
      status,
      isAuthenticated: status === 'authenticated',
      isLoading: status === 'loading',
      isLoggingOut,
      isConfigured: environment.isConfigured,
      error: authQuery.isError ? getAuthErrorMessage(authQuery.error) : null,
      login,
      register,
      logout,
      refreshSession,
    }),
    [
      authQuery.data,
      authQuery.error,
      authQuery.isError,
      isLoggingOut,
      login,
      logout,
      refreshSession,
      register,
      status,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
