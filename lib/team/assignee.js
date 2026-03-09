export async function getActiveTeamMemberIdSet(database) {
    const members = await database
        .collection('team_members')
        .find({ is_active: { $ne: false } }, { projection: { id: 1 } })
        .toArray()

    return new Set(members.map((m) => m.id))
}

export function normalizeAssignedTo(rawValue, validMemberIds) {
    if (rawValue === undefined) return undefined
    if (rawValue === null) return null
    if (typeof rawValue !== 'string' || rawValue.trim() === '') return null
    return validMemberIds.has(rawValue) ? rawValue : null
}
