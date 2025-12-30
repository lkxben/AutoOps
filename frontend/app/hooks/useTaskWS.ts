'use client'
import { useEffect, useRef, useState } from 'react'

export function useTaskWS(url: string) {
  const [messages, setMessages] = useState<any[]>([])
  const wsRef = useRef<WebSocket | null>(null)

  useEffect(() => {
    const ws = new WebSocket(url)
    wsRef.current = ws

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        setMessages((prev) => [...prev, data])
      } catch (err) {
        console.error('Invalid WS message', err)
      }
    }

    ws.onopen = () => console.log('WS connected')
    ws.onclose = () => console.log('WS disconnected')

    return () => ws.close()
  }, [url])

  const sendMessage = (msg: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg))
    }
  }

  return { messages, sendMessage }
}