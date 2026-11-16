import { createContext } from 'react'
import type {
  AuthStatus,
  AuthUser,
  LoginCredentials,
  RegistrationDetails,
} from '../types/auth'

export interface AuthContextValue {
  user: AuthUser | null
  status: AuthStatus
  isAuthenticated: boolean
  isLoading: boolean
  isLoggingOut: boolean
  isConfigured: boolean
  error: string | null
  login: (credentials: LoginCredentials) => Promise<AuthUser>
  register: (details: RegistrationDetails) => Promise<AuthUser>
  logout: () => Promise<void>
  refreshSession: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)
