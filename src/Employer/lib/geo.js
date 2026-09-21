// Geofencing for the punch clock. Employees may only check in / check out
// while physically inside the office radius (default 50m) around the office.

export const OFFICE_LAT = 8.9994852
export const OFFICE_LNG = 38.8206109
export const PUNCH_RADIUS_METERS = 50

export function haversineMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000
  const toRad = (d) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(a))
}

export function getCurrentPosition(options = { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }) {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) {
      reject(new Error('Geolocation is not supported on this device.'))
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy || null,
        }),
      (err) => {
        const reasons = {
          1: 'Location permission was denied. Allow location access to check in / check out.',
          2: 'Your location is currently unavailable.',
          3: 'Timed out while fetching your location. Try again.',
        }
        reject(new Error(reasons[err.code] || 'Unable to get your location.'))
      },
      options
    )
  })
}

export function distanceToOfficeMeters(latitude, longitude) {
  return haversineMeters(latitude, longitude, OFFICE_LAT, OFFICE_LNG)
}

export function formatDistance(meters) {
  if (meters >= 1000) return `${(meters / 1000).toFixed(1)}km`
  return `${Math.round(meters)}m`
}

// Returns { latitude, longitude, distanceMeters } or throws.
export async function getPunchLocation() {
  const pos = await getCurrentPosition()
  return { ...pos, distanceMeters: distanceToOfficeMeters(pos.latitude, pos.longitude) }
}