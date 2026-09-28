// Geofencing for the punch clock. Employees may only check in / check out
// while physically inside the office radius configured in HR Settings.

let geoConfig = {
  officeLatitude: 8.999654748138806,
  officeLongitude: 38.820610900000005,
  allowedRadiusMeters: 100,
  geoRestrictionEnabled: true,
}

export function setGeoConfig(newConfig = {}) {
  if (!newConfig) return
  geoConfig = {
    ...geoConfig,
    officeLatitude:
      newConfig.officeLatitude !== undefined ? newConfig.officeLatitude : geoConfig.officeLatitude,
    officeLongitude:
      newConfig.officeLongitude !== undefined ? newConfig.officeLongitude : geoConfig.officeLongitude,
    allowedRadiusMeters:
      Number(newConfig.allowedRadiusMeters) || geoConfig.allowedRadiusMeters,
    geoRestrictionEnabled:
      newConfig.geoRestrictionEnabled !== undefined
        ? Boolean(newConfig.geoRestrictionEnabled)
        : geoConfig.geoRestrictionEnabled,
  }
}

export function getGeoConfig() {
  return geoConfig
}

export function isGeoRestrictionEnabled() {
  return geoConfig.geoRestrictionEnabled !== false
}

export function getPunchRadiusMeters() {
  return Number(geoConfig.allowedRadiusMeters) || 100
}

// Fallback exported constants for backwards compatibility
export const OFFICE_LAT = 8.999654748138806
export const OFFICE_LNG = 38.820610900000005
export const PUNCH_RADIUS_METERS = 100

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
  const officeLat = geoConfig.officeLatitude ?? OFFICE_LAT
  const officeLng = geoConfig.officeLongitude ?? OFFICE_LNG
  return haversineMeters(latitude, longitude, officeLat, officeLng)
}

export function formatDistance(meters) {
  if (!Number.isFinite(meters)) return '0m'
  if (meters >= 1000) return `${(meters / 1000).toFixed(1)}km`
  return `${Math.round(meters)}m`
}

// Returns { latitude, longitude, distanceMeters, verified } or throws if geo restriction is on and device location is unavailable.
export async function getPunchLocation() {
  if (!isGeoRestrictionEnabled()) {
    try {
      if ('geolocation' in navigator) {
        const pos = await getCurrentPosition({ timeout: 2000, enableHighAccuracy: false })
        return { ...pos, distanceMeters: 0, verified: true }
      }
    } catch {
      // Harmless when geo restriction is disabled by HR Admin
    }
    return { latitude: null, longitude: null, accuracy: null, distanceMeters: 0, verified: true }
  }

  const pos = await getCurrentPosition()
  return { ...pos, distanceMeters: distanceToOfficeMeters(pos.latitude, pos.longitude), verified: true }
}