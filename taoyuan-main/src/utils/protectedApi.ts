import { clearCurrentAccountContext, forceRefreshCurrentAccountContext } from '@/utils/accountStorage'

export class ProtectedApiError extends Error {
  status: number | null
  data: unknown

  constructor(message: string, status: number | null = null, data: unknown = null) {
    super(message)
    this.name = 'ProtectedApiError'
    this.status = status
    this.data = data
  }
}

export interface ProtectedJsonResult<T = any> {
  response: Response
  data: T | null
  recoveredAuth: boolean
}

export const parseJsonSafe = async <T = any>(res: Response): Promise<T | null> => {
  try {
    return await res.json()
  } catch {
    return null
  }
}

const isRecoverableAuthStatus = (status: number | null) => status === 401 || status === 403

export const isProtectedApiError = (error: unknown): error is ProtectedApiError => error instanceof ProtectedApiError

export const fetchProtectedJson = async <T = any>(
  requestFactory: () => Promise<Response>,
  options: {
    fallbackMessage: string
    networkErrorMessage?: string
    allowNotFound?: boolean
  }
): Promise<ProtectedJsonResult<T>> => {
  let attemptedRecovery = false
  let recoveredAuth = false

  while (true) {
    let response: Response
    try {
      response = await requestFactory()
    } catch {
      throw new ProtectedApiError(options.networkErrorMessage || options.fallbackMessage, null, null)
    }

    const data = await parseJsonSafe<T>(response)

    if (options.allowNotFound && response.status === 404) {
      return { response, data, recoveredAuth }
    }

    if (response.ok && data && (data as any).ok !== false) {
      return { response, data, recoveredAuth }
    }

    const error = new ProtectedApiError((data as any)?.msg || options.fallbackMessage, response.status, data)
    if (!attemptedRecovery && isRecoverableAuthStatus(error.status)) {
      attemptedRecovery = true
      recoveredAuth = true
      const context = await forceRefreshCurrentAccountContext()
      if (!context.loggedIn && error.status === 401) {
        clearCurrentAccountContext()
      }
      continue
    }

    if (error.status === 401) {
      clearCurrentAccountContext()
    }
    throw error
  }
}
