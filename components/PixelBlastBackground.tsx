"use client";

import dynamic from "next/dynamic";

// WebGL background — load on the client only (uses window/canvas).
const PixelBlast = dynamic(() => import("./PixelBlast"), { ssr: false });

export default function PixelBlastBackground() {
  return (
    <div className="about-bg" aria-hidden="true">
      <PixelBlast
        variant="circle"
        pixelSize={6}
        color="#ee4b1a"
        patternScale={3}
        patternDensity={1}
        pixelSizeJitter={0.5}
        enableRipples
        rippleSpeed={0.4}
        rippleThickness={0.12}
        rippleIntensityScale={1.5}
        speed={0.5}
        edgeFade={0.25}
        transparent
      />
    </div>
  );
}
