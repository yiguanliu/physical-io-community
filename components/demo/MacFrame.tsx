"use client";

import { forwardRef } from "react";

interface MacFrameProps {
  children: React.ReactNode;
  /** Whether a disk is booted (drives the power LED + slot state). */
  booted: boolean;
}

/** Flat line-art compact Macintosh. The screen hosts the pixel OS; the floppy
 *  slot (exposed via ref) is the target for the insert animation. */
const MacFrame = forwardRef<HTMLSpanElement, MacFrameProps>(function MacFrame({ children, booted }, slotRef) {
  return (
    <div className={`mac${booted ? " is-on" : ""}`}>
      <div className="mac-body">
        <div className="mac-screen-bezel">
          <div className="mac-screen">{children}</div>
        </div>
        <div className="mac-chin">
          <span className="mac-brand">physical&middot;io</span>
          <span className="mac-slot" ref={slotRef} aria-hidden="true" />
          <span className="mac-led" aria-hidden="true" />
        </div>
      </div>
      <div className="mac-foot" aria-hidden="true" />
    </div>
  );
});

export default MacFrame;
