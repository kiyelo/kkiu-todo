const STORAGE_KEY = 'kkiu-react-0.1'

export function loadLocalData(fallback) {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    return saved ? JSON.parse(saved) : fallback
  } catch {
    return fallback
  }
}

export function saveLocalData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

export const localRepository = {
  load: loadLocalData,
  save: saveLocalData,
}
