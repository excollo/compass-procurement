export function formatElapsed(ms) {
  if (!ms || ms <= 0) return '0m'
  const totalSeconds = Math.floor(ms / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  if (hours === 0 && minutes === 0) return 'Just now'
  if (hours === 0) return `${minutes}m`
  return `${hours}h ${minutes}m`
}

export function computeResponseSLA(messages, slaHours = 24) {
  if (!messages || messages.length === 0) return null

  const sorted = [...messages].sort(
    (a, b) => new Date(b.sent_at) - new Date(a.sent_at)
  )

  // Timer starts from the last message sent by us (bot or operator)
  const lastOutboundMsg = sorted.find(m => m.sender_type === 'bot' || m.sender_type === 'operator')
  if (!lastOutboundMsg) return null

  const lastOutboundTime = new Date(lastOutboundMsg.sent_at)

  // If vendor has replied after our last message, timer stops
  const vendorRepliedAfterOutbound = messages.some(
    m => m.sender_type === 'vendor' && new Date(m.sent_at) > lastOutboundTime
  )

  if (vendorRepliedAfterOutbound) return null

  const elapsedMs = Math.max(0, Date.now() - lastOutboundTime)
  const windowMs = slaHours * 3600000
  const breached = elapsedMs > windowMs
  const progress = Math.min((elapsedMs / windowMs) * 100, 100)

  let color = 'green'
  if (breached) color = 'red'
  else if (progress > 75) color = 'amber'

  return {
    elapsedMs,
    breached,
    progress,
    color,
    label: formatElapsed(elapsedMs),
    windowLabel: `${slaHours}h`,
    lastBotFormatted: lastOutboundTime.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }
}

export function getLatestCommunicationState(messages) {
  if (!messages || messages.length === 0) return 'pending'
  
  const sorted = [...messages].sort(
    (a, b) => new Date(b.sent_at) - new Date(a.sent_at)
  )

  const latest = sorted[0]
  
  // If the last message is from vendor, we need action (responded)
  if (latest.sender_type === 'vendor') return 'action_required'
  
  // If the last message is from bot or operator, we are waiting on vendor
  if (latest.sender_type === 'bot' || latest.sender_type === 'operator') return 'waiting_vendor'

  return latest.communication_state || 'pending'
}
