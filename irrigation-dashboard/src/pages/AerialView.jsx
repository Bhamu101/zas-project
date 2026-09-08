import { useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, Circle, LayersControl } from "react-leaflet";
import { Satellite, Ruler } from "lucide-react";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

// Leaflet's default marker icon paths break under Vite's asset pipeline
// unless re-pointed at the bundled images explicitly.
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

// Farm coordinates from 17°49'47.9"S 31°01'39.8"E
const FARM_CENTER = [-17.829972, 31.027722];
const FARM_RADIUS_M = 120;

export default function AerialView() {
  const [radiusM, setRadiusM] = useState(FARM_RADIUS_M);

  return (
    <div className="space-y-4">
      <div className="bg-surface rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <Satellite size={26} className="text-brand shrink-0" />
            <div>
              <h2 className="text-base font-bold text-ink">Aerial Farm View</h2>
              <p className="text-xs text-muted">
                Satellite / aerial imagery centered on the farm &mdash; 17&deg;49'47.9"S 31&deg;01'39.8"E
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-muted bg-card px-3 py-2 rounded-xl">
            <Ruler size={14} className="text-brand shrink-0" />
            <span>Boundary radius</span>
            <input
              type="range"
              min="30"
              max="400"
              step="10"
              value={radiusM}
              onChange={(e) => setRadiusM(Number(e.target.value))}
              className="accent-brand"
            />
            <span className="font-semibold text-ink w-12 text-right">{radiusM} m</span>
          </div>
        </div>
      </div>

      <div className="bg-surface rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <MapContainer
          center={FARM_CENTER}
          zoom={17}
          style={{ height: "60vh", width: "100%" }}
          scrollWheelZoom
        >
          <LayersControl position="topright">
            <LayersControl.BaseLayer checked name="Satellite (Esri World Imagery)">
              <TileLayer
                attribution='Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics'
                url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                maxZoom={19}
              />
            </LayersControl.BaseLayer>
            <LayersControl.BaseLayer name="Street Map">
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                maxZoom={19}
              />
            </LayersControl.BaseLayer>
            <LayersControl.Overlay checked name="Place labels">
              <TileLayer
                attribution='Labels &copy; Esri'
                url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
                maxZoom={19}
              />
            </LayersControl.Overlay>
          </LayersControl>

          <Marker position={FARM_CENTER}>
            <Popup>
              Farm center<br />
              17&deg;49'47.9"S 31&deg;01'39.8"E
            </Popup>
          </Marker>
          <Circle
            center={FARM_CENTER}
            radius={radiusM}
            pathOptions={{ color: "#15803d", fillColor: "#15803d", fillOpacity: 0.12, weight: 2 }}
          />
        </MapContainer>
      </div>
    </div>
  );
}
