import { useEffect, useRef } from "react";

interface LocationPickerMapProps {
  latitude: number;
  longitude: number;
  onChange: (lat: number, lng: number) => void;
}

declare const L: any;

export default function LocationPickerMap({ latitude, longitude, onChange }: LocationPickerMapProps) {
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    if (typeof L === "undefined") return;

    const lat = Number(latitude) || -8.1721;
    const lng = Number(longitude) || 113.7008;

    if (!mapRef.current) {
      const map = L.map(containerRef.current).setView([lat, lng], 14);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map);

      const marker = L.marker([lat, lng], { draggable: true }).addTo(map);

      marker.on("dragend", (e: any) => {
        const pos = e.target.getLatLng();
        onChange(pos.lat, pos.lng);
      });

      map.on("click", (e: any) => {
        const { lat, lng } = e.latlng;
        marker.setLatLng([lat, lng]);
        onChange(lat, lng);
      });

      mapRef.current = map;
      markerRef.current = marker;
    } else {
      const map = mapRef.current;
      const marker = markerRef.current;
      const currentLatLng = marker.getLatLng();
      if (Math.abs(currentLatLng.lat - lat) > 0.0001 || Math.abs(currentLatLng.lng - lng) > 0.0001) {
        const newLatLng = [lat, lng];
        marker.setLatLng(newLatLng);
        map.setView(newLatLng, map.getZoom());
      }
    }
  }, [latitude, longitude, onChange]);

  return (
    <div className="space-y-2">
      <div ref={containerRef} className="h-72 w-full rounded-xl border border-slate-300 shadow-inner z-0" />
      <p className="text-xs text-slate-500 font-medium italic text-center">
        💡 Tips: Klik di mana saja pada peta atau geser pin 📍 untuk meletakkan titik lokasi kedai Anda dengan akurat.
      </p>
    </div>
  );
}
