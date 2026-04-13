import * as React from "react";
import "./ai-loader.css";

interface LoaderProps {
  size?: number;
  text?: string;
  /** When true, fills the parent container instead of the full viewport */
  contained?: boolean;
}

export const AILoader: React.FC<LoaderProps> = ({
  size = 180,
  text = "Generating",
  contained = false,
}) => {
  const letters = text.split("");

  const wrapStyle: React.CSSProperties = contained
    ? {
        position: "absolute",
        inset: 0,
        zIndex: 10,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(to bottom, #0d1b4b, #0f172a, #020207)",
      }
    : {
        position: "fixed",
        inset: 0,
        zIndex: 50,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(to bottom, #1a3379, #0f172a, #000)",
      };

  return (
    <div style={wrapStyle}>
      <div
        style={{
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          userSelect: "none",
          width: size,
          height: size,
        }}
      >
        {letters.map((letter, index) => (
          <span
            key={index}
            className="ai-loader-letter"
            style={{
              display: "inline-block",
              color: "white",
              opacity: 0.4,
              animationDelay: `${index * 0.1}s`,
              fontSize: size * 0.1,
              fontFamily: "var(--font-mono)",
              letterSpacing: "0.05em",
            }}
          >
            {letter}
          </span>
        ))}

        <div
          className="ai-loader-circle"
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "50%",
          }}
        />
      </div>
    </div>
  );
};
