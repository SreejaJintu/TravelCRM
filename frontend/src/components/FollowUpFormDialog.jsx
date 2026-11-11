import { useEffect, useRef, useState } from "react";
import CustomerDialog from "./CustomerDialog";
import { getLeads } from "../services/leadApi";
import { getAssignableFollowUpStaff } from "../services/followUpApi";
import { getCustomerErrorMessage } from "../utils/customerErrors";

const followUpTypes = ["Call", "WhatsApp", "Email", "Meeting", "Other"];

function localDateTimeValue(value) {
    const date = value ? new Date(value) : new Date(Date.now() + 60 * 60 * 1000);
    const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return localDate.toISOString().slice(0, 16);
}

function initialValues(followUp, lead) {
    return {
        leadId: String(followUp?.leadId ?? lead?.leadId ?? ""),
        assignedToUserId: followUp?.assignedToUserId ? String(followUp.assignedToUserId) : "",
        followUpType: followUp?.followUpType ?? "Call",
        subject: followUp?.subject ?? "",
        description: followUp?.description ?? "",
        scheduledAt: localDateTimeValue(followUp?.scheduledAt)
    };
}

function fieldClass(invalid = false) {
    return `min-h-11 w-full rounded-md border bg-white px-3.5 py-2.5 text-sm text-[#20332f] outline-none focus:ring-4 ${invalid
        ? "border-rose-400 focus:border-rose-500 focus:ring-rose-500/10"
        : "border-[#d6e0dc] focus:border-[#176b68] focus:ring-[#176b68]/10"}`;
}

export default function FollowUpFormDialog({ mode, followUp, lead, isAdmin, onClose, onSave }) {
    const [values, setValues] = useState(() => initialValues(followUp, lead));
    const [references, setReferences] = useState(null);
    const [fieldErrors, setFieldErrors] = useState({});
    const [error, setError] = useState("");
    const [saving, setSaving] = useState(false);
    const submitting = useRef(false);

    useEffect(() => {
        const controller = new AbortController();
        const requests = [getLeads({ page: 1, pageSize: 100, signal: controller.signal })];
        if (isAdmin) requests.push(getAssignableFollowUpStaff(controller.signal));
        Promise.all(requests)
            .then(([leadResponse, staffResponse]) => {
                if (!controller.signal.aborted) {
                    setReferences({ leads: leadResponse.items, staff: staffResponse ?? [] });
                }
            })
            .catch((requestError) => {
                if (!controller.signal.aborted) setError(getCustomerErrorMessage(requestError));
            });
        return () => controller.abort();
    }, [isAdmin]);

    const updateField = (field, value) => {
        setValues((current) => ({ ...current, [field]: value }));
        setFieldErrors((current) => ({ ...current, [field]: undefined }));
        setError("");
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        if (submitting.current) return;

        const errors = {};
        if (!values.leadId) errors.leadId = "Choose a lead.";
        if (!values.followUpType) errors.followUpType = "Choose a follow-up type.";
        if (!values.subject.trim()) errors.subject = "Enter a subject.";
        if (!values.scheduledAt) errors.scheduledAt = "Choose a date and time.";
        if (isAdmin && !values.assignedToUserId) errors.assignedToUserId = "Choose a Staff member.";
        setFieldErrors(errors);
        if (Object.keys(errors).length > 0) return;

        const payload = {
            leadId: Number(values.leadId),
            followUpType: values.followUpType,
            subject: values.subject.trim(),
            description: values.description.trim() || null,
            scheduledAt: new Date(values.scheduledAt).toISOString()
        };
        if (isAdmin) payload.assignedToUserId = Number(values.assignedToUserId);

        submitting.current = true;
        setSaving(true);
        setError("");
        try {
            await onSave(payload);
        } catch (requestError) {
            setError(getCustomerErrorMessage(requestError));
        } finally {
            submitting.current = false;
            setSaving(false);
        }
    };

    const leads = references?.leads ?? [];
    if (lead && !leads.some((item) => item.leadId === lead.leadId)) leads.unshift(lead);
    if (followUp && !leads.some((item) => item.leadId === followUp.leadId)) {
        leads.push({ leadId: followUp.leadId, leadNumber: followUp.leadNumber, fullName: followUp.leadName, destination: followUp.destination });
    }

    return (
        <CustomerDialog
            title={mode === "edit" ? "Edit follow-up" : "Schedule follow-up"}
            description={mode === "edit" ? `Update ${followUp.subject}.` : "Create a reminder linked to a travel enquiry."}
            onClose={onClose}
            width="max-w-2xl"
        >
            <form onSubmit={handleSubmit} className="px-5 py-5 sm:px-7 sm:py-6">
                {error && <div role="alert" className="mb-5 rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</div>}
                {!references && <p role="status" className="mb-4 text-xs text-[#71847e]">Loading leads and assignment options...</p>}
                <div className="grid gap-x-4 gap-y-4 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                        <label htmlFor="follow-up-lead" className="mb-1.5 block text-xs font-semibold text-[#344e48]">Lead <span className="text-rose-600">*</span></label>
                        <select id="follow-up-lead" value={values.leadId} onChange={(event) => updateField("leadId", event.target.value)} disabled={!references || Boolean(lead)} className={fieldClass(Boolean(fieldErrors.leadId))}>
                            <option value="">Select a lead</option>
                            {leads.map((item) => <option key={item.leadId} value={item.leadId}>{item.leadNumber} · {item.fullName} · {item.destination}</option>)}
                        </select>
                        {fieldErrors.leadId && <p className="mt-1 text-xs text-rose-700">{fieldErrors.leadId}</p>}
                    </div>
                    <div>
                        <label htmlFor="follow-up-type" className="mb-1.5 block text-xs font-semibold text-[#344e48]">Type</label>
                        <select id="follow-up-type" value={values.followUpType} onChange={(event) => updateField("followUpType", event.target.value)} className={fieldClass(Boolean(fieldErrors.followUpType))}>
                            {followUpTypes.map((type) => <option key={type} value={type}>{type}</option>)}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="follow-up-scheduled-at" className="mb-1.5 block text-xs font-semibold text-[#344e48]">Scheduled date & time</label>
                        <input id="follow-up-scheduled-at" type="datetime-local" value={values.scheduledAt} onChange={(event) => updateField("scheduledAt", event.target.value)} className={fieldClass(Boolean(fieldErrors.scheduledAt))} />
                        {fieldErrors.scheduledAt && <p className="mt-1 text-xs text-rose-700">{fieldErrors.scheduledAt}</p>}
                    </div>
                    <div className="sm:col-span-2">
                        <label htmlFor="follow-up-subject" className="mb-1.5 block text-xs font-semibold text-[#344e48]">Subject</label>
                        <input id="follow-up-subject" value={values.subject} onChange={(event) => updateField("subject", event.target.value)} maxLength={150} className={fieldClass(Boolean(fieldErrors.subject))} placeholder="e.g. Confirm travel dates" />
                        {fieldErrors.subject && <p className="mt-1 text-xs text-rose-700">{fieldErrors.subject}</p>}
                    </div>
                    <div className="sm:col-span-2">
                        <label htmlFor="follow-up-description" className="mb-1.5 block text-xs font-semibold text-[#344e48]">Description</label>
                        <textarea id="follow-up-description" rows="3" maxLength={1000} value={values.description} onChange={(event) => updateField("description", event.target.value)} className={`${fieldClass(Boolean(fieldErrors.description))} min-h-24 resize-y`} placeholder="Context or preparation notes" />
                    </div>
                    {isAdmin && (
                        <div className="sm:col-span-2">
                            <label htmlFor="follow-up-assignee" className="mb-1.5 block text-xs font-semibold text-[#344e48]">Assigned Staff</label>
                            <select id="follow-up-assignee" value={values.assignedToUserId} onChange={(event) => updateField("assignedToUserId", event.target.value)} disabled={!references} className={fieldClass(Boolean(fieldErrors.assignedToUserId))}>
                                <option value="">Select Staff</option>
                                {(references?.staff ?? []).map((member) => <option key={member.userId} value={member.userId}>{member.fullName} · {member.email}</option>)}
                            </select>
                            {fieldErrors.assignedToUserId && <p className="mt-1 text-xs text-rose-700">{fieldErrors.assignedToUserId}</p>}
                        </div>
                    )}
                    {!isAdmin && <p className="sm:col-span-2 text-xs text-[#71847e]">This follow-up will be assigned to you.</p>}
                </div>
                <footer className="mt-7 flex flex-col-reverse gap-2 border-t border-[#e9efec] pt-5 sm:flex-row sm:justify-end">
                    <button type="button" onClick={onClose} disabled={saving} className="min-h-10 rounded-md border border-[#d6e0dc] px-4 py-2 text-sm font-semibold text-[#526b65] hover:bg-[#f5f8f6]">Cancel</button>
                    <button type="submit" disabled={saving || !references} className="min-h-10 rounded-md bg-[#176b68] px-4 py-2 text-sm font-semibold text-white hover:bg-[#125956] disabled:opacity-60">{saving ? "Saving..." : mode === "edit" ? "Save changes" : "Schedule follow-up"}</button>
                </footer>
            </form>
        </CustomerDialog>
    );
}