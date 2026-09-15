import { formatTimeWithSeconds, formatDateTime } from './format'
import type { ChatMessage } from './types'

export interface TranscriptMeta {
  title: string
  caseNumber?: string | null
  customerName?: string
  agentName?: string | null
  startedAt?: string
  endedAt?: string | null
}

export function buildTranscript(messages: ChatMessage[], meta: TranscriptMeta): string {
  const lines: string[] = []
  lines.push(meta.title)
  lines.push('='.repeat(meta.title.length))
  if (meta.caseNumber) lines.push(`Case: ${meta.caseNumber}`)
  if (meta.customerName) lines.push(`Customer: ${meta.customerName}`)
  if (meta.agentName) lines.push(`Agent: ${meta.agentName}`)
  if (meta.startedAt) lines.push(`Started: ${formatDateTime(meta.startedAt)}`)
  if (meta.endedAt) lines.push(`Ended: ${formatDateTime(meta.endedAt)}`)
  lines.push(`Generated: ${formatDateTime(new Date().toISOString())}`)
  lines.push('')
  for (const m of messages) {
    const time = formatTimeWithSeconds(m.ts)
    if (m.kind === 'system') lines.push(`[${time}] *** ${m.text} ***`)
    else lines.push(`[${time}] ${m.senderName}: ${m.text}${m.link ? ` (${m.link.label}: ${m.link.href})` : ''}`)
  }
  return lines.join('\n')
}

export function downloadTranscript(messages: ChatMessage[], meta: TranscriptMeta, fileName: string) {
  const blob = new Blob([buildTranscript(messages, meta)], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
