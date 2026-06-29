/**
 * Format a date string to "DD MMMM YYYY" in Indonesian locale.
 * @param {string|Date} dateStr
 * @returns {string}
 */
export const formatDate = (dateStr) => {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return '-'
  return date.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

/**
 * Format a date string to "HH:mm:ss".
 * @param {string|Date} dateStr
 * @returns {string}
 */
export const formatTime = (dateStr) => {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return '-'
  return date.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
}

/**
 * Format a date string to "DD MMMM YYYY, HH:mm:ss" in Indonesian locale.
 * @param {string|Date} dateStr
 * @returns {string}
 */
export const formatDateTime = (dateStr) => {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return '-'
  return `${formatDate(dateStr)}, ${formatTime(dateStr)}`
}

/**
 * Get initials from a name (first letter of the first two words).
 * @param {string} name
 * @returns {string}
 */
export const getInitials = (name) => {
  if (!name || typeof name !== 'string') return '??'
  const words = name.trim().split(/\s+/)
  if (words.length === 0) return '??'
  if (words.length === 1) return words[0].charAt(0).toUpperCase()
  return (words[0].charAt(0) + words[1].charAt(0)).toUpperCase()
}

/**
 * Return a Tailwind text color class based on face recognition confidence level.
 * @param {number} confidence - A value between 0 and 1
 * @returns {string} Tailwind CSS class
 */
export const confidenceColor = (confidence) => {
  if (typeof confidence !== 'number' || isNaN(confidence)) return 'text-gray-400'
  if (confidence > 0.8) return 'text-emerald-400'
  if (confidence > 0.6) return 'text-amber-400'
  return 'text-rose-400'
}

/**
 * Capitalize the first letter of a string.
 * @param {string} str
 * @returns {string}
 */
export const capitalizeFirst = (str) => {
  if (!str || typeof str !== 'string') return ''
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
}
