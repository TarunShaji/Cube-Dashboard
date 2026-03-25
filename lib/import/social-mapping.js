import { findHeader, safeStr, extractUrl, normalizeDate, normHeader } from './normalize.js'

export const SOCIAL_HEADER_KEYWORDS = {
    title: ['task', 'tasks', 'task name', 'social media task', 'post', 'post name'],
    status: ['task status', 'status'],
    assigned_to: ['assigned to', 'assigned'],
    link_url: ['link', 'ad link'],
    live_link: ['live link'],
    live_date: ['live date', 'post live date', 'go live date'],
    internal_approval: ['internal approval'],
}

export const SOCIAL_PREVIEW_COLS = [
    { field: 'title', label: 'Social Media Task' },
    { field: 'status', label: 'Status' },
    { field: 'link_url', label: 'Link' },
    { field: 'live_link', label: 'Live Link' },
    { field: 'live_date', label: 'Live Date' },
    { field: 'internal_approval', label: 'Internal Appr.' },
]

const STATUS_MAP = {
    'to be started': 'To Be Started',
    'in progress': 'In Progress',
    'pending review': 'To Be Started',
    'completed': 'Completed',
    'implemented': 'Implemented',
    'blocked': 'Blocked'
}

export function rowToSocialTask(row, headers, clientId) {
    const h = (field) => findHeader(headers, SOCIAL_HEADER_KEYWORDS[field])

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

    const liveLinkCol = h('live_link')
    if (liveLinkCol) task.live_link = extractUrl(row[liveLinkCol])

    const liveDateCol = h('live_date')
    if (liveDateCol) task.live_date = normalizeDate(row[liveDateCol])

    const internalCol = h('internal_approval')
    if (internalCol) {
        const val = normHeader(row[internalCol])
        task.internal_approval = val === 'approved' ? 'Approved' : 'Pending'
    }

    return task
}
