import { NextRequest, NextResponse } from 'next/server'
import axios from 'axios'
import * as cheerio from 'cheerio'

export type Property = {
  id: string
  name: string
  address: string
  rent: string
  size: string
  layout: string
  lat: number
  lng: number
  url: string
}

type Bounds = {
  north: number
  south: number
  east: number
  west: number
}

async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const res = await axios.get('https://nominatim.openstreetmap.org/search', {
      params: { q: address, format: 'json', limit: 1, countrycodes: 'jp' },
      headers: { 'User-Agent': 'sales-map-app/1.0' },
      timeout: 5000,
    })
    if (res.data.length === 0) return null
    return { lat: parseFloat(res.data[0].lat), lng: parseFloat(res.data[0].lon) }
  } catch {
    return null
  }
}

async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const res = await axios.get('https://nominatim.openstreetmap.org/reverse', {
      params: { lat, lon: lng, format: 'json', zoom: 14, addressdetails: 1 },
      headers: { 'User-Agent': 'sales-map-app/1.0' },
      timeout: 5000,
    })
    const a = res.data.address
    const city = a.city || a.town || a.village || ''
    const suburb = a.suburb || a.neighbourhood || a.quarter || ''
    return `${city}${suburb}`
  } catch {
    return ''
  }
}

function isInPolygon(lat: number, lng: number, polygon: [number, number][]): boolean {
  let inside = false
  const n = polygon.length
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const [yi, xi] = polygon[i]
    const [yj, xj] = polygon[j]
    if ((yi > lat) !== (yj > lat) && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) {
      inside = !inside
    }
  }
  return inside
}

async function scrapeHomes(areaName: string, page = 1): Promise<Property[]> {
  const encoded = encodeURIComponent(areaName)
  const url = `https://www.homes.co.jp/chintai/list/?searchword=${encoded}&bldgtype=2&maxfloorplan=1K&maxmadori=6&maxmenseki=30&cond=hikari&page=${page}`

  const res = await axios.get(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept-Language': 'ja,en-US;q=0.9',
    },
    timeout: 10000,
  })

  const $ = cheerio.load(res.data)
  const properties: Omit<Property, 'lat' | 'lng'>[] = []

  $('.mod-mergeBuilding--rent').each((_, el) => {
    const name = $(el).find('.mod-mergeBuilding__title a').text().trim()
    const address = $(el).find('.mod-mergeBuilding__address').text().trim()
    const rent = $(el).find('.mod-priceLabel__number').first().text().trim()
    const size = $(el).find('.mod-mergeBuilding__detail').text().match(/(\d+\.?\d*m²)/)?.[1] || ''
    const layout = $(el).find('.mod-mergeBuilding__detail').text().match(/(1[KR])/)?.[1] || ''
    const href = $(el).find('.mod-mergeBuilding__title a').attr('href') || ''
    const id = href.split('/').filter(Boolean).pop() || String(Math.random())

    if (name && address) {
      properties.push({ id, name, address, rent, size, layout, url: `https://www.homes.co.jp${href}` })
    }
  })

  return properties as Property[]
}

export async function POST(req: NextRequest) {
  try {
    const { polygon }: { polygon: [number, number][] } = await req.json()
    if (!polygon || polygon.length < 3) {
      return NextResponse.json({ error: 'ポリゴンが不正です' }, { status: 400 })
    }

    const lats = polygon.map(p => p[0])
    const lngs = polygon.map(p => p[1])
    const centerLat = (Math.max(...lats) + Math.min(...lats)) / 2
    const centerLng = (Math.max(...lngs) + Math.min(...lngs)) / 2

    const areaName = await reverseGeocode(centerLat, centerLng)
    if (!areaName) {
      return NextResponse.json({ error: 'エリア名を取得できませんでした' }, { status: 400 })
    }

    const raw = await scrapeHomes(areaName)

    const results: Property[] = []
    for (const prop of raw.slice(0, 30)) {
      const geo = await geocodeAddress(prop.address)
      if (!geo) continue
      if (!isInPolygon(geo.lat, geo.lng, polygon)) continue
      results.push({ ...prop, lat: geo.lat, lng: geo.lng })
      await new Promise(r => setTimeout(r, 300))
    }

    return NextResponse.json({ properties: results, areaName })
  } catch (e: any) {
    console.error(e)
    return NextResponse.json({ error: 'スクレイピング中にエラーが発生しました', detail: e.message }, { status: 500 })
  }
}
