import { ensureCurrentAccount, ensureCurrentCsrfToken } from '@/utils/accountStorage'
import { fetchProtectedJson, isProtectedApiError, parseJsonSafe } from '@/utils/protectedApi'
import {
  clearTransactionIdempotencyKey,
  getOrCreateTransactionIdempotencyKey
} from '@/utils/transactionIdempotency'

const ensureLoggedInContext = async () => {
  const account = await ensureCurrentAccount()
  if (!account || account === 'guest') {
    throw new Error('请先登录后再进行额度兑换')
  }
}

const toNonNegativeInt = (value: unknown, fallback = 0) => {
  const n = Number(value)
  if (!Number.isFinite(n)) return fallback
  return Math.max(0, Math.floor(n))
}

export interface TaoyuanExchangeContext {
  exchangeRateDollarPerMoney: number
  exchangeRateQuotaPerMoney: number
  accountExchangeRate: number
  dailyImportLimitMoney: number
  dailyExportLimitMoney: number
  todayImportedMoney: number
  todayExportedMoney: number
  quota: number | null
  dollars: number | null
  loggedIn: boolean
  returnButtonEnabled: boolean
  returnButtonText: string
  returnButtonUrl: string
  aboutButtonEnabled: boolean
  aboutButtonText: string
  aboutDialogTitle: string
  aboutDialogContent: string
}

export interface TaoyuanExchangeResult {
  quota: number | null
  dollars: number | null
  moneySpent?: number
  moneyReceived?: number
  taoyuanMoney?: number
  saveRevision?: number
  quotaSpent?: number
  quotaGained?: number
  exchangeRateDollarPerMoney: number
  exchangeRateQuotaPerMoney: number
  dailyImportLimitMoney: number
  dailyExportLimitMoney: number
  todayImportedMoney: number
  todayExportedMoney: number
  idempotencyKey?: string
  idempotencyReplayed?: boolean
  transactionReceiptStatus?: string
}

export interface TaoyuanExchangeRequestOptions {
  activeSaveSlot: number | null
}

const shouldKeepTransactionKeyAfterError = (error: unknown): boolean => {
  if (!isProtectedApiError(error)) return true
  if (error.status === null) return true
  const status = typeof (error.data as any)?.transaction_receipt_status === 'string'
    ? (error.data as any).transaction_receipt_status
    : ''
  return status === 'pending' || status === 'compensation_pending'
}

export const fetchTaoyuanExchangeContext = async (): Promise<TaoyuanExchangeContext> => {
  const configRes = await fetch('/api/public-config', { credentials: 'include' })
  const configData = await parseJsonSafe(configRes)
  const exchangeRateDollarPerMoney = Number(configData?.taoyuan_exchange_rate_dollar_per_money) || 0.0002
  const accountExchangeRate = Number(configData?.exchange_rate) || 500000
  const exchangeRateQuotaPerMoney = Math.max(1, Math.round(exchangeRateDollarPerMoney * accountExchangeRate))
  const dailyImportLimitMoney = toNonNegativeInt(configData?.taoyuan_daily_import_limit_money, 0)
  const dailyExportLimitMoney = toNonNegativeInt(configData?.taoyuan_daily_export_limit_money, 0)
  const todayImportedMoney = toNonNegativeInt(configData?.taoyuan_today_imported_money, 0)
  const todayExportedMoney = toNonNegativeInt(configData?.taoyuan_today_exported_money, 0)

  const meRes = await fetch('/api/me', { credentials: 'include' })
  const meData = await parseJsonSafe(meRes)
  if (!meRes.ok || !meData?.ok) {
    return {
      exchangeRateDollarPerMoney,
      exchangeRateQuotaPerMoney,
      accountExchangeRate,
      dailyImportLimitMoney,
      dailyExportLimitMoney,
      todayImportedMoney,
      todayExportedMoney,
      quota: null,
      dollars: null,
      loggedIn: false,
      returnButtonEnabled: configData?.taoyuan_return_button_enabled !== false,
      returnButtonText: configData?.taoyuan_return_button_text || '返回首页',
      returnButtonUrl: configData?.taoyuan_return_button_url || '/',
      aboutButtonEnabled: configData?.taoyuan_about_button_enabled !== false,
      aboutButtonText: configData?.taoyuan_about_button_text || '关于游戏',
      aboutDialogTitle: configData?.taoyuan_about_dialog_title || '关于桃源乡',
      aboutDialogContent: configData?.taoyuan_about_dialog_content || '',
    }
  }

  return {
    exchangeRateDollarPerMoney,
    exchangeRateQuotaPerMoney,
    accountExchangeRate,
    dailyImportLimitMoney,
    dailyExportLimitMoney,
    todayImportedMoney,
    todayExportedMoney,
    quota: typeof meData?.user?.quota === 'number' ? meData.user.quota : null,
    dollars: typeof meData?.user?.dollars === 'number' ? meData.user.dollars : null,
    loggedIn: true,
    returnButtonEnabled: configData?.taoyuan_return_button_enabled !== false,
    returnButtonText: configData?.taoyuan_return_button_text || '返回首页',
    returnButtonUrl: configData?.taoyuan_return_button_url || '/',
    aboutButtonEnabled: configData?.taoyuan_about_button_enabled !== false,
    aboutButtonText: configData?.taoyuan_about_button_text || '关于游戏',
    aboutDialogTitle: configData?.taoyuan_about_dialog_title || '关于桃源乡',
    aboutDialogContent: configData?.taoyuan_about_dialog_content || '',
  }
}

const normalizeActiveSaveSlot = (slot: number | null | undefined): number => {
  const normalized = Number(slot)
  if (!Number.isInteger(normalized) || normalized < 0 || normalized > 2) {
    throw new Error('请先载入服务端存档后再进行额度兑换')
  }
  return normalized
}

export const importQuotaToTaoyuan = async (money: number, options: TaoyuanExchangeRequestOptions): Promise<TaoyuanExchangeResult> => {
  await ensureLoggedInContext()
  const activeSaveSlot = normalizeActiveSaveSlot(options.activeSaveSlot)
  const fingerprint = `import:${money}:${activeSaveSlot}`
  const idempotencyKey = getOrCreateTransactionIdempotencyKey('quota_exchange', fingerprint)
  let data: any
  try {
    const result = await fetchProtectedJson(async () => {
      const csrfToken = await ensureCurrentCsrfToken()
      return fetch('/api/taoyuan/quota/import', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
        body: JSON.stringify({
          money,
          direction: 'import',
          active_save_slot: activeSaveSlot,
          idempotency_key: idempotencyKey
        }),
      })
    }, {
      fallbackMessage: '导入额度失败',
      networkErrorMessage: '额度兑换服务连接失败，请检查网络或稍后重试'
    })
    data = result.data
  } catch (error) {
    if (!shouldKeepTransactionKeyAfterError(error)) {
      clearTransactionIdempotencyKey('quota_exchange', fingerprint)
    }
    throw error
  }
  clearTransactionIdempotencyKey('quota_exchange', fingerprint)
  return {
    moneyReceived: data.money_received,
    taoyuanMoney: typeof data.taoyuan_money === 'number' ? data.taoyuan_money : undefined,
    saveRevision: Number.isFinite(Number(data.save_revision))
      ? Math.max(0, Math.floor(Number(data.save_revision)))
      : undefined,
    quotaSpent: data.quota_spent,
    exchangeRateDollarPerMoney: data.exchange_rate_dollar_per_money,
    exchangeRateQuotaPerMoney: data.exchange_rate_quota_per_money,
    dailyImportLimitMoney: toNonNegativeInt(data.taoyuan_daily_import_limit_money, 0),
    dailyExportLimitMoney: toNonNegativeInt(data.taoyuan_daily_export_limit_money, 0),
    todayImportedMoney: toNonNegativeInt(data.today_imported_money, 0),
    todayExportedMoney: toNonNegativeInt(data.today_exported_money, 0),
    quota: typeof data.quota === 'number' ? data.quota : null,
    dollars: typeof data.dollars === 'number' ? data.dollars : null,
    idempotencyKey: typeof data.idempotency_key === 'string' ? data.idempotency_key : idempotencyKey,
    idempotencyReplayed: data.idempotency_replayed === true,
    transactionReceiptStatus: typeof data.transaction_receipt_status === 'string' ? data.transaction_receipt_status : undefined,
  }
}

export const exportTaoyuanToQuota = async (money: number, options: TaoyuanExchangeRequestOptions): Promise<TaoyuanExchangeResult> => {
  await ensureLoggedInContext()
  const activeSaveSlot = normalizeActiveSaveSlot(options.activeSaveSlot)
  const fingerprint = `export:${money}:${activeSaveSlot}`
  const idempotencyKey = getOrCreateTransactionIdempotencyKey('quota_exchange', fingerprint)
  let data: any
  try {
    const result = await fetchProtectedJson(async () => {
      const csrfToken = await ensureCurrentCsrfToken()
      return fetch('/api/taoyuan/quota/export', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
        body: JSON.stringify({
          money,
          direction: 'export',
          active_save_slot: activeSaveSlot,
          idempotency_key: idempotencyKey
        }),
      })
    }, {
      fallbackMessage: '导出额度失败',
      networkErrorMessage: '额度兑换服务连接失败，请检查网络或稍后重试'
    })
    data = result.data
  } catch (error) {
    if (!shouldKeepTransactionKeyAfterError(error)) {
      clearTransactionIdempotencyKey('quota_exchange', fingerprint)
    }
    throw error
  }
  clearTransactionIdempotencyKey('quota_exchange', fingerprint)
  return {
    moneySpent: data.money_spent,
    taoyuanMoney: typeof data.taoyuan_money === 'number' ? data.taoyuan_money : undefined,
    saveRevision: Number.isFinite(Number(data.save_revision))
      ? Math.max(0, Math.floor(Number(data.save_revision)))
      : undefined,
    quotaGained: data.quota_gained,
    exchangeRateDollarPerMoney: data.exchange_rate_dollar_per_money,
    exchangeRateQuotaPerMoney: data.exchange_rate_quota_per_money,
    dailyImportLimitMoney: toNonNegativeInt(data.taoyuan_daily_import_limit_money, 0),
    dailyExportLimitMoney: toNonNegativeInt(data.taoyuan_daily_export_limit_money, 0),
    todayImportedMoney: toNonNegativeInt(data.today_imported_money, 0),
    todayExportedMoney: toNonNegativeInt(data.today_exported_money, 0),
    quota: typeof data.quota === 'number' ? data.quota : null,
    dollars: typeof data.dollars === 'number' ? data.dollars : null,
    idempotencyKey: typeof data.idempotency_key === 'string' ? data.idempotency_key : idempotencyKey,
    idempotencyReplayed: data.idempotency_replayed === true,
    transactionReceiptStatus: typeof data.transaction_receipt_status === 'string' ? data.transaction_receipt_status : undefined,
  }
}
