import { useRef } from "react";
import ParticleOrb from "./components/ParticleOrb.jsx";
import ChatInterface from "./components/ChatInterface.jsx";
import MessageDock from "./components/MessageDock.jsx";

export default function Hero() {
  const orbRef = useRef(null);

  return (
    <div className="hero">
      {/* Minimal sticky header */}
      <header className="hero-header">
        <a
          href="/"
          className="hero-logo"
          aria-label="Back to full portfolio"
        >
          <img
            src="/portfolio/images/as.svg"
            alt="AS"
            width="40"
            height="40"
          />
        </a>
      </header>

      {/* Main hero content — vertically centered */}
      <main className="hero-main">
        <ParticleOrb ref={orbRef} />
        <ChatInterface orbRef={orbRef} />
      </main>

      {/* Navigation dock — always visible at bottom */}
      <MessageDock />
    </div>
  );
}
