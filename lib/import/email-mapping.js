import { findHeader, safeStr, extractUrl, normalizeDate, normHeader } from './normalize.js'

export const EMAIL_HEADER_KEYWORDS = {
    title: ['task', 'tasks', 'task name', 'email task', 'subject'],
    status: ['task status', 'status'],
    assigned_to: ['assigned to', 'assigned'],
    link_url: ['link', 'email link'],
    internal_approval: ['internal approval'],
    campaign_live_date: ['campaign live', 'flow live', 'campaign/flow live', 'live date'],
    live_data: ['live data'],
}

export const EMAIL_PREVIEW_COLS = [
    { field: 'title', label: 'Email Task' },
    { field: 'status', label: 'Status' },
    { field: 'link_url', label: 'Link' },
    { field: 'campaign_live_date', label: 'Live Date' },
    { field: 'live_data', label: 'Live Data' },
]

const STATUS_MAP = {
    'to be started': 'To Be Started',
    'in progress': 'In Progress',
    'pending review': 'To Be Started',
    'completed': 'Completed',
    'implemented': 'Implemented',
    'blocked': 'Blocked'
}

export function rowToEmailTask(row, headers, clientId) {
    const h = (field) => findHeader(headers, EMAIL_HEADER_KEYWORDS[field])

    const titleField = h('title') || headers[0]
    const title = safeStr(row[titleField])
    if (!title) return null

    const task = { client_id: clientId, title }

    const statusCol = h('status')
    if (statusCol) {
        const val = normHeader(row[statusCol])
        task.status = STATUS_MAP[val] || 'To Be Started'
    }

    const assignedCol = h('assigned_to')
    // NOTE: Usually assigned_to is managed via UI, but if we have a robust member lookup, we could map it.
    // For now, we follow the SEO pattern (user-selectable).

    const linkCol = h('link_url')
    if (linkCol) task.link_url = extractUrl(row[linkCol])

    const internalCol = h('internal_approval')
    if (internalCol) {
        const val = normHeader(row[internalCol])
        task.internal_approval = val === 'approved' ? 'Approved' : 'Pending'
    }

    const liveDateCol = h('campaign_live_date')
    if (liveDateCol) task.campaign_live_date = normalizeDate(row[liveDateCol])

    const liveDataCol = h('live_data')
    if (liveDataCol) task.live_data = normalizeDate(row[liveDataCol])

    return task
}
