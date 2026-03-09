import { NextResponse } from 'next/server'
import { connectToMongo } from '@/lib/db/mongodb'
import { handleCORS, withAuth } from '@/lib/middleware/api-utils'
import { safeArray } from '@/lib/safe'

export const runtime = 'nodejs';

const isActiveTask = (status) => status !== 'Completed'

function shapeTask(task, service, clientMap) {
    return {
        id: task.id,
        title: task.title,
        status: task.status,
        client_id: task.client_id,
        client_name: clientMap[task.client_id] || 'Unknown',
        service
    }
}

export async function GET(request) {
    return withAuth(request, async () => {
        const database = await connectToMongo()

        const members = await database
            .collection('team_members')
            .find({ is_active: { $ne: false } })
            .sort({ name: 1 })
            .toArray()

        const cleanMembers = safeArray(members).map(({ _id, password_hash, ...m }) => m)
        const memberIds = cleanMembers.map((m) => m.id)

        if (memberIds.length === 0) {
            return handleCORS(NextResponse.json([]))
        }

        const taskQuery = { assigned_to: { $in: memberIds } }
        const [seoTasks, emailTasks, paidTasks] = await Promise.all([
            database.collection('tasks').find(taskQuery).toArray(),
            database.collection('email_tasks').find(taskQuery).toArray(),
            database.collection('paid_tasks').find(taskQuery).toArray(),
        ])

        const allTasks = [...safeArray(seoTasks), ...safeArray(emailTasks), ...safeArray(paidTasks)]
        const clientIds = [...new Set(allTasks.map((t) => t.client_id).filter(Boolean))]
        const clients = clientIds.length
            ? await database.collection('clients').find({ id: { $in: clientIds } }).toArray()
            : []
        const clientMap = Object.fromEntries(safeArray(clients).map((c) => [c.id, c.name]))

        const byMember = Object.fromEntries(memberIds.map((id) => [
            id,
            {
                total_tasks: 0,
                active_tasks: 0,
                services: { seo: [], email: [], paid: [] }
            }
        ]))

        for (const task of safeArray(seoTasks)) {
            if (!byMember[task.assigned_to]) continue
            byMember[task.assigned_to].total_tasks += 1
            if (isActiveTask(task.status)) byMember[task.assigned_to].active_tasks += 1
            byMember[task.assigned_to].services.seo.push(shapeTask(task, 'seo', clientMap))
        }

        for (const task of safeArray(emailTasks)) {
            if (!byMember[task.assigned_to]) continue
            byMember[task.assigned_to].total_tasks += 1
            if (isActiveTask(task.status)) byMember[task.assigned_to].active_tasks += 1
            byMember[task.assigned_to].services.email.push(shapeTask(task, 'email', clientMap))
        }

        for (const task of safeArray(paidTasks)) {
            if (!byMember[task.assigned_to]) continue
            byMember[task.assigned_to].total_tasks += 1
            if (isActiveTask(task.status)) byMember[task.assigned_to].active_tasks += 1
            byMember[task.assigned_to].services.paid.push(shapeTask(task, 'paid', clientMap))
        }

        const response = cleanMembers.map((member) => ({
            ...member,
            workload: byMember[member.id] || {
                total_tasks: 0,
                active_tasks: 0,
                services: { seo: [], email: [], paid: [] }
            }
        }))

        return handleCORS(NextResponse.json(response))
    })
}

export async function OPTIONS() {
    return handleCORS(new NextResponse(null, { status: 200 }))
}
