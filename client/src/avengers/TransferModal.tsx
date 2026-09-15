import { useState } from 'react'
import type { AgentInfo, Conversation } from '../lib/types'

export function TransferModal({
  conv,
  agents,
  onTransfer,
  onClose,
}: {
  conv: Conversation
  agents: AgentInfo[]
  onTransfer: (toAgent: string) => void
  onClose: () => void
}) {
  const [selected, setSelected] = useState<string | null>(null)
  const available = agents.filter((a) => a.status === 'available' && !a.pendingOfferConvId)
  const others = agents.filter((a) => !available.includes(a) && a.status !== 'offline')
  const pending = conv.status === 'transferring'

  return (
    <div className="ah-modal-backdrop" onClick={onClose}>
      <div className="ah-modal" role="dialog" aria-label="Transfer conversation" data-testid="transfer-modal" onClick={(e) => e.stopPropagation()}>
        <div className="ah-modal-head">
          <span>Transfer conversation {conv.caseNumber ? `· ${conv.caseNumber}` : ''}</span>
          <button className="ah-tab-close" aria-label="Close" onClick={onClose}>
            &times;
          </button>
        </div>
        <div className="ah-modal-body">
          {pending ? (
            <div className="ah-muted" data-testid="transfer-pending">
              Waiting for <strong>{conv.transfer?.toAgentName}</strong> to accept the transfer. The chat stays with you until they do.
            </div>
          ) : (
            <>
              <p className="ah-muted">Select an available agent. The full chat history will be shared with them.</p>
              {available.length === 0 && (
                <div className="ah-empty-inline" data-testid="transfer-none">
                  No other agents are available right now.
                </div>
              )}
              <ul className="ah-agent-list">
                {available.map((a) => (
                  <li key={a.username}>
                    <label>
                      <input type="radio" name="transfer-agent" value={a.username} checked={selected === a.username} onChange={() => setSelected(a.username)} data-testid={`transfer-option-${a.username}`} />
                      <span className="ah-status-dot ah-dot-available" /> {a.name}
                      <span className="ah-muted"> · Available</span>
                    </label>
                  </li>
                ))}
                {others.map((a) => (
                  <li key={a.username} className="disabled">
                    <label>
                      <input type="radio" name="transfer-agent" disabled />
                      <span className={`ah-status-dot ah-dot-${a.status}`} /> {a.name}
                      <span className="ah-muted"> · {a.status === 'busy' ? 'In another conversation' : a.status === 'reconnecting' ? 'Reconnecting' : 'Away'}</span>
                    </label>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
        <div className="ah-modal-actions">
          <button className="ah-btn" onClick={onClose}>
            {pending ? 'Close' : 'Cancel'}
          </button>
          {!pending && (
            <button className="ah-btn ah-btn-primary" data-testid="transfer-confirm" disabled={!selected} onClick={() => selected && onTransfer(selected)}>
              Transfer
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
