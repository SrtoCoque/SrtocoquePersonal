"use client";

import dynamic from "next/dynamic";
import "@/opengym/index.css";

const OpenGymApp = dynamic(() => import("@/opengym/App.jsx"), {
  ssr: false,
  loading: () => (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        color: "rgba(235,235,245,.32)",
        fontSize: 34,
      }}
    >
      …
    </div>
  ),
});

export function OpenGymEmbed() {
  return (
    <div id="opengym-root" data-theme="dark" data-accent="lime">
      <OpenGymApp />
    </div>
  );
}
