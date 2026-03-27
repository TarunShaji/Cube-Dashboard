import { NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { connectToMongo } from '@/lib/db/mongodb'
import { handleCORS, withAuth } from '@/lib/middleware/api-utils'
import { applySocialTaskTransition, assertSocialTaskInvariant } from '@/lib/engine/lifecycle'
import { safeURL, safeArray } from '@/lib/safe'
import { validateBody, rejectFields } from '@/lib/middleware/validation'
import { SocialTaskSchema } from '@/lib/db/schemas/social.schema'
import { getActiveTeamMemberIdSet, normalizeAssignedTo, extractAssignedIds, buildAssignedToFilter } from '@/lib/team/assignee'

export const runtime = 'nodejs';

// Client-only fields — internal cannot inject via regular PUT
const FORBIDDEN_FIELDS = [
    'content_idea_approval',
    'content_idea_feedback',
    'content_draft_approval',
    'draft_feedback',
    // Send gates use dedicated endpoints: /send-idea and /send-draft
    'content_idea_sent',
    'content_draft_sent',
];

export async function GET(request) {
    return withAuth(request, async () => {
        const database = await connectToMongo()
        const url = safeURL(request.url)
        const query = {}

        const clientId = url.searchParams.get('client_id')
        const assignedTo = url.searchParams.get('assigned_to')
        const search = url.searchParams.get('search')
        const enrich = url.searchParams.get('enrich') !== '0'

        const page = parseInt(url.searchParams.get('page')) || 1
        const limit = parseInt(url.searchParams.get('limit')) || 50
        const skip = (page - 1) * limit

        if (clientId) query.client_id = clientId
        if (assignedTo) Object.assign(query, buildAssignedToFilter(assignedTo))
        if (search) {
            query.$or = [
                { visual_brief: { $regex: search, $options: 'i' } },
                { content: { $regex: search, $options: 'i' } },
                { caption: { $regex: search, $options: 'i' } },
            ]
        }

        const sortBy = url.searchParams.get('sort_by')
        const sortDir = url.searchParams.get('sort_dir') === 'desc' ? -1 : 1
        const sortStage = sortBy ? { [sortBy]: sortDir } : { position: 1, created_at: -1 }

        const collection = database.collection('social_tasks')
        const [total, tasks] = await Promise.all([
            collection.countDocuments(query),
            collection.find(query).sort(sortStage).skip(skip).limit(limit).toArray()
        ])
        const totalPages = Math.ceil(total / limit)
        const cleanTasks = safeArray(tasks).map(({ _id, ...t }) => t)

        if (!enrich) {
            return handleCORS(NextResponse.json({ data: cleanTasks, total, page, totalPages }))
        }

        const clientIds = [...new Set(cleanTasks.map(t => t.client_id))]
        const assigneeIds = [...new Set(cleanTasks.flatMap(t => extractAssignedIds(t.assigned_to)))]
        const clients = clientIds.length > 0 ? await database.collection('clients').find({ id: { $in: clientIds } }, { projection: { _id: 0, id: 1, name: 1 } }).toArray() : []
        const members = assigneeIds.length > 0 ? await database.collection('team_members').find({ id: { $in: assigneeIds } }, { projection: { _id: 0, id: 1, name: 1 } }).toArray() : []
        const clientMap = Object.fromEntries(safeArray(clients).map(c => [c.id, c.name]))
        const memberMap = Object.fromEntries(safeArray(members).map(m => [m.id, m.name]))
        const enriched = cleanTasks.map(t => {
            const assignedIds = extractAssignedIds(t.assigned_to)
            const assignedNames = assignedIds.map((id) => memberMap[id]).filter(Boolean)
            return {
                ...t,
                client_name: clientMap[t.client_id] || 'Unknown',
                assigned_to_name: assignedNames.join(', ') || null,
                assigned_to_names: assignedNames
            }
        })

        return handleCORS(NextResponse.json({ data: enriched, total, page, totalPages }))
    })
}

export async function POST(request) {
    return withAuth(request, async () => {
        const database = await connectToMongo()
        const body = await request.json()

        const rejection = rejectFields(body, FORBIDDEN_FIELDS)
        if (!rejection.success) {
            return handleCORS(NextResponse.json(rejection.error, { status: 400 }))
        }

        const validation = validateBody(SocialTaskSchema, body)
        if (!validation.success) {
            return handleCORS(NextResponse.json(validation.error, { status: 400 }))
        }

        const cleanData = validation.data
        const validMemberIds = await getActiveTeamMemberIdSet(database)
        const assignedTo = normalizeAssignedTo(cleanData.assigned_to, validMemberIds)

        const finalTask = applySocialTaskTransition(null, {
            ...cleanData,
            ...(assignedTo !== undefined ? { assigned_to: assignedTo } : {}),
            id: uuidv4()
        })

        await database.collection('social_tasks').insertOne(finalTask)
        assertSocialTaskInvariant(finalTask)

        return handleCORS(NextResponse.json(finalTask))
    })
}

export async function OPTIONS() {
    return handleCORS(new NextResponse(null, { status: 200 }))
}
