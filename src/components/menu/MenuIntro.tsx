"use client";

import { useEffect, useState } from "react";

interface MenuIntroProps {
  name: string;
  tagline?: string | null;
}

/**
 * Cinematic welcome splash — shown on first QR scan.
 * Fades out automatically after ~2.2 s, unmounts after 3 s.
 * No user interaction required.
 */
export function MenuIntro({ name, tagline }: MenuIntroProps) {
  const [fading, setFading] = useState(false);
  const [gone, setGone] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setFading(true), 2100);
    const t2 = setTimeout(() => setGone(true), 3000);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  if (gone) return null;

  return (
    <>
      <style>{`
        @keyframes _iUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes _iLine {
          from { width: 0; }
          to   { width: 72px; }
        }
        @keyframes _iFade {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        .lux-intro-wrap {
          transition: opacity 0.85s cubic-bezier(0.4, 0, 0.2, 1),
                      visibility 0.85s cubic-bezier(0.4, 0, 0.2, 1);
        }
      `}</style>

      <div
        className="lux-intro-wrap fixed inset-0 z-[9999] flex items-center justify-center"
        style={{
          background: "#0a0806",
          opacity: fading ? 0 : 1,
          visibility: fading ? "hidden" : "visible",
          pointerEvents: fading ? "none" : "auto",
        }}
      >
        <div style={{ textAlign: "center", padding: "0 28px" }}>
          {/* Restaurant name */}
          <div
            style={{
              fontFamily: "var(--font-cormorant, 'Georgia', serif)",
              fontSize: "clamp(32px, 10vw, 52px)",
              fontWeight: 600,
              fontStyle: "italic",
              color: "#c49a3c",
              letterSpacing: "0.01em",
              opacity: 0,
              animation: "_iUp 0.95s cubic-bezier(0.4,0,0.2,1) forwards 0.25s",
            }}
          >
            {name}
          </div>

          {/* Gold divider line */}
          <div
            style={{
              height: 1,
              background:
                "linear-gradient(90deg, transparent, #c49a3c, transparent)",
              margin: "14px auto",
              width: 0,
              animation: "_iLine 0.9s ease forwards 0.9s",
            }}
          />

          {/* Tagline */}
          {tagline && (
            <div
              style={{
                fontFamily: "var(--font-outfit, sans-serif)",
                fontSize: 11,
                fontWeight: 400,
                letterSpacing: "0.26em",
                textTransform: "uppercase",
                color: "#a89b8c",
                opacity: 0,
                animation: "_iFade 0.9s ease forwards 1.6s",
              }}
            >
              {tagline}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
