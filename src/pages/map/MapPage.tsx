import { useEffect, useState, useMemo } from 'react'
import { supabase } from '../../lib/supabase'
import type { Court } from '../../types'
import { Loader2, Navigation, MapPin, Crosshair, AlertCircle, Info, Phone, Globe, Clock, Sun, Lightbulb, ShoppingBag } from 'lucide-react'

const CURITIBA_CENTER: [number, number] = [-25.4284, -49.2733]
const MAX_DISTANCE_KM = 20

function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function formatDistance(distance: number): string {
  if (distance < 1) return `${Math.round(distance * 1000)} m`
  return `${distance.toFixed(1)} km`
}

export function MapPage() {
  const [courts, setCourts] = useState<Court[]>([])
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null)
  const [locationSource, setLocationSource] = useState<'gps' | 'fallback' | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [locating, setLocating] = useState(true)

  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLocation([pos.coords.latitude, pos.coords.longitude])
          setLocationSource('gps')
          setLocating(false)
        },
        () => {
          setUserLocation(CURITIBA_CENTER)
          setLocationSource('fallback')
          setLocating(false)
        },
        { enableHighAccuracy: true, timeout: 10000 }
      )
    } else {
      setUserLocation(CURITIBA_CENTER)
      setLocationSource('fallback')
      setLocating(false)
    }
  }, [])

  useEffect(() => {
    supabase
      .from('courts')
      .select('*')
      .then(({ data, error: err }) => {
        if (err) {
          setError('Erro ao carregar quadras.')
        } else {
          setCourts(data ?? [])
        }
        setLoading(false)
      })
  }, [])

  const courtsWithDistance = useMemo(() => {
    if (!userLocation) return []
    return courts
      .map((c) => {
        const distance = haversineDistance(
          userLocation[0],
          userLocation[1],
          c.latitude,
          c.longitude
        )
        return { ...c, distance }
      })
      .filter((c) => c.distance <= MAX_DISTANCE_KM)
      .sort((a, b) => a.distance - b.distance)
  }, [courts, userLocation])

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] md:h-[calc(100vh-5rem)]">
      <div className="flex items-center justify-between px-4 py-3 bg-slate-800/50 border-b border-white/5 shrink-0">
        <div className="flex items-center gap-2">
          <MapPin size={18} className="text-yellow-400" />
          <h1 className="text-lg font-bold text-white">Quadras Próximas</h1>
        </div>
        <div className="flex items-center gap-3 text-xs text-gray-400">
          {locating && (
            <span className="flex items-center gap-1">
              <Loader2 size={14} className="animate-spin" />
              Obtendo localização...
            </span>
          )}
          {!locating && userLocation && (
            <span className="flex items-center gap-1 text-emerald-400">
              <Crosshair size={14} />
              {courtsWithDistance.length} num raio de {MAX_DISTANCE_KM} km
            </span>
          )}
        </div>
      </div>

      {!locating && userLocation && (
        <div className="flex items-center gap-2 px-4 py-2 bg-slate-800/30 border-b border-white/5 shrink-0 text-xs text-gray-400">
          <Info size={14} className="shrink-0 text-yellow-500" />
          <span>
            Buscando num raio de <strong className="text-gray-300">{MAX_DISTANCE_KM} km</strong> a partir de{' '}
            <strong className="text-gray-300">{userLocation[0].toFixed(4)}, {userLocation[1].toFixed(4)}</strong>
            {locationSource === 'fallback' && (
              <span className="text-yellow-500">
                {' '}(localização não disponível — usando Curitiba como referência)
              </span>
            )}
            {locationSource === 'gps' && (
              <span className="text-emerald-500"> (sua localização atual via GPS)</span>
            )}
          </span>
          <span className="text-gray-500 ml-auto shrink-0">
            {courts.length} quadra(s) no banco
          </span>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={32} className="animate-spin text-yellow-400" />
          </div>
        )}

        {error && (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <AlertCircle size={32} className="mb-2 text-red-400" />
            <p className="text-red-400">{error}</p>
          </div>
        )}

        {!loading && !error && courtsWithDistance.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <MapPin size={40} className="mb-3 opacity-50" />
            <p className="text-lg font-medium">Nenhuma quadra encontrada</p>
            <p className="text-sm">
              Nenhuma das {courts.length} quadra(s) cadastrada(s) está num raio de {MAX_DISTANCE_KM} km
            </p>
          </div>
        )}

        {!loading && !error && courtsWithDistance.length > 0 && (
          <div className="p-4 space-y-3 max-w-2xl mx-auto">
            {courtsWithDistance.map((c) => (
              <div
                key={c.id}
                className="bg-slate-800/60 border border-white/5 rounded-xl overflow-hidden hover:bg-slate-700/60 transition-colors"
              >
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-white text-base truncate">
                        {c.name}
                      </h3>

                      {c.address && (
                        <p className="text-sm text-gray-400 flex items-start gap-1.5 mt-1">
                          <MapPin size={14} className="shrink-0 mt-0.5 text-gray-500" />
                          <span>{c.address}</span>
                        </p>
                      )}
                    </div>

                    <div className="shrink-0 flex items-center gap-1.5 bg-emerald-500/10 text-emerald-400 text-sm font-medium px-2.5 py-1 rounded-full h-fit">
                      <Navigation size={14} />
                      {formatDistance(c.distance)}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-3 text-xs text-gray-400">
                    {c.surface && (
                      <span className="flex items-center gap-1.5">
                        <Sun size={13} className="text-gray-500 shrink-0" />
                        {c.surface}
                      </span>
                    )}
                    {c.has_lighting && (
                      <span className="flex items-center gap-1.5">
                        <Lightbulb size={13} className="text-yellow-500 shrink-0" />
                        Iluminação
                      </span>
                    )}
                    {c.has_rental && (
                      <span className="flex items-center gap-1.5">
                        <ShoppingBag size={13} className="text-blue-400 shrink-0" />
                        Aluguel de campo
                      </span>
                    )}
                    {c.opening_hours && (
                      <span className="flex items-center gap-1.5">
                        <Clock size={13} className="text-gray-500 shrink-0" />
                        {c.opening_hours}
                      </span>
                    )}
                  </div>

                  {(c.phone || c.website) && (
                    <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-2 text-xs">
                      {c.phone && (
                        <a
                          href={`tel:${c.phone}`}
                          className="flex items-center gap-1.5 text-emerald-400 hover:text-emerald-300 transition-colors"
                        >
                          <Phone size={13} />
                          {c.phone}
                        </a>
                      )}
                      {c.website && (
                        <a
                          href={c.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 text-sky-400 hover:text-sky-300 transition-colors"
                        >
                          <Globe size={13} />
                          Site
                        </a>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
