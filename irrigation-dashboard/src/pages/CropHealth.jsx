import { useRef, useState } from "react";
import {
  AlertTriangle,
  Bug,
  CheckCircle2,
  HelpCircle,
  ImageUp,
  Leaf,
  Sparkles,
} from "lucide-react";

import { apiFetch } from "../lib/apiClient";

const STATUS_META = {
  healthy: { label: "Healthy", icon: CheckCircle2, color: "#15803d", bg: "#15803d1a" },
  diseased: { label: "Disease detected", icon: AlertTriangle, color: "#dc2626", bg: "#dc26261a" },
  pest: { label: "Pest detected", icon: Bug, color: "#dc2626", bg: "#dc26261a" },
  nutrient_deficiency: { label: "Nutrient deficiency", icon: AlertTriangle, color: "#b45309", bg: "#f59e0b1a" },
  unclear: { label: "Unclear", icon: HelpCircle, color: "#6b7280", bg: "#6b72801a" },
};

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function CropHealth() {
  const [preview, setPreview] = useState(null);
  const [payload, setPayload] = useState(null); // { imageBase64, mimeType }
  const [diagnosis, setDiagnosis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  async function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    setDiagnosis(null);
    setError(null);

    const dataUrl = await readFileAsDataUrl(file);
    const [meta, base64] = dataUrl.split(",");
    const mimeType = meta.match(/data:(.*);base64/)?.[1] || file.type || "image/jpeg";

    setPreview(dataUrl);
    setPayload({ imageBase64: base64, mimeType });
  }

  async function analyze() {
    if (!payload) return;
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch("/api/crop-health/diagnose", {
        method: "POST",
        body: JSON.stringify({ ...payload, cropName: "Rape / Covo" }),
      });
      setDiagnosis(data.diagnosis);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setPreview(null);
    setPayload(null);
    setDiagnosis(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  const statusMeta = diagnosis ? STATUS_META[diagnosis.healthStatus] ?? STATUS_META.unclear : null;
  const StatusIcon = statusMeta?.icon ?? Leaf;

  return (
    <div className="space-y-4">
      <div className="bg-surface rounded-2xl border border-[var(--color-border)] shadow-sm p-8">
        <div className="flex items-center gap-3 mb-4">
          <Sparkles size={26} className="text-brand shrink-0" />
          <div>
            <h2 className="text-base font-bold text-[var(--color-ink)]">Diagnose a Plant</h2>
            <p className="text-xs text-[var(--color-muted)]">Upload a photo of a leaf or plant for an instant AI diagnosis</p>
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleFileChange}
        />

        {!preview && (
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[var(--color-border)] py-12 text-[var(--color-muted)] hover:border-brand hover:text-brand transition-colors"
          >
            <ImageUp size={28} />
            <span className="text-sm font-medium">Click to upload a photo</span>
          </button>
        )}

        {preview && (
          <div className="space-y-4">
            <img src={preview} alt="Selected plant" className="w-full max-h-80 object-cover rounded-xl border border-[var(--color-border)]" />
            {!diagnosis && (
              <div className="flex gap-3">
                <button
                  onClick={analyze}
                  disabled={loading}
                  className={`flex-1 flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold transition-colors ${
                    loading ? "bg-[var(--color-surface-2)] text-[var(--color-muted)] cursor-not-allowed" : "bg-brand text-[var(--color-brand-ink)] hover:bg-brand-strong"
                  }`}
                >
                  <Sparkles size={16} />
                  {loading ? "Analyzing…" : "Analyze Photo"}
                </button>
                <button
                  onClick={reset}
                  disabled={loading}
                  className="px-4 rounded-xl border border-[var(--color-border)] text-sm font-medium text-[var(--color-muted)] hover:bg-[var(--color-surface-2)] transition-colors"
                >
                  Choose different photo
                </button>
              </div>
            )}
          </div>
        )}

        {error && (
          <div className="mt-4 flex items-center gap-2 text-sm text-[var(--color-danger)] rounded-xl px-4 py-3" style={{ backgroundColor: "#ef44441a" }}>
            <AlertTriangle size={16} className="shrink-0" />
            {error}
          </div>
        )}

        {diagnosis && (
          <div className="mt-4 space-y-4">
            <div className="flex items-center gap-3 bg-[var(--color-surface-2)] rounded-xl p-4">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: statusMeta.bg }}>
                <StatusIcon size={22} style={{ color: statusMeta.color }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-[var(--color-ink)] truncate">{diagnosis.plantIdentified}</p>
                <p className="text-xs text-[var(--color-muted)]">{diagnosis.confidencePct}% confidence</p>
              </div>
              <span
                className="text-xs font-bold px-3 py-1.5 rounded-full shrink-0"
                style={{ color: statusMeta.color, backgroundColor: statusMeta.bg }}
              >
                {statusMeta.label}
              </span>
            </div>

            <div>
              <p className="text-xs font-bold text-[var(--color-muted)] uppercase tracking-wide">Condition</p>
              <p className="text-lg font-bold text-[var(--color-ink)] mt-0.5">{diagnosis.condition}</p>
              <p className="text-sm text-[var(--color-muted)] leading-relaxed mt-2">{diagnosis.description}</p>
            </div>

            <div className="rounded-xl p-4" style={{ backgroundColor: "#15803d0d", border: "1px solid #15803d33" }}>
              <p className="text-sm font-bold text-[var(--color-brand-text)] mb-1">Recommended Treatment</p>
              <p className="text-sm text-[var(--color-ink)] leading-relaxed">{diagnosis.treatment}</p>
            </div>

            <div>
              <p className="text-xs font-bold text-[var(--color-muted)] uppercase tracking-wide">Prevention</p>
              <p className="text-sm text-[var(--color-muted)] leading-relaxed mt-1">{diagnosis.preventionTips}</p>
            </div>

            <button
              onClick={reset}
              className="w-full rounded-xl py-3 text-sm font-bold bg-brand text-[var(--color-brand-ink)] hover:bg-brand-strong transition-colors"
            >
              Diagnose Another Plant
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
