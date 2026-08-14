import { BrainCircuit, Camera, Sparkles } from "lucide-react";

export default function CropHealth() {
  return (
    <div className="bg-surface rounded-2xl border border-gray-100 shadow-sm p-8">
      <div className="flex items-center gap-3 mb-4">
        <BrainCircuit size={26} className="text-purple-500 shrink-0" />
        <div>
          <h2 className="text-base font-bold text-ink">AI Crop Health Detection</h2>
          <p className="text-xs text-muted">Camera-based analysis — planned for post-prototype phase</p>
        </div>
      </div>

      <p className="text-sm text-muted leading-relaxed mb-6">
        This module will use an ESP32-CAM to capture images of each bed every 30 minutes, feeding a
        MobileNetV2 classifier to detect early signs of water stress, disease, or nutrient deficiency
        in the rape/covo crop — before symptoms are visible to the naked eye.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex items-start gap-3 bg-card rounded-xl p-4">
          <Camera size={18} className="text-brand mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-bold text-ink">Image Capture</p>
            <p className="text-xs text-muted mt-1">Scheduled captures per bed, consistent lighting via grow light trigger.</p>
          </div>
        </div>
        <div className="flex items-start gap-3 bg-card rounded-xl p-4">
          <Sparkles size={18} className="text-brand mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-bold text-ink">Health Classification</p>
            <p className="text-xs text-muted mt-1">Healthy / Early Stress / Overwatered / Drought / Nutrient Deficient.</p>
          </div>
        </div>
      </div>
    </div>
  );
}