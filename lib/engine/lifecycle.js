/**
 * Agency Dashboard Lifecycle Engine
 * Centralized logic for task and content state transitions.
 * Ensures data integrity and enforces atomic business rules.
 */

// --- TASK LIFECYCLE ---

const TASK_LEVELS = ['To Be Started', 'In Progress', 'Completed', 'Implemented', 'Blocked', 'Pending Review'];
const TASK_PRIORITIES = ['P0', 'P1', 'P2', 'P3'];
const TASK_APPROVALS = ['Pending Review', 'Approved', 'Required Changes'];

/**
 * Validates logical consistency of a task state.
 * Hard-fails if invariants are violated.
 */
export function assertTaskInvariant(task) {
    if (!task) return;

    // 1. RULE: Sent -> requires Approved (Internal) AND Completed/Implemented
    const DONE_STATUSES = ['Completed', 'Implemented'];
    if (task.client_link_visible === true) {
        if (task.internal_approval !== 'Approved') {
            throw new Error('Invariant Violation: Cannot set client_link_visible without internal_approval="Approved"');
        }
        if (!DONE_STATUSES.includes(task.status)) {
            throw new Error('Invariant Violation: Cannot set client_link_visible unless status is "Completed" or "Implemented"');
        }
    }

    // 2. RULE: Internal Approved + Sent -> requires Completed or Implemented
    // Only enforce this when the link has actually been sent to client — before Send Link,
    // internal_approval="Approved" is an internal QA state that doesn't require Completed yet.
    if (task.internal_approval === 'Approved' && task.client_link_visible === true && !DONE_STATUSES.includes(task.status)) {
        throw new Error('Invariant Violation: internal_approval="Approved" + client_link_visible requires status="Completed" or "Implemented"');
    }

    // 3. RULE: Incomplete -> cannot be visible
    if (!DONE_STATUSES.includes(task.status) && task.client_link_visible === true) {
        throw new Error('Invariant Violation: Status must be "Completed" or "Implemented" for the client link to be visible');
    }

    // 4. RULE: Client Feedback -> implies progress
    if (task.client_approval === 'Required Changes') {
        if (task.status !== 'In Progress' || task.internal_approval !== 'Pending' || task.client_link_visible === true) {
            throw new Error('Invariant Violation: "Required Changes" must force In Progress / Pending / Not Visible state');
        }
    }

    // 5. Enum validation (logical double-check)
    if (task.status && !TASK_LEVELS.includes(task.status)) throw new Error(`Invalid status: ${task.status}`);
    if (task.client_approval && !TASK_APPROVALS.includes(task.client_approval)) throw new Error(`Invalid client_approval: ${task.client_approval}`);
}

export function applyTaskTransition(currentTask, updates) {
    const base = currentTask || {};
    const transitioned = { ...base, ...updates };

    // Set defaults for creations
    if (!currentTask) {
        if (!transitioned.status) transitioned.status = 'To Be Started';
        if (!transitioned.internal_approval) transitioned.internal_approval = 'Pending';
        if (!transitioned.created_at) transitioned.created_at = new Date();
    }

    // --- REVERT RULES (Side effects based on intent) ---
    const isUpdate = !!currentTask;

    // 1. RULE: Status Revert - If status moves away from a done state (Completed/Implemented)
    const DONE_STATUSES = ['Completed', 'Implemented'];
    if (isUpdate && updates.status && !DONE_STATUSES.includes(updates.status) && DONE_STATUSES.includes(currentTask.status)) {
        transitioned.internal_approval = 'Pending';
        transitioned.client_link_visible = false;
        transitioned.client_approval = null;
    }


    // 1b. RULE: (Pending Review removed from UI — kept in engine for backwards compatibility)

    // 2. RULE: QA Revert - If internal_approval moves to "Pending"
    if (isUpdate && updates.internal_approval === 'Pending' && currentTask.internal_approval === 'Approved') {
        transitioned.client_link_visible = false;
        transitioned.client_approval = null;
    }

    // 3. RULE: Link Change Reset - If link_url changes and was previously sent
    if (isUpdate && updates.link_url !== undefined && updates.link_url !== currentTask.link_url && currentTask.client_link_visible === true) {
        transitioned.internal_approval = 'Pending';
        transitioned.client_link_visible = false;
        transitioned.client_approval = null;
    }

    // --- EFFECT RULES ---

    // 4a. RULE: Re-completing/implementing a task after "Required Changes" — reset client approval for fresh review
    if (isUpdate && DONE_STATUSES.includes(updates.status) && currentTask.client_approval === 'Required Changes') {
        transitioned.client_approval = 'Pending Review';
    }

    // 4. RULE: Client Feedback Logic (Required Changes)
    if (updates.client_approval === 'Required Changes') {
        transitioned.status = 'In Progress';
        transitioned.internal_approval = 'Pending';
        transitioned.client_link_visible = false;
        transitioned.client_feedback_at = new Date();
    }

    // 5. RULE: Link visibility activation (allowed for Completed or Implemented)
    if (updates.client_link_visible === true && (!currentTask || currentTask.client_link_visible === false)) {
        if (!transitioned.link_url) throw new Error('Cannot enable visibility without a link');
        transitioned.client_approval = 'Pending Review';
    }

    // Always update timestamp
    transitioned.updated_at = new Date();

    // FINAL GUARD: Never return an invalid state
    assertTaskInvariant(transitioned);

    return transitioned;
}

// --- SOCIAL MEDIA TASK LIFECYCLE ---

/**
 * Validates logical consistency of a social task state.
 */
export function assertSocialTaskInvariant(task) {
    if (!task) return;
    if (!task.content_idea_sent && task.content_idea_approval && task.content_idea_approval !== 'Pending') {
        throw new Error('Invariant: content_idea_approval must be Pending when content idea has not been sent');
    }
    if (!task.content_draft_sent && task.content_draft_approval && task.content_draft_approval !== 'Pending') {
        throw new Error('Invariant: content_draft_approval must be Pending when draft has not been sent');
    }
}

export function applySocialTaskTransition(currentTask, updates) {
    const base = currentTask || {};
    const transitioned = { ...base, ...updates };

    if (!currentTask) {
        if (transitioned.content_idea_sent === undefined) transitioned.content_idea_sent = false;
        if (transitioned.content_draft_sent === undefined) transitioned.content_draft_sent = false;
        if (!transitioned.content_idea_approval) transitioned.content_idea_approval = 'Pending';
        if (!transitioned.content_draft_approval) transitioned.content_draft_approval = 'Pending';
        if (!transitioned.created_at) transitioned.created_at = new Date();
    }

    const isUpdate = !!currentTask;

    // Re-sending content idea resets idea approval — client must re-approve
    if (isUpdate && updates.content_idea_sent === true) {
        transitioned.content_idea_approval = 'Pending';
        transitioned.content_idea_feedback = null;
    }

    // Re-sending draft resets draft approval — client must re-approve
    if (isUpdate && updates.content_draft_sent === true) {
        transitioned.content_draft_approval = 'Pending';
        transitioned.draft_feedback = null;
    }

    transitioned.updated_at = new Date();
    assertSocialTaskInvariant(transitioned);
    return transitioned;
}

// --- CONTENT LIFECYCLE ---

/**
 * Validates logical consistency of a content item state.
 * Hard-fails if invariants are violated.
 */
export function assertContentInvariant(item) {
    if (!item) return;

    // 1. RULE: Blog Approved → requires Doc Link (not necessarily live link yet)
    if (item.blog_approval_status === 'Approved' && !item.blog_doc_link) {
        throw new Error('Invariant Violation: blog_approval_status="Approved" requires a blog_doc_link');
    }

    // 2. RULE: Internal Approved → requires blog_doc_link
    // The UI already disables the dropdown without a link, this is a server-side defence.
    if (item.blog_internal_approval === 'Approved' && !item.blog_doc_link) {
        throw new Error('Invariant Violation: blog_internal_approval="Approved" requires a blog_doc_link');
    }
    // Note: blog_approval_date is auto-set in applyContentTransition, not enforced here
    // to avoid breaking existing records that pre-date this field.
}

export function applyContentTransition(currentContent, updates) {
    const base = currentContent || {};
    const transitioned = { ...base, ...updates };

    // Set defaults for creations
    if (!currentContent) {
        if (!transitioned.blog_status) transitioned.blog_status = 'Draft';
        if (!transitioned.topic_approval_status) transitioned.topic_approval_status = 'Pending';
        if (!transitioned.blog_approval_status) transitioned.blog_approval_status = 'Pending Review';
        if (!transitioned.blog_internal_approval) transitioned.blog_internal_approval = 'Pending';
        if (transitioned.client_link_visible_blog === undefined) transitioned.client_link_visible_blog = false;
        if (!transitioned.created_at) transitioned.created_at = new Date();
    }

    // --- EFFECT RULES ---
    const isUpdate = !!currentContent;

    // 1. Topic Approval Date
    if (updates.topic_approval_status === 'Approved' && (!isUpdate || currentContent.topic_approval_status !== 'Approved')) {
        transitioned.topic_approval_date = new Date().toISOString().split('T')[0];
    }

    // 2. Blog Approval Date
    if (updates.blog_approval_status === 'Approved' && (!isUpdate || currentContent.blog_approval_status !== 'Approved')) {
        transitioned.blog_approval_date = new Date().toISOString().split('T')[0];
    }

    // 3. Reset approvals on link change
    if (isUpdate && updates.blog_link !== undefined && updates.blog_link !== currentContent.blog_link) {
        if (currentContent.blog_approval_status === 'Approved') {
            transitioned.blog_approval_status = 'Pending Review';
            transitioned.blog_approval_date = null;
        }
        // If link changes after being sent, hide and reset
        if (currentContent.client_link_visible_blog === true) {
            transitioned.blog_internal_approval = 'Pending';
            transitioned.client_link_visible_blog = false;
            transitioned.blog_approval_status = 'Pending Review';
        }
    }

    // 4. RULE: Client Blog Feedback "Changes Required" — mirrors task Required Changes
    if (updates.blog_approval_status === 'Changes Required') {
        transitioned.blog_status = 'In Progress';
        transitioned.blog_internal_approval = 'Pending';
        transitioned.client_link_visible_blog = false;
        transitioned.blog_client_feedback_at = new Date();
    }

    // 5. RULE: blog_internal_approval revert
    if (isUpdate && updates.blog_internal_approval === 'Pending' && currentContent.blog_internal_approval === 'Approved') {
        transitioned.client_link_visible_blog = false;
        transitioned.blog_approval_status = 'Pending Review';
    }

    // 6. RULE: Content link visibility activation
    if (updates.client_link_visible_blog === true && (!currentContent || !currentContent.client_link_visible_blog)) {
        if (!transitioned.blog_doc_link) throw new Error('Cannot send blog link without a blog_doc_link URL (Blog Doc column)');
        if (transitioned.blog_internal_approval !== 'Approved') throw new Error('Cannot send blog link without internal approval ("Approved")');
        transitioned.blog_approval_status = 'Pending Review';
        // 7. RULE: Record the date this was sent for approval (always update on every send/re-send)
        transitioned.date_sent_for_approval = new Date().toISOString().split('T')[0]
    }

    // Always update timestamp
    transitioned.updated_at = new Date();

    // FINAL GUARD
    assertContentInvariant(transitioned);

    return transitioned;
}
