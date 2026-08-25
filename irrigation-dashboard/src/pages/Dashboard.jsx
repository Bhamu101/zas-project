import { useEffect, useRef, useState } from "react";
import "./Dashboard.css";

// Cinematic scroll-hero for the dashboard landing view. Adapted from a
// vanilla-JS scroll-choreography spec (originally a Bosnia/Mostar tourism
// page) — kept only the mechanism (sticky stage, scroll-linked title
// shrink/fade), dropped everything content-specific to that page (its
// photography, fonts, and multi-panel story structure all belonged to
// someone else's project). Scene is a slow crossfade between three
// user-supplied farm photos (public/images/hero-*.jpg) — they're three
// distinct, unrelated shots rather than layers of one continuous scene, so
// a crossfade slideshow fits better here than the original's sky/mid/fore
// parallax layering.
//
// Note this app's actual scrolling element is <main> (see App.jsx —
// `overflow-y-auto`), not the window, so scroll tracking attaches there.

const HERO_IMAGES = [
  "/images/hero-harvest.jpg",
  "/images/hero-sunset.jpg",
  "/images/hero-pivot.jpg",
  "/images/hero-solar.jpg",
];
const SLIDESHOW_INTERVAL_MS = 6500;

function clamp(v, min = 0, max = 1) {
  return Math.min(max, Math.max(min, v));
}

function smoothstep(edge0, edge1, value) {
  const x = clamp((value - edge0) / (edge1 - edge0));
  return x * x * (3 - 2 * x);
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

export default function Dashboard() {
  const heroRef = useRef(null);
  const worldRef = useRef(null);
  const [activeImage, setActiveImage] = useState(0);

  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reduceMotion.matches) return; // hold on the first image, no auto-cycling
    const id = setInterval(() => {
      setActiveImage((i) => (i + 1) % HERO_IMAGES.length);
    }, SLIDESHOW_INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const hero = heroRef.current;
    const world = worldRef.current;
    if (!hero || !world) return;

    const scrollContainer = hero.closest("main") || window;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    let smoothScroll = 0;
    let targetScroll = 0;
    let initialized = false;
    let rafId = null;

    function viewportHeight() {
      return scrollContainer === window ? window.innerHeight : scrollContainer.clientHeight;
    }

    function getScrollDistance() {
      const rect = hero.getBoundingClientRect();
      return clamp(-rect.top, 0, hero.offsetHeight - viewportHeight());
    }

    function update() {
      rafId = null;
      targetScroll = getScrollDistance();

      if (!initialized || reduceMotion.matches) {
        smoothScroll = targetScroll;
        initialized = true;
      } else {
        smoothScroll = lerp(smoothScroll, targetScroll, 0.14);
      }
      if (Math.abs(smoothScroll - targetScroll) < 0.08) smoothScroll = targetScroll;

      const introExit = smoothstep(60, 620, smoothScroll);

      world.style.setProperty("--kicker-y", `${introExit * -40}px`);
      world.style.setProperty("--kicker-opacity", 1 - introExit * 1.4);
      world.style.setProperty("--title-y", `${introExit * -140}px`);
      world.style.setProperty("--title-scale", 1 - introExit * 0.08);
      world.style.setProperty("--title-opacity", 1 - introExit);
      world.style.setProperty("--tagline-y", `${introExit * -100}px`);
      world.style.setProperty("--tagline-opacity", 1 - introExit * 1.2);
      world.style.setProperty("--shade-alpha", 0.12 + introExit * 0.28);

      if (Math.abs(smoothScroll - targetScroll) > 0.08) requestTick();
    }

    function requestTick() {
      if (rafId != null) return;
      rafId = requestAnimationFrame(update);
    }

    scrollContainer.addEventListener("scroll", requestTick, { passive: true });
    window.addEventListener("resize", requestTick);
    update();

    return () => {
      scrollContainer.removeEventListener("scroll", requestTick);
      window.removeEventListener("resize", requestTick);
      if (rafId != null) cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <section ref={heroRef} className="cinema-hero" aria-label="Welcome to Goho Rakangwara">
      <div className="cinema-stage">
        <div ref={worldRef} className="cinema-world">
          <div className="cinema-scene" aria-hidden="true" />

          <div className="cinema-scene-photos" aria-hidden="true">
            {HERO_IMAGES.map((src, i) => (
              <img
                key={src}
                src={src}
                alt=""
                className="cinema-scene-photo"
                style={{ opacity: i === activeImage ? 1 : 0 }}
              />
            ))}
          </div>

          <div className="cinema-scene-overlay" aria-hidden="true" />
          <div className="cinema-shade" aria-hidden="true" />

          <div className="cinema-copy">
            <h1 className="cinema-title">
              Welcome to
              <br />
              Goho Rakangwara
            </h1>
            <p className="cinema-tagline">Powering Growth — Where Agriculture, Technology and Commerce Converge</p>
          </div>
        </div>
      </div>
    </section>
  );
}
