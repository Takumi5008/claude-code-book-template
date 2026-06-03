'use client'

import { useEffect, useRef, useState } from 'react'
import type { Property } from '@/app/api/search/route'

type Status = 'idle' | 'loading' | 'done' | 'error'

export default function SalesMap() {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const drawnLayersRef = useRef<any>(null)
  const markersRef = useRef<any[]>([])

  const [status, setStatus] = useState<Status>('idle')
  const [properties, setProperties] = useState<Property[]>([])
  const [areaName, setAreaName] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [polygon, setPolygon] = useState<[number, number][] | null>(null)

  useEffect(() => {
    if (mapInstanceRef.current) return

    const initMap = async () => {
      const L = (await import('leaflet')).default
      await import('leaflet-draw')

      delete (L.Icon.Default.prototype as any)._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      })

      const map = L.map(mapRef.current!).setView([35.6762, 139.6503], 14)
      mapInstanceRef.current = map

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map)

      const drawnItems = new L.FeatureGroup()
      map.addLayer(drawnItems)
      drawnLayersRef.current = drawnItems

      const drawControl = new (L as any).Control.Draw({
        edit: { featureGroup: drawnItems, edit: false, remove: false },
        draw: {
          polygon: { shapeOptions: { color: '#3b82f6', fillOpacity: 0.15 } },
          polyline: false,
          rectangle: { shapeOptions: { color: '#3b82f6', fillOpacity: 0.15 } },
          circle: false,
          circlemarker: false,
          marker: false,
        },
      })
      map.addControl(drawControl)

      map.on((L as any).Draw.Event.CREATED, (e: any) => {
        drawnItems.clearLayers()
        markersRef.current.forEach(m => map.removeLayer(m))
        markersRef.current = []
        drawnItems.addLayer(e.layer)
        setProperties([])
        setStatus('idle')

        const latlngs: any[] = e.layer.getLatLngs()[0] ?? e.layer.getLatLngs()
        const poly: [number, number][] = latlngs.map((p: any) => [p.lat, p.lng])
        setPolygon(poly)
      })
    }

    initMap()
  }, [])

  const handleSearch = async () => {
    if (!polygon) return
    setStatus('loading')
    setErrorMsg('')
    setProperties([])

    markersRef.current.forEach(m => mapInstanceRef.current?.removeLayer(m))
    markersRef.current = []

    try {
      const res = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ polygon }),
      })
      const data = await res.json()

      if (!res.ok) {
        setErrorMsg(data.error || 'エラーが発生しました')
        setStatus('error')
        return
      }

      setAreaName(data.areaName)
      setProperties(data.properties)
      setStatus('done')

      const L = (await import('leaflet')).default
      const map = mapInstanceRef.current
      if (!map) return

      data.properties.forEach((p: Property) => {
        const marker = L.marker([p.lat, p.lng])
          .addTo(map)
          .bindPopup(`
            <div style="min-width:200px">
              <div style="font-weight:bold;margin-bottom:4px">${p.name}</div>
              <div style="color:#555;font-size:13px">${p.address}</div>
              <div style="margin-top:6px">
                <span style="background:#3b82f6;color:#fff;padding:2px 6px;border-radius:4px;font-size:12px">${p.layout}</span>
                <span style="margin-left:6px;font-size:13px">${p.size}</span>
              </div>
              <div style="margin-top:4px;font-size:14px;font-weight:bold;color:#16a34a">${p.rent}万円〜</div>
              <a href="${p.url}" target="_blank" style="display:block;margin-top:6px;color:#3b82f6;font-size:12px">HOMESで見る →</a>
            </div>
          `)
        markersRef.current.push(marker)
      })
    } catch {
      setErrorMsg('通信エラーが発生しました')
      setStatus('error')
    }
  }

  return (
    <div className="flex flex-col h-screen">
      <div className="bg-white border-b px-4 py-3 flex items-center gap-4 shadow-sm">
        <h1 className="text-lg font-bold text-gray-800">営業マップ</h1>
        <span className="text-sm text-gray-500">1K/1R・30㎡以内・マンション・光回線対応</span>
        <div className="ml-auto flex items-center gap-3">
          {areaName && status === 'done' && (
            <span className="text-sm text-gray-600">
              「{areaName}」で <strong>{properties.length}件</strong> 見つかりました
            </span>
          )}
          <button
            onClick={handleSearch}
            disabled={!polygon || status === 'loading'}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:bg-blue-600 transition-colors"
          >
            {status === 'loading' ? '検索中...' : 'この範囲で検索'}
          </button>
        </div>
      </div>

      {status === 'error' && (
        <div className="bg-red-50 border-b border-red-200 px-4 py-2 text-red-700 text-sm">
          {errorMsg}
        </div>
      )}

      {status === 'idle' && !polygon && (
        <div className="bg-blue-50 border-b border-blue-200 px-4 py-2 text-blue-700 text-sm">
          地図上でエリアをドローイングしてください（左のツールバーから多角形または四角形を選択）
        </div>
      )}

      {polygon && status === 'idle' && (
        <div className="bg-green-50 border-b border-green-200 px-4 py-2 text-green-700 text-sm">
          エリアが選択されました。「この範囲で検索」ボタンを押してください。
        </div>
      )}

      {status === 'loading' && (
        <div className="bg-yellow-50 border-b border-yellow-200 px-4 py-2 text-yellow-700 text-sm flex items-center gap-2">
          <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          HOMESを検索中です。しばらくお待ちください...
        </div>
      )}

      <div ref={mapRef} className="flex-1" />

      {status === 'done' && properties.length > 0 && (
        <div className="bg-white border-t max-h-48 overflow-y-auto">
          {properties.map(p => (
            <a
              key={p.id}
              href={p.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 px-4 py-2 border-b hover:bg-gray-50 transition-colors"
            >
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-sm flex-shrink-0">
                {p.layout}
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-medium text-sm text-gray-800 truncate">{p.name}</div>
                <div className="text-xs text-gray-500 truncate">{p.address}</div>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="text-sm font-bold text-green-600">{p.rent}万円〜</div>
                <div className="text-xs text-gray-400">{p.size}</div>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  )
}
