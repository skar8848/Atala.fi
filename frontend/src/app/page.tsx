"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

/**
 * Loads an SVG file and injects it as inline HTML so GSAP can target individual paths.
 */
function InlineSvg({
  src,
  id,
  className,
  style,
}: {
  src: string;
  id: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  const [html, setHtml] = useState("");

  useEffect(() => {
    fetch(src)
      .then((r) => r.text())
      .then(setHtml);
  }, [src]);

  return (
    <div
      id={id}
      className={className}
      style={style}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

export default function LandingPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const animInitialized = useRef(false);

  const initAnimations = useCallback(() => {
    if (animInitialized.current) return;
    if (!containerRef.current) return;

    // Check if all InlineSvgs are loaded
    const sunPaths = containerRef.current.querySelectorAll("#sun-svg path");
    const blossomPaths1 = containerRef.current.querySelectorAll("#blossom-1 path");
    if (sunPaths.length === 0 || blossomPaths1.length === 0) return;

    animInitialized.current = true;

    const ctx = gsap.context(() => {
      // -- Set fills + remove strokes on sun + blossoms to mask the color image --
      gsap.set("#sun-svg path", { fill: "#ffffff", stroke: "none" });
      gsap.set("#blossom-1 path", { fill: "#ffffff", stroke: "none" });
      gsap.set("#blossom-2 path", { fill: "#ffffff", stroke: "none" });
      gsap.set("#blossom-3 path", { fill: "#ffffff", stroke: "none" });
      gsap.set("#blossom-4 path", { fill: "#ffffff", stroke: "none" });

      // -- SECTION 1: Hero scroll --
      const heroTl = gsap.timeline({
        scrollTrigger: {
          trigger: "#section-hero",
          start: "top top",
          end: "+=400%",
          scrub: 1,
          pin: true,
        },
      });

      // Phase 1: ATALA title fades out
      heroTl.to("#hero-title", { opacity: 0, duration: 1 });
      heroTl.to("#hero-tagline", { opacity: 0, duration: 0.5 }, "-=0.8");
      heroTl.to("#scroll-hint", { opacity: 0, duration: 0.3 }, "-=0.5");

      // Phase 2: Scene fades in
      heroTl.to("#sumi-scene", { opacity: 1, duration: 1.5 }, "-=0.3");

      // Phase 3: Sun white fill fades → red sun reveals
      heroTl.to("#sun-svg path", { fillOpacity: 0, duration: 1 }, "+=0.3");

      // Phase 4: Blossoms reveal one by one
      heroTl.to(
        "#blossom-1 path",
        { fillOpacity: 0, duration: 0.5 },
        "-=0.3"
      );
      heroTl.to("#blossom-2 path", { fillOpacity: 0, duration: 0.5 });
      heroTl.to("#blossom-3 path", { fillOpacity: 0, duration: 0.5 });
      heroTl.to("#blossom-4 path", { fillOpacity: 0, duration: 0.5 });

      // Phase 5: Hold on the fully revealed scene
      heroTl.to({}, { duration: 2 });

      // -- SECTION 2: Zoom + cocoon metamorphosis sequence --
      const zoomTl = gsap.timeline({
        scrollTrigger: {
          trigger: "#section-metamorphosis",
          start: "top top",
          end: "+=350%",
          scrub: 1,
          pin: true,
        },
      });

      // Gentle zoom into the cocoon area
      zoomTl.to("#zoom-scene", { scale: 1.6, duration: 3 });

      // First chrysalis appears after zoom
      zoomTl.to("#cocoon-1", { opacity: 1, duration: 0.5 }, "+=0.2");

      // Cocoon evolution: 1 → 2 → 3 → 4 → 5
      zoomTl.to("#cocoon-1", { opacity: 0, duration: 0.4 }, "+=0.3");
      zoomTl.to("#cocoon-2", { opacity: 1, duration: 0.4 }, "-=0.2");

      zoomTl.to("#cocoon-2", { opacity: 0, duration: 0.4 }, "+=0.3");
      zoomTl.to("#cocoon-3", { opacity: 1, duration: 0.4 }, "-=0.2");

      zoomTl.to("#cocoon-3", { opacity: 0, duration: 0.4 }, "+=0.3");
      zoomTl.to("#cocoon-4", { opacity: 1, duration: 0.4 }, "-=0.2");

      zoomTl.to("#cocoon-4", { opacity: 0, duration: 0.4 }, "+=0.3");
      zoomTl.to("#cocoon-5", { opacity: 1, duration: 0.4 }, "-=0.2");

      // cocoon_5 fades → larve6 (cocoon_monarque) appears
      zoomTl.to("#cocoon-5", { opacity: 0, duration: 0.4 }, "+=0.3");
      zoomTl.to("#cocoon-monarque", { opacity: 1, duration: 0.4 }, "-=0.2");

      // --- LIFTOFF: monarque1 separates from chrysalis ---
      zoomTl.to("#monarque1", { opacity: 1, duration: 0.3 }, "+=0.3");
      zoomTl.to("#cocoon-monarque", { opacity: 0, duration: 0.4 }, "-=0.2");

      // Lift off! monarque1 rises slightly and drifts left
      zoomTl.to("#monarque1", {
        y: "-10%",
        x: "-8%",
        duration: 0.8,
        ease: "power2.out",
      }, "+=0.1");

      // --- monarque1 fades out ---
      zoomTl.to("#monarque1", { opacity: 0, duration: 0.3 }, "+=0.1");

      // -- FLIGHT: butterfly descends during page scroll between sections --
      const flightTl = gsap.timeline({
        scrollTrigger: {
          trigger: "#flight-spacer",
          start: "top bottom",
          end: "bottom top",
          scrub: 1,
        },
      });

      // monarque2 appears and flies diagonal left-down
      // Adam + text fade in simultaneously during monarque2's flight
      flightTl.to("#monarque2", { opacity: 1, duration: 0.3 });
      flightTl.to("#monarque2", {
        left: "25%",
        top: "65%",
        duration: 1.5,
        ease: "power1.inOut",
      });
      flightTl.to("#adam-img", { opacity: 1, duration: 1.5, ease: "power2.inOut" }, "-=1.5");
      flightTl.to(".creation-content", { opacity: 1, duration: 1.5, ease: "power2.inOut" }, "-=1.5");

      // Crossfade: monarque2 → monarque3 at monarque2's end position
      flightTl.set("#monarque3", { left: "25%", top: "65%" });
      flightTl.to("#monarque2", { opacity: 0, duration: 0.5 });
      flightTl.to("#monarque3", { opacity: 1, duration: 0.5 }, "-=0.5");

      // monarque3 flies toward Adam — lands on the image already visible
      flightTl.to("#monarque3", {
        left: "36.3%",
        top: "47%",
        scale: 0.5,
        duration: 2,
        ease: "power2.out",
      });

    }, containerRef);

    return () => ctx.revert();
  }, []);

  // Poll for SVG load completion then init animations
  useEffect(() => {
    const interval = setInterval(() => {
      initAnimations();
      if (animInitialized.current) clearInterval(interval);
    }, 200);
    return () => clearInterval(interval);
  }, [initAnimations]);

  return (
    <div ref={containerRef} className="landing-root">
      {/* Google Fonts */}
      <link
        href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700&family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400&display=swap"
        rel="stylesheet"
      />

      <style jsx global>{`
        .landing-root {
          --bg: #ffffff;
          --ink: #1a1a1a;
          --red: #bc002d;
          background: var(--bg);
          color: var(--ink);
          font-family: "Cormorant Garamond", serif;
          overflow-x: hidden;
        }

        /* Paper grain overlay */
        .paper-grain {
          position: fixed;
          inset: 0;
          pointer-events: none;
          z-index: 9999;
          opacity: 0.04;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E");
          background-size: 256px 256px;
        }

        .landing-root h1,
        .landing-root h2,
        .landing-root .title-font {
          font-family: "Cinzel", serif;
          text-transform: uppercase;
          letter-spacing: 0.1em;
        }

        .landing-section {
          height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
        }

        /* ---- HERO ---- */
        #section-hero {
          flex-direction: column;
          text-align: center;
          overflow: hidden;
        }

        /* Landing nav — fixed top bar */
        .landing-nav {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1.5rem 2.5rem;
          z-index: 20;
        }

        .nav-docs {
          font-family: "Cinzel", serif;
          font-size: 0.85rem;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--ink);
          text-decoration: none;
          opacity: 0.7;
          transition: opacity 0.3s ease;
          position: relative;
          cursor: default;
        }

        .nav-docs:hover {
          opacity: 1;
          text-decoration: underline;
          text-decoration-color: var(--red);
          text-underline-offset: 4px;
        }

        .nav-docs .tooltip {
          position: absolute;
          top: 100%;
          left: 50%;
          transform: translateX(-50%);
          margin-top: 0.5rem;
          font-family: "Cormorant Garamond", serif;
          font-size: 0.75rem;
          font-style: italic;
          letter-spacing: 0.02em;
          text-transform: none;
          color: var(--red);
          white-space: nowrap;
          opacity: 0;
          transition: opacity 0.3s ease;
          pointer-events: none;
        }

        .nav-docs:hover .tooltip {
          opacity: 1;
        }

        .btn-launch-nav {
          font-family: "Cinzel", serif;
          font-size: 0.8rem;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          padding: 0.65rem 1.8rem;
          border: 1px solid var(--red);
          background: transparent;
          color: var(--red);
          cursor: pointer;
          text-decoration: none;
          display: inline-block;
          position: relative;
          overflow: hidden;
          transition: color 0.4s ease;
          z-index: 1;
        }

        .btn-launch-nav::before {
          content: "";
          position: absolute;
          inset: 0;
          background: var(--red);
          transform: scaleX(0);
          transform-origin: left;
          transition: transform 0.4s ease;
          z-index: -1;
        }

        .btn-launch-nav:hover {
          color: #fff;
        }

        .btn-launch-nav:hover::before {
          transform: scaleX(1);
        }

        /* Title overlay — starts centered, full page */
        .hero-overlay {
          position: absolute;
          inset: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          z-index: 10;
          pointer-events: none;
        }

        .hero-title {
          font-family: "Cinzel", serif;
          font-size: clamp(5rem, 18vw, 16rem);
          letter-spacing: 0.25em;
          padding-left: 0.25em;
          text-transform: uppercase;
          margin-bottom: 0.5rem;
          color: var(--ink);
        }

        .hero-tagline {
          font-size: clamp(1rem, 2.5vw, 1.5rem);
          font-style: italic;
          opacity: 0.7;
        }

        /* Sumi-e scene — fills viewport, centers the image */
        .sumi-scene {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0;
        }

        /* Inner container — sized BY the image, vectors positioned on top */
        .sumi-inner {
          position: relative;
          display: inline-block;
          max-width: 100%;
          max-height: 100%;
        }

        /* PNG image — drives the container size */
        .sumi-inner > img.sumi-bg {
          display: block;
          max-width: 100%;
          max-height: 100vh;
          height: auto;
          width: auto;
        }

        /* SVG vectors — positioned as % of the image */
        .sumi-inner .svg-element {
          position: absolute;
        }

        .sumi-inner .svg-element div svg {
          width: 100%;
          height: auto;
        }

        /* Positions computed from Frame 1.svg (827x628) */

        /* Sun — upper-left */
        #sun-svg {
          left: 10.1%;
          top: 19.7%;
          width: 11.6%;
        }

        /* Blossom 1 — at branch junction */
        #blossom-1 {
          left: 35.1%;
          top: 18.9%;
          width: 10.5%;
        }

        /* Blossom 2 — large cluster, center */
        #blossom-2 {
          left: 44.1%;
          top: 11%;
          width: 24.8%;
        }

        /* Blossom 3 — large cluster, right */
        #blossom-3 {
          left: 60.6%;
          top: 10.4%;
          width: 26.7%;
        }

        /* Blossom 4 — far right */
        #blossom-4 {
          left: 82.8%;
          top: 10.3%;
          width: 17.3%;
        }

        /* Scroll hint */
        .scroll-hint {
          position: absolute;
          bottom: 4rem;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.5rem;
          opacity: 0.4;
          animation: floatDown 2s ease-in-out infinite;
        }

        .scroll-hint span {
          font-family: "Cinzel", serif;
          font-size: 0.7rem;
          letter-spacing: 0.2em;
          text-transform: uppercase;
        }

        @keyframes floatDown {
          0%,
          100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(10px);
          }
        }

        /* ---- METAMORPHOSIS ---- */
        #section-metamorphosis {
          background: #fff;
          overflow: hidden;
          margin-top: -15vh;
        }

        .meta-layout {
          display: flex;
          width: 100%;
          max-width: 1400px;
          padding: 0 3% 0 5%;
          align-items: center;
          gap: 3rem;
        }

        .meta-text {
          flex: 1.3;
          z-index: 10;
          padding-right: 2rem;
        }

        .meta-text h2 {
          font-size: clamp(1.5rem, 3.5vw, 2.5rem);
          color: var(--red);
          margin-bottom: 1.5rem;
        }

        .meta-text p {
          font-size: clamp(1.05rem, 1.7vw, 1.35rem);
          line-height: 1.7;
          color: var(--ink);
          opacity: 0.85;
        }

        /* Cocoon scene — PNG-driven like section 1 */
        #zoom-scene {
          flex: 1;
          position: relative;
          display: inline-block;
          transform-origin: 45% 50%;
        }

        /* PNG branch image — drives the container size */
        #zoom-scene > img.zoom-bg {
          display: block;
          width: 100%;
          height: auto;
        }

        #zoom-scene .svg-element {
          position: absolute;
        }

        #zoom-scene .svg-element div svg {
          width: 100%;
          height: auto;
        }

        /* Cocoons positioned from Group 2 (viewBox 505x282) */
        .cocoon-stage {
          position: absolute;
        }

        .cocoon-stage div svg {
          width: 100%;
          height: auto;
        }

        /* All cocoons centered horizontally */
        #cocoon-1, #cocoon-2, #cocoon-3, #cocoon-4, #cocoon-5,
        #cocoon-monarque, #monarque1 {
          left: 50%;
          top: 50%;
          transform: translateX(-50%);
        }
        #cocoon-1 { width: 12%; opacity: 0; }
        #cocoon-2 { width: 8.5%; opacity: 0; }
        #cocoon-3 { width: 10%; opacity: 0; }
        #cocoon-4 { width: 10%; opacity: 0; }
        #cocoon-5 { width: 13.5%; opacity: 0; }

        /* Cocoon-monarque replaces cocoon_6 */
        #cocoon-monarque {
          position: absolute;
          width: 20.8%;
          opacity: 0;
        }

        #cocoon-monarque div svg { width: 100%; height: auto; }

        /* Monarque1 — butterfly outline, offset up ~4% relative to chrysalis (from reference frame) */
        #monarque1 {
          position: absolute;
          top: 58%;
          width: 20.8%;
          opacity: 0;
          transform-origin: center bottom;
        }

        #monarque1 div svg { width: 100%; height: auto; }

        /* Monarch flight frames — fixed position for inter-section flight */
        .flight-monarch {
          position: fixed;
          z-index: 50;
          pointer-events: none;
          opacity: 0;
          width: 15vw;
          transform: translate(-50%, -50%);
        }

        #monarque2 {
          top: 42%;
          left: 58%;
        }

        #monarque3 {
          top: 42%;
          left: 58%;
        }

        /* Flight spacer — scroll distance for butterfly descent */
        #flight-spacer {
          height: 100vh;
        }

        /* Wing flapping */
        @keyframes wingFlap {
          0%, 100% { transform: scaleX(1) rotate(0deg); }
          25% { transform: scaleX(0.8) rotate(-3deg); }
          50% { transform: scaleX(1) rotate(0deg); }
          75% { transform: scaleX(0.8) rotate(3deg); }
        }

        .flapping {
          animation: wingFlap 0.35s ease-in-out infinite;
        }

        /* ---- CREATION ---- */
        #section-creation {
          justify-content: flex-end;
          padding: 0 8%;
          overflow: hidden;
        }

        /* Adam image — anchored to bottom-left */
        .adam-container {
          position: absolute;
          left: 0;
          bottom: 0;
          width: 55%;
        }

        .adam-container img {
          display: block;
          width: 100%;
          height: auto;
          filter: grayscale(1) contrast(1.15) brightness(0.95);
          opacity: 0;
          mask-image: linear-gradient(to right, black 50%, transparent 100%),
                      linear-gradient(to bottom, transparent 0%, black 25%);
          mask-composite: intersect;
          -webkit-mask-image: linear-gradient(to right, black 50%, transparent 100%),
                              linear-gradient(to bottom, transparent 0%, black 25%);
          -webkit-mask-composite: source-in;
        }

        .creation-content {
          width: 38%;
          z-index: 10;
          opacity: 0;
        }

        .creation-content h2 {
          font-size: clamp(1.5rem, 3.5vw, 2.5rem);
          color: var(--red);
          margin-bottom: 1.5rem;
        }

        .creation-content p {
          font-size: clamp(1rem, 1.5vw, 1.2rem);
          line-height: 1.7;
          color: var(--ink);
          opacity: 0.85;
          margin-bottom: 2.5rem;
        }

        .btn-launch {
          font-family: "Cinzel", serif;
          font-size: 0.85rem;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          padding: 1rem 2.5rem;
          border: 1px solid var(--red);
          background: transparent;
          color: var(--red);
          cursor: pointer;
          transition: color 0.4s ease;
          text-decoration: none;
          display: inline-block;
          position: relative;
          overflow: hidden;
          z-index: 1;
        }

        .btn-launch::before {
          content: "";
          position: absolute;
          inset: 0;
          background: var(--red);
          transform: scaleX(0);
          transform-origin: left;
          transition: transform 0.4s ease;
          z-index: -1;
        }

        .btn-launch:hover {
          color: #fff;
        }

        .btn-launch:hover::before {
          transform: scaleX(1);
        }

        /* Responsive */
        @media (max-width: 768px) {
          .meta-layout {
            flex-direction: column;
            gap: 2rem;
          }

          .creation-bg {
            width: 100%;
            opacity: 0.3;
          }

          .creation-content {
            width: 90%;
          }

          #section-creation {
            justify-content: center;
          }
        }
      `}</style>

      {/* Paper grain overlay */}
      <div className="paper-grain" />

      {/* ===== SECTION 1: HERO SUMI-E ===== */}
      <section id="section-hero" className="landing-section">
        {/* Landing nav bar */}
        <nav className="landing-nav" id="landing-nav">
          <span className="nav-docs">Docs<span className="tooltip">Coming soon!</span></span>
          <a href="/markets" className="btn-launch-nav">Launch App</a>
        </nav>

        {/* Title overlay — starts full page, shrinks on scroll */}
        <div className="hero-overlay" id="hero-overlay">
          <div className="hero-title" id="hero-title">ATALA</div>
          <div className="hero-tagline" id="hero-tagline">
            Your Lending. Your Terms.
          </div>
          <div className="scroll-hint" id="scroll-hint">
            <span>Scroll</span>
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <path d="M12 5v14M5 12l7 7 7-7" />
            </svg>
          </div>
        </div>

        {/* Sumi-e scene — hidden initially, appears on scroll */}
        <div className="sumi-scene" id="sumi-scene">
          <div className="sumi-inner">
            {/* Color image — drives container size */}
            <img className="sumi-bg" src="/vectors/mountain_blossom.png" alt="" />

            {/* Vectors on top — positioned as % of 827x628 */}
            <InlineSvg id="sun-svg" className="svg-element" src="/vectors/carre.svg" />
            <InlineSvg id="blossom-1" className="svg-element" src="/vectors/blossom_1.svg" />
            <InlineSvg id="blossom-2" className="svg-element" src="/vectors/blossom_2.svg" />
            <InlineSvg id="blossom-3" className="svg-element" src="/vectors/blossom_3.svg" />
            <InlineSvg id="blossom-4" className="svg-element" src="/vectors/blossom_4.svg" />
          </div>
        </div>
      </section>

      {/* ===== SECTION 2: METAMORPHOSIS ===== */}
      <section id="section-metamorphosis" className="landing-section">
        <div className="meta-layout">
          <div className="meta-text">
            <h2 className="title-font">DeFi Lending, Reimagined</h2>
            <p>
              Explore and compare the best lending markets on Avalanche
              from a single interface. No middlemen. No risk managers.
              <br />
              Direct access to over a hundred markets with real-time on-chain data.
            </p>
          </div>

          <div id="zoom-scene">
            {/* Color PNG — drives container size */}
            <img className="zoom-bg" src="/vectors/branche2_fit.png" alt="" />

            {/* Larves 1→6 — evolution stages (PNG) */}
            <img id="cocoon-1" className="cocoon-stage" src="/vectors/larve1.png" alt="" />
            <img id="cocoon-2" className="cocoon-stage" src="/vectors/larve2.png" alt="" />
            <img id="cocoon-3" className="cocoon-stage" src="/vectors/larve3.png" alt="" />
            <img id="cocoon-4" className="cocoon-stage" src="/vectors/larve4.png" alt="" />
            <img id="cocoon-5" className="cocoon-stage" src="/vectors/larve5.png" alt="" />
            <img id="cocoon-monarque" className="cocoon-stage" src="/vectors/larve6.png" alt="" />

            {/* Butterfly outline only — lifts off from chrysalis */}
            <img id="monarque1" src="/vectors/monarque1.png" alt="" />

          </div>
        </div>
      </section>

      {/* Butterfly flight — fixed position, flies during scroll between sections */}
      <img id="monarque2" className="flight-monarch" src="/vectors/monarque2.png" alt="" />
      <img id="monarque3" className="flight-monarch" src="/vectors/monarque3.png" alt="" />

      {/* Spacer for flight scroll distance */}
      <div id="flight-spacer" />

      {/* ===== SECTION 3: CREATION ===== */}
      <section id="section-creation" className="landing-section">
        <div className="adam-container">
          <img id="adam-img" src="/vectors/adam_ripped.png" alt="" />
        </div>

        <div className="creation-content">
          <h2 className="title-font">Build Your Own Vault</h2>
          <p>
            Create customizable lending strategies tailored to your needs.
            Deploy your own vault, set your risk parameters, allocate across
            Silo V2 and Euler V2 markets.
            <br /><br />
            Your assets, your rules.
          </p>
          <a href="/markets" className="btn-launch">
            Launch App
          </a>
        </div>
      </section>
    </div>
  );
}
