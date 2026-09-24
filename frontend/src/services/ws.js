import { BASE_URL } from './api'

// Opens ONE persistent WebSocket per poll, wired straight to the backend's
// /api/polls/:id/live route. No frontend polling loop — every update
// arrives pushed from the server the instant a vote is processed.
export function connectPollSocket(pollId, { onMessage, onOpen, onClose }) {
  const wsBase = BASE_URL.replace(/^http/, 'ws').replace(/\/api$/, '')
  const socket = new WebSocket(`${wsBase}/api/polls/${pollId}/live`)

  socket.onopen = () => onOpen?.()
  socket.onclose = () => onClose?.()
  socket.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data)
      onMessage?.(data)
    } catch {
      // ignore malformed frames
    }
  }

  return () => socket.close()
}
