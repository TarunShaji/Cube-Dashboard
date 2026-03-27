import { findHeader, safeStr, extractUrl, normalizeDate, normHeader } from './normalize.js'

export const SOCIAL_HEADER_KEYWORDS = {
    format: ['format', 'formats'],
    visual_brief: ['visual brief', 'visual', 'visuals'],
    content: ['content', 'post content'],
    caption: ['caption'],
    reference_link: ['reference', 'references'],
    content_draft_link: ['content draft', 'draft link'],
    live_link: ['live link', 'live url', 'published link'],
    posting_date: ['post date', 'posting date', 'go live date', 'scheduled date'],
    assigned_to: ['assigned to', 'assigned'],
}

export const SOCIAL_PREVIEW_COLS = [
    { field: 'format', label: 'Format' },
    { field: 'visual_brief', label: 'Visual Brief' },
    { field: 'content', label: 'Content' },
    { field: 'caption', label: 'Caption' },
    { field: 'reference_link', label: 'Reference' },
    { field: 'content_draft_link', label: 'Content Draft' },
    { field: 'live_link', label: 'Live Link' },
    { field: 'posting_date', label: 'Posting Date' },
]

const FORMAT_MAP = {
    'static': 'Static',
    'reel': 'Reel',
    'text': 'Text',
    'carousel': 'Carousel',
    'story': 'Story',
}

export function rowToSocialTask(row, headers, clientId) {
    const h = (field) => findHeader(headers, SOCIAL_HEADER_KEYWORDS[field])

    const task = { client_id: clientId }

    const formatCol = h('format')
    if (formatCol) {
        const val = normHeader(row[formatCol])
        task.format = FORMAT_MAP[val] || null
    }

    const visualBriefCol = h('visual_brief')
    if (visualBriefCol) task.visual_brief = safeStr(row[visualBriefCol]) || null

    const contentCol = h('content')
    if (contentCol) task.content = safeStr(row[contentCol]) || null

    const captionCol = h('caption')
    if (captionCol) task.caption = safeStr(row[captionCol]) || null

    const referenceCol = h('reference_link')
    if (referenceCol) task.reference_link = extractUrl(row[referenceCol])

    const draftCol = h('content_draft_link')
    if (draftCol) task.content_draft_link = extractUrl(row[draftCol])

    const liveLinkCol = h('live_link')
    if (liveLinkCol) task.live_link = extractUrl(row[liveLinkCol])

    const postingDateCol = h('posting_date')
    if (postingDateCol) task.posting_date = normalizeDate(row[postingDateCol])

    // Must have at least one meaningful field
    if (!task.format && !task.visual_brief && !task.content && !task.caption) return null

    return task
}
