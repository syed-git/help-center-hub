import { Link } from 'react-router-dom'

export default function Landing() {
  return (
    <div className="landing">
      <div className="landing-inner">
        <h1>Help Center Hub</h1>
        <p>Open each application in its own browser window to see the customer and agent sides of a live chat in real time.</p>
        <div className="landing-cards">
          <Link className="landing-card" to="/swift" data-testid="landing-swift">
            <span className="tag">Customer application</span>
            <h2>Swift Payments</h2>
            <p>Online banking with the Chat with Us assistant. Static bot flows, live agent hand-off, survey and transcript download.</p>
            <div className="creds">
              <span>
                <code>user1</code> / <code>Swift@123</code>
              </span>
              <span>
                <code>user2</code> / <code>Swift@123</code>
              </span>
            </div>
          </Link>
          <Link className="landing-card" to="/avengers" data-testid="landing-avengers">
            <span className="tag">Agent application</span>
            <h2>Avengers Hub</h2>
            <p>Agent desktop: go available, accept or decline incoming chats, transfer conversations, end chats and download transcripts.</p>
            <div className="creds">
              <span>
                <code>agent1</code> / <code>Avengers@123</code>
              </span>
              <span>
                <code>agent2</code> / <code>Avengers@123</code>
              </span>
              <span>
                <code>agent3</code> / <code>Avengers@123</code>
              </span>
            </div>
          </Link>
        </div>
      </div>
    </div>
  )
}
