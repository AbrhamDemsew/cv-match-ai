export interface AuthUser {
  id: string
  name: string
  email: string
  emailVerification: boolean
  createdAt: string
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface RegistrationDetails {
  name: string
  email: string
  password: string
}

export interface PasswordResetDetails {
  userId: string
  secret: string
  password: string
}

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated' | 'error'

export interface AuthPageLocationState {
  from?: string
  signedOut?: boolean
  message?: string
}
