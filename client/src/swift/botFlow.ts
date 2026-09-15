/**
 * Language-independent structure of the static chatbot flow. All user-visible
 * text lives in ./i18n.ts and is looked up by the ids defined here.
 */
export type OptionId =
  | 'payments'
  | 'reports'
  | 'entitlements'
  | 'claims'
  | 'something_else'
  | 'existing_payment'
  | 'new_payment'
  | 'yes'
  | 'no'
  | 'chat_with_agent'
  | 'download_report'
  | 'verify_report'
  | 'create_template'
  | 'schedule_report'
  | 'unlock_user'
  | 'forgot_password'
  | 'mobile_token'
  | 'view_claims'
  | 'new_claim'
  | 'update_claim'

export type ResponseId = Exclude<OptionId, 'payments' | 'reports' | 'entitlements' | 'claims' | 'something_else' | 'existing_payment' | 'yes' | 'no' | 'chat_with_agent'>

export const MAIN_MENU: OptionId[] = ['payments', 'reports', 'entitlements', 'claims', 'something_else']
export const POST_PROMPT_OPTIONS: OptionId[] = ['yes', 'chat_with_agent', 'no']

export const SUB_MENUS: Partial<Record<OptionId, OptionId[]>> = {
  payments: ['existing_payment', 'new_payment'],
  reports: ['download_report', 'verify_report', 'create_template', 'schedule_report'],
  entitlements: ['unlock_user', 'forgot_password', 'mobile_token'],
  claims: ['view_claims', 'new_claim', 'update_claim'],
}

export const RESPONSE_IDS: ResponseId[] = [
  'new_payment',
  'download_report',
  'verify_report',
  'create_template',
  'schedule_report',
  'unlock_user',
  'forgot_password',
  'mobile_token',
  'view_claims',
  'new_claim',
  'update_claim',
]

/** Options that hand the customer to a live agent. */
export const AGENT_OPTIONS: OptionId[] = ['something_else', 'chat_with_agent']

export const REFERENCE_PATTERN = /^[A-Za-z0-9-]{6,20}$/
export const MAX_REFERENCE_ATTEMPTS = 3
export const GUIDE_LINK = '#/guides/make-a-payment'
