import { useEffect, useState } from "react";
import { Compass, RotateCw, Sun, TrendingUp } from "lucide-react";

// Illustrative preview of the planned single-axis (east-west) solar tracker —
// see PROJECT-OBJECTIVES.md section 2b. No tracker hardware exists yet, so
// this is a synced animation + derived readout, not live sensor data; the
// caption below says so explicitly rather than presenting it as telemetry.
const CYCLE_MS = 12000; // full east -> west sweep, matches the CSS animation duration
const MAX_TILT_DEG = 45;

function useTrackerAngle() {
  const [angleDeg, setAngleDeg] = useState(-MAX_TILT_DEG);

  useEffect(() => {
    let raf;
    const tick = () => {
      const phase = (performance.now() % CYCLE_MS) / CYCLE_MS; // 0..1
      // Ease-in-out to roughly match the CSS animation-timing-function below.
      const eased = phase < 0.5 ? 2 * phase * phase : 1 - Math.pow(-2 * phase + 2, 2) / 2;
      setAngleDeg(Math.round(-MAX_TILT_DEG + eased * (MAX_TILT_DEG * 2)));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return angleDeg;
}

export default function SolarTrackerCard() {
  const angleDeg = useTrackerAngle();
  const direction = angleDeg < -2 ? "East" : angleDeg > 2 ? "West" : "Zenith";

  return (
    <div className="bg-surface rounded-2xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Compass size={18} className="text-amber-500" />
          <h2 className="text-sm font-bold text-ink">SOLAR TRACKER</h2>
        </div>
        <span className="text-xs font-medium px-2.5 py-1 rounded-full text-brand" style={{ backgroundColor: "#16a34a1a" }}>
          Single-axis (E–W)
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[1.3fr_1fr] gap-4 items-center">
        <TrackerIllustration />

        <div className="space-y-4">
          <div>
            <p className="text-[11px] font-bold tracking-wide text-muted uppercase">Current Tilt</p>
            <p className="text-3xl font-bold text-ink leading-tight">
              {Math.abs(angleDeg)}&deg; <span className="text-lg text-muted font-semibold">{direction}</span>
            </p>
          </div>

          <div>
            <p className="text-[11px] font-bold tracking-wide text-muted uppercase mb-1">Sensing Mode</p>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-50 text-amber-600 border border-amber-100">
                <Sun size={12} /> LDR (real-time)
              </span>
            </div>
            <p className="text-[11px] text-muted mt-1.5">Astronomical sun-position fallback on ambiguous light</p>
          </div>

          <div className="flex items-center gap-2 pt-1 border-t border-gray-100">
            <TrendingUp size={14} className="text-brand shrink-0" />
            <p className="text-xs text-ink">
              <span className="font-bold text-brand">+10–15%</span> est. yield vs. a fixed panel
            </p>
          </div>
        </div>
      </div>

      <p className="text-[11px] text-muted mt-4 pt-3 border-t border-gray-100">
        Preview animation — tracker hardware not yet installed (see Project Objectives §2b). Values shown illustrate
        the planned behavior, not live sensor readings.
      </p>
    </div>
  );
}

function TrackerIllustration() {
  return (
    <div className="relative w-full aspect-[16/9] rounded-xl overflow-hidden" style={{
      background: "linear-gradient(180deg, #dbeafe 0%, #fef3c7 70%, #fef3c7 100%)",
    }}>
      {/* Sun arcing east (left) to west (right). Centering uses negative
          margins (not transform) so the arc keyframes — which set `transform`
          on this same element — don't clobber the centering offset. */}
      <div
        className="tracker-sun absolute w-7 h-7 rounded-full bg-amber-400 shadow-[0_0_18px_6px_rgba(251,191,36,0.55)]"
        style={{ left: "50%", top: "78%", marginLeft: "-14px", marginTop: "-14px" }}
      />

      {/* Ground */}
      <div className="absolute bottom-0 left-0 right-0 h-[34%]" style={{ backgroundColor: "#14532d" }} />
      <div className="absolute bottom-[30%] left-0 right-0 h-[6px] bg-black/10" />

      {/* Two-post tilt table, side elevation — same mechanism as the
          reference diagram: two fixed posts, a panel plank that pivots
          around a horizontal axis at post-top height (drawn edge-on, so
          "tilting" is just a 2D rotation, no fake 3D needed), with a small
          rotation-direction accent at the pivot like the reference's arrow. */}
      <div className="absolute left-1/2 bottom-[30%]" style={{ marginLeft: "-75px", width: "150px", height: "100px" }}>
        {/* Posts — fixed, do not rotate. Tall enough that the panel (half-
            length 75px) swinging ±45deg around the pivot at their top
            (throw = 75*sin(45deg) ≈ 53px) never reaches the ground. */}
        <div className="absolute bottom-0 left-[10px] w-2 h-[90px] rounded-sm bg-gradient-to-r from-slate-400 via-slate-500 to-slate-600" />
        <div className="absolute bottom-0 left-[10px] -translate-x-1/4 w-4 h-2 rounded-sm bg-slate-600" />
        <div className="absolute bottom-0 right-[10px] w-2 h-[90px] rounded-sm bg-gradient-to-r from-slate-400 via-slate-500 to-slate-600" />
        <div className="absolute bottom-0 right-[10px] translate-x-1/4 w-4 h-2 rounded-sm bg-slate-600" />

        {/* Pivot hinges at post-top height */}
        <div className="absolute bottom-[90px] left-[10px] -translate-x-1/2 w-3 h-3 rounded-full bg-slate-600 border border-slate-700" />
        <div className="absolute bottom-[90px] right-[10px] translate-x-1/2 w-3 h-3 rounded-full bg-slate-600 border border-slate-700" />

        {/* Rotation-axis accent, echoing the reference image's arrow */}
        <RotateCw size={20} className="absolute bottom-[98px] right-[-22px] text-amber-500" strokeWidth={2.5} />

        {/* Panel plank — the only moving part */}
        <div
          className="tracker-panel absolute bottom-[90px] left-1/2 w-[150px] h-[13px] -translate-x-1/2 rounded-full border border-slate-600 shadow-md overflow-hidden"
          style={{
            transformOrigin: "50% 50%",
            background: "linear-gradient(180deg, #38bdf8 0%, #0284c7 100%)",
            backgroundImage:
              "repeating-linear-gradient(90deg, rgba(255,255,255,0.55) 0px, rgba(255,255,255,0.55) 2px, transparent 2px, transparent 20px), linear-gradient(180deg, #38bdf8 0%, #0284c7 100%)",
          }}
        />
      </div>

      <style>{`
        @keyframes tracker-sun-arc {
          0%   { transform: translate(-220px, -10px); }
          25%  { transform: translate(-110px, -70px); }
          50%  { transform: translate(0px, -95px); }
          75%  { transform: translate(110px, -70px); }
          100% { transform: translate(220px, -10px); }
        }
        @keyframes tracker-panel-tilt {
          0%   { transform: rotate(-45deg); }
          50%  { transform: rotate(0deg); }
          100% { transform: rotate(45deg); }
        }
        .tracker-sun {
          animation: tracker-sun-arc 12s ease-in-out infinite;
        }
        .tracker-panel {
          animation: tracker-panel-tilt 12s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
