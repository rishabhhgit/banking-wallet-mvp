import { Response } from 'express'

interface SSEClient {
  id: string
  userId: string
  res: Response
}

const clients = new Map<string, SSEClient[]>()
let clientIdCounter = 0

export const addClient = (userId: string, res: Response): string => {
  const id = String(++clientIdCounter)

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  })

  res.write(`data: ${JSON.stringify({ type: 'connected', clientId: id })}\n\n`)

  const client: SSEClient = { id, userId, res }

  if (!clients.has(userId)) {
    clients.set(userId, [])
  }
  clients.get(userId)!.push(client)

  res.on('close', () => {
    removeClient(userId, id)
  })

  return id
}

export const removeClient = (userId: string, clientId: string): void => {
  const userClients = clients.get(userId)
  if (!userClients) return

  const index = userClients.findIndex((c) => c.id === clientId)
  if (index !== -1) {
    userClients.splice(index, 1)
  }

  if (userClients.length === 0) {
    clients.delete(userId)
  }
}

export const broadcastTransaction = (userId: string, data: unknown): void => {
  const userClients = clients.get(userId)
  if (!userClients || userClients.length === 0) return

  const payload = `data: ${JSON.stringify({ type: 'transaction', data })}\n\n`

  for (const client of userClients) {
    client.res.write(payload)
  }
}

export const getClientCount = (): number => {
  let count = 0
  for (const userClients of clients.values()) {
    count += userClients.length
  }
  return count
}
