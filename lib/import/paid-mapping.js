import { findHeader, safeStr, extractUrl, normHeader } from './normalize.js'

export const PAID_HEADER_KEYWORDS = {
    title: ['task', 'tasks', 'task name', 'paid ads task', 'ad set'],
    status: ['task status', 'status'],
    assigned_to: ['assigned to', 'assigned'],
    link_url: ['link', 'ad link', 'live link'],
    internal_approval: ['internal approval'],
}

export const PAID_PREVIEW_COLS = [
    { field: 'title', label: 'Paid Ads Task' },
    { field: 'status', label: 'Status' },
    { field: 'link_url', label: 'Ad Link' },
    { field: 'internal_approval', label: 'Internal Appr.' },
]

const STATUS_MAP = {
    'to be started': 'To Be Started',
    'in progress': 'In Progress',
    'pending review': 'Pending Review',
    'completed': 'Completed',
    'blocked': 'Blocked'
}

export function rowToPaidTask(row, headers, clientId) {
    const h = (field) => findHeader(headers, PAID_HEADER_KEYWORDS[field])

    const titleField = h('title') || headers[0]
    const title = safeStr(row[titleField])
    if (!title) return null

    const task = { client_id: clientId, title }

    const statusCol = h('status')
    if (statusCol) {
        const val = normHeader(row[statusCol])
        task.status = STATUS_MAP[val] || 'To Be Started'
    }

    const linkCol = h('link_url')
    if (linkCol) task.link_url = extractUrl(row[linkCol])

    const internalCol = h('internal_approval')
    if (internalCol) {
        const val = normHeader(row[internalCol])
        task.internal_approval = val === 'approved' ? 'Approved' : 'Pending'
    }

    return task
}
