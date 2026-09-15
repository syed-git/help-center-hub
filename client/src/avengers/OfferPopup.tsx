import { Icon } from './icons'
import { languageName } from '../swift/i18n'
import { useEffect, useState } from 'react'
import type { Offer } from '../lib/types'

export function OfferPopup({ offer, onAccept, onDecline }: { offer: Offer; onAccept: () => void; onDecline: () => void }) {
  return <OfferCard key={offer.convId + offer.expiresAt} offer={offer} onAccept={onAccept} onDecline={onDecline} />
}

function OfferCard({ offer, onAccept, onDecline }: { offer: Offer; onAccept: () => void; onDecline: () => void }) {
  const [remaining, setRemaining] = useState(() => secondsLeft(offer.expiresAt))
  const [acting, setActing] = useState(false)

  useEffect(() => {
    const t = window.setInterval(() => setRemaining(secondsLeft(offer.expiresAt)), 500)
    return () => window.clearInterval(t)
  }, [offer.expiresAt])

  return (
    <div className="ah-offer" role="dialog" aria-label="Incoming conversation" data-testid="offer-popup">
      <div className="ah-offer-head">
        <span><Icon name="chat" /> Incoming Web Messaging conversation</span>
      </div>
      <div className="ah-offer-body">
        <div className="ah-offer-avatar"><Icon name="user" size={22} /></div>
        <div className="ah-offer-name" data-testid="offer-customer">{offer.customerName}</div>
        <div className="ah-offer-reason">
          {offer.reason} · {languageName(offer.language)}
        </div>
        <div className="ah-offer-tags">
          {offer.isTransfer && <span className="ah-pill ah-pill-blue">Transfer from {offer.fromAgentName}</span>}
          {offer.priority && <span className="ah-pill ah-pill-red">Priority · requeued</span>}
          {!offer.canDecline && <span className="ah-pill ah-pill-grey">Decline not permitted</span>}
        </div>
      </div>
      <div className="ah-offer-actions">
        <button
          className="ah-btn ah-btn-decline"
          data-testid="offer-decline"
          onClick={() => {
            setActing(true)
            onDecline()
          }}
          disabled={!offer.canDecline || acting}
          title={offer.canDecline ? 'Decline this conversation' : 'This request was already declined once and must be accepted'}
        >
          Decline
        </button>
        <button
          className="ah-btn ah-btn-accept"
          data-testid="offer-accept"
          onClick={() => {
            setActing(true)
            onAccept()
          }}
          disabled={acting}
        >
          Accept (<span data-testid="offer-timer">{remaining}</span>)
        </button>
      </div>
    </div>
  )
}

function secondsLeft(iso: string) {
  return Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 1000))
}
