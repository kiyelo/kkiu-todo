export const CIRCLE_NAME_LIMIT = 24
export const PROFILE_NAME_LIMIT = 20
export const TASK_TITLE_LIMIT = 280

const segmenter = typeof Intl !== 'undefined' && Intl.Segmenter
  ? new Intl.Segmenter(undefined, { granularity: 'grapheme' })
  : null

export const splitGraphemes = (value = '') => segmenter
  ? [...segmenter.segment(String(value))].map((part) => part.segment)
  : Array.from(String(value))

export const graphemeLength = (value = '') => splitGraphemes(value).length

export const limitGraphemes = (value, limit) => splitGraphemes(value).slice(0, limit).join('')

export const normalizeTaskTitle = (value = '') => limitGraphemes(String(value).trim(), TASK_TITLE_LIMIT)
