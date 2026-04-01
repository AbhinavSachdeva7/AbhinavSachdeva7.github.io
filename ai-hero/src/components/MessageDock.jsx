"use client";

import { motion, useReducedMotion, AnimatePresence } from "framer-motion";
import { useState, useRef, useEffect } from "react";

const VANILLA_SITE_URL = "/portfolio/index.html";
const LINKEDIN_URL = "https://www.linkedin.com/in/sachdeva-abhinav/";
const GITHUB_URL = "https://github.com/AbhinavSachdeva7";

function LinkedInIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
      <rect x="2" y="9" width="4" height="12" />
      <circle cx="4" cy="4" r="2" />
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.44 9.8 8.2 11.37.6.1.82-.26.82-.58v-2.04c-3.34.72-4.04-1.6-4.04-1.6-.54-1.38-1.33-1.75-1.33-1.75-1.09-.74.08-.73.08-.73 1.2.08 1.84 1.24 1.84 1.24 1.07 1.83 2.8 1.3 3.49 1 .1-.78.42-1.3.76-1.6-2.67-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.12-.3-.54-1.52.12-3.17 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 3-.4c1.02 0 2.04.13 3 .4 2.28-1.55 3.29-1.23 3.29-1.23.66 1.65.24 2.87.12 3.17.77.84 1.23 1.91 1.23 3.22 0 4.61-2.8 5.63-5.48 5.92.43.37.81 1.1.81 2.22v3.29c0 .32.22.7.83.58C20.56 21.8 24 17.3 24 12c0-6.63-5.37-12-12-12z" />
    </svg>
  );
}

const DOCK_ITEMS = [
  {
    id: "portfolio",
    emoji: "📁",
    name: "Portfolio",
    online: false,
    action: "portfolio",
    gradientColors: "#c70039, #7a0020",
  },
  {
    id: "contact",
    emoji: "📧",
    name: "Contact",
    online: false,
    action: "contact",
    gradientColors: "#c70039, #7a0020",
  },
  {
    id: "linkedin",
    icon: LinkedInIcon,
    name: "LinkedIn",
    online: false,
    action: "linkedin",
    gradientColors: "#0a66c2, #004182",
  },
  {
    id: "github",
    icon: GitHubIcon,
    name: "GitHub",
    online: false,
    action: "github",
    gradientColors: "#333, #111",
  },
];

// Asymmetric springs — softer expand, snappier collapse (from reference)
const SPRING_EXPAND = {
  type: "spring",
  stiffness: 300,
  damping: 30,
  mass: 0.8,
};
const SPRING_COLLAPSE = {
  type: "spring",
  stiffness: 500,
  damping: 35,
  mass: 0.6,
};
const SPRING_ITEMS = { type: "spring", stiffness: 400, damping: 30 };
const SPRING_SNAPPY = { type: "spring", stiffness: 500, damping: 30 };

export default function MessageDock() {
  const shouldReduceMotion = useReducedMotion();
  const [expandedIndex, setExpandedIndex] = useState(null);
  const dockRef = useRef(null);
  const pillRef = useRef(null);
  const [collapsedWidth, setCollapsedWidth] = useState(null);

  // Measure the pill's full rendered width (including padding + border) once on mount
  useEffect(() => {
    if (pillRef.current && collapsedWidth === null) {
      const w = pillRef.current.getBoundingClientRect().width;
      if (w > 0) setCollapsedWidth(w);
    }
  }, [collapsedWidth]);

  // Close on outside click
  useEffect(() => {
    function handleClick(e) {
      if (dockRef.current && !dockRef.current.contains(e.target)) {
        setExpandedIndex(null);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Close on Escape
  useEffect(() => {
    function handleKey(e) {
      if (e.key === "Escape") setExpandedIndex(null);
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, []);

  function handleItemClick(index) {
    if (expandedIndex === index) {
      // Second click: navigate
      const item = DOCK_ITEMS[index];
      setExpandedIndex(null);
      switch (item.action) {
        case "portfolio":
          window.location.href = VANILLA_SITE_URL;
          break;
        case "contact":
          window.location.href = `${VANILLA_SITE_URL}#contact`;
          break;
        case "linkedin":
          window.open(LINKEDIN_URL, "_blank");
          break;
        case "github":
          window.open(GITHUB_URL, "_blank");
          break;
      }
    } else {
      setExpandedIndex(index);
    }
  }

  const isExpanded = expandedIndex !== null;
  const selectedItem = isExpanded ? DOCK_ITEMS[expandedIndex] : null;

  const hoverAnim = shouldReduceMotion
    ? { scale: 1.02 }
    : { scale: 1.05, y: -2, transition: SPRING_SNAPPY };

  return (
    <div ref={dockRef} className="dock-wrapper">
      <motion.div
        ref={pillRef}
        className="dock-pill"
        initial={{ opacity: 0, y: 16, scale: 0.96 }}
        animate={{
          opacity: 1,
          y: 0,
          scale: 1,
          width: collapsedWidth ? (isExpanded ? 340 : collapsedWidth) : 200,
          background:
            isExpanded && selectedItem
              ? `linear-gradient(to right, ${selectedItem.gradientColors})`
              : "rgba(14, 14, 14, 0.9)",
          borderColor: isExpanded
            ? "rgba(255,255,255,0.12)"
            : "rgba(199, 0, 57, 0.22)",
        }}
        transition={{
          // Asymmetric springs: softer open, snappier close
          width: isExpanded ? SPRING_EXPAND : SPRING_COLLAPSE,
          background: { duration: 0.2, ease: "easeInOut" },
          borderColor: { duration: 0.2, ease: "easeInOut" },
        }}
      >
        <div className="dock-inner">
          {/* Left label — appears only when expanded */}
          <AnimatePresence mode="wait">
            {isExpanded && selectedItem ? (
              <motion.span
                key="label"
                className="dock-action-label"
                initial={{ opacity: 0, x: -8 }}
                animate={{
                  opacity: 1,
                  x: 0,
                  transition: { delay: 0.06, ...SPRING_ITEMS },
                }}
                exit={{
                  opacity: 0,
                  transition: { duration: 0.1, ease: "easeOut" },
                }}
              >
                {selectedItem.name} →
              </motion.span>
            ) : null}
          </AnimatePresence>

          {/* Item buttons */}
          {DOCK_ITEMS.map((item, index) => {
            const isSelected = expandedIndex === index;

            return (
              <motion.div
                key={item.id}
                animate={{
                  opacity: isExpanded && !isSelected ? 0 : 1,
                  y: isExpanded && !isSelected ? 40 : 0,
                  scale: isExpanded && !isSelected ? 0.8 : 1,
                  pointerEvents: isExpanded && !isSelected ? "none" : "auto",
                }}
                transition={{
                  ...SPRING_ITEMS,
                  delay: isExpanded && !isSelected ? index * 0.04 : 0,
                }}
                style={{ position: "relative" }}
              >
                <motion.button
                  className={`dock-item-btn${isSelected && isExpanded ? " dock-item-btn--selected" : ""}`}
                  onClick={() => handleItemClick(index)}
                  whileHover={!isExpanded ? hoverAnim : { scale: 1.03 }}
                  whileTap={{ scale: 0.96 }}
                  aria-label={item.name}
                  title={item.name}
                >
                  {item.emoji ? (
                    <span className="dock-item-emoji">{item.emoji}</span>
                  ) : (
                    <item.icon />
                  )}
                  {item.online && (
                    <motion.span
                      className="dock-online-dot"
                      initial={{ scale: 0.85, opacity: 0 }}
                      animate={{
                        scale: isExpanded && !isSelected ? 0.85 : 1,
                        opacity: isExpanded && !isSelected ? 0 : 1,
                      }}
                      transition={{
                        ...SPRING_ITEMS,
                        delay: isExpanded ? 0 : index * 0.1 + 0.5,
                      }}
                    />
                  )}
                </motion.button>
              </motion.div>
            );
          })}

          {/* Separator — hides when expanded
          <motion.span
            className="dock-sep"
            animate={{ opacity: isExpanded ? 0 : 1, scaleY: isExpanded ? 0 : 1 }}
            transition={{ ...SPRING_ITEMS, delay: isExpanded ? 0 : 0.3 }}
          /> */}

          {/* Hamburger / Close toggle
          <AnimatePresence mode="wait">
            {!isExpanded ? (
              <motion.button
                key="hamburger"
                className="dock-toggle-btn"
                onClick={() => setExpandedIndex(0)}
                whileHover={{ scale: 1.05, transition: SPRING_SNAPPY }}
                whileTap={{ scale: 0.95 }}
                aria-label="Open navigation"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1, transition: SPRING_ITEMS }}
                exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.1, ease: 'easeOut' } }}
              >
                <HamburgerIcon />
              </motion.button>
            ) : (
              <motion.button
                key="close"
                className="dock-toggle-btn dock-toggle-btn--close"
                onClick={() => setExpandedIndex(null)}
                whileHover={{ scale: 1.05, transition: SPRING_SNAPPY }}
                whileTap={{ scale: 0.95 }}
                aria-label="Close navigation"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1, transition: { delay: 0.1, ...SPRING_ITEMS } }}
                exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.1, ease: 'easeOut' } }}
              >
                <CloseIcon />
              </motion.button>
            )}
          </AnimatePresence> */}
        </div>
      </motion.div>
    </div>
  );
}

function HamburgerIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}
