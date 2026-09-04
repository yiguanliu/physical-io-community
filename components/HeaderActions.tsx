"use client";

import { useState } from "react";
import { CalendarIcon, CommunityIcon, InstagramIcon, LinkedInIcon, WhatsAppIcon } from "./SocialIcons";
import { COMMUNITY_FORM_URL, INSTAGRAM_URL, LINKEDIN_URL, LUMA_URL, WHATSAPP_URL } from "@/lib/site";

export default function HeaderActions() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <nav className="nav-links" aria-label="Main">
        <a className="nav-social" href={INSTAGRAM_URL} target="_blank" rel="noopener" aria-label="Instagram @physical.io" data-tooltip="Instagram">
          <InstagramIcon />
        </a>
        <a className="nav-social" href={LINKEDIN_URL} target="_blank" rel="noopener" aria-label="LinkedIn Physical I/O" data-tooltip="LinkedIn">
          <LinkedInIcon />
        </a>
        <a className="nav-social" href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" aria-label="Join the Physical I/O WhatsApp group" data-tooltip="WhatsApp Group">
          <WhatsAppIcon />
        </a>
        <a className="btn btn-primary nav-calendar" href={LUMA_URL} target="_blank" rel="noopener" aria-label="Physical I/O events calendar on Luma">
          <CalendarIcon /> Calendar
        </a>
        <a className="btn btn-accent nav-community" href={COMMUNITY_FORM_URL} target="_blank" rel="noopener noreferrer">
          <CommunityIcon /> Join Community
        </a>
      </nav>

      <div className={`mobile-nav${open ? " is-open" : ""}`}>
        <button
          className="mobile-nav-toggle"
          type="button"
          aria-expanded={open}
          aria-controls="mobile-nav-menu"
          aria-label={open ? "Close navigation menu" : "Open navigation menu"}
          onClick={() => setOpen((current) => !current)}
        >
          <span />
          <span />
          <span />
        </button>
        <nav id="mobile-nav-menu" className="mobile-nav-menu" aria-label="Mobile navigation">
          <a href={INSTAGRAM_URL} target="_blank" rel="noopener" onClick={() => setOpen(false)}>
            <InstagramIcon /> Instagram
          </a>
          <a href={LINKEDIN_URL} target="_blank" rel="noopener" onClick={() => setOpen(false)}>
            <LinkedInIcon /> LinkedIn
          </a>
          <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" onClick={() => setOpen(false)}>
            <WhatsAppIcon /> WhatsApp Group
          </a>
          <a href={LUMA_URL} target="_blank" rel="noopener" onClick={() => setOpen(false)}>
            <CalendarIcon /> Calendar
          </a>
          <a href={COMMUNITY_FORM_URL} target="_blank" rel="noopener noreferrer" onClick={() => setOpen(false)}>
            <CommunityIcon /> Join Community
          </a>
        </nav>
      </div>
    </>
  );
}
