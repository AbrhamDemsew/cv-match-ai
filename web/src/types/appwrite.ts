export type AppwriteConnectionFailureStatus =
  | 'not_configured'
  | 'project_not_found'
  | 'origin_rejected'
  | 'unreachable'
  | 'timeout'
  | 'error'

export interface AppwriteConnectionSuccess {
  status: 'connected'
  latencyMs: number
}

export interface AppwriteConnectionFailure {
  status: AppwriteConnectionFailureStatus
  message: string
  code?: number
  type?: string
}

export type AppwriteConnectionCheck = AppwriteConnectionSuccess | AppwriteConnectionFailure
