import { useEffect, useState } from "react";
import CustomerDialog from "./CustomerDialog";
import { assignFollowUp, getAssignableFollowUpStaff } from "../services/followUpApi";
import { getLeadErrorMessage } from "../utils/leadErrors";

export default function FollowUpAssignmentDialog({ followUp, onClose, onAssigned }) {
    const [staff, setStaff] = useState(null);
    const [assignedToUserId, setAssignedToUserId] = useState(String(followUp.assignedToUserId));
    const [error, setError] = useState("");
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const controller = new AbortController();
        getAssignableFollowUpStaff(controller.signal)
            .then(setStaff)
            .catch((requestError) => {
                if (!controller.signal.aborted) setError(getLeadErrorMessage(requestError));
            });
        return () => controller.abort();
    }, []);

    const submit = async (event) => {
        event.preventDefault();
        if (!assignedToUserId) {
            setError("Choose a Staff member.");
            return;
        }
        setSaving(true);
        setError("");
        try {
            await assignFollowUp(followUp.followUpId, Number(assignedToUserId));
            onAssigned();
        } catch (requestError) {
            setError(getLeadErrorMessage(requestError));
        } finally {
            setSaving(false);
        }
    };

    return (
        <CustomerDialog title="Assign follow-up" description={`${followUp.subject} · ${followUp.leadName}`} onClose={onClose} width="max-w-md">
            <form onSubmit={submit} className="p-5 sm:p-6">
                {error && <div role="alert" className="mb-4 rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</div>}
                <label htmlFor="follow-up-staff" className="mb-1.5 block text-xs font-semibold text-[#344e48]">Staff member</label>
                <select id="follow-up-staff" value={assignedToUserId} onChange={(event) => setAssignedToUserId(event.target.value)} disabled={!staff || saving} className="min-h-11 w-full rounded-md border border-[#d6e0dc] bg-white px-3.5 py-2.5 text-sm text-[#20332f] outline-none focus:border-[#176b68] focus:ring-4 focus:ring-[#176b68]/10 disabled:opacity-60">
                    <option value="">Select staff</option>
                    {(staff ?? []).map((member) => <option key={member.userId} value={member.userId}>{member.fullName} · {member.email}</option>)}
                </select>
                <footer className="mt-6 flex flex-col-reverse gap-2 border-t border-[#e9efec] pt-5 sm:flex-row sm:justify-end">
                    <button type="button" onClick={onClose} disabled={saving} className="min-h-10 rounded-md border border-[#d6e0dc] px-4 py-2 text-sm font-semibold text-[#526b65] hover:bg-[#f5f8f6]">Cancel</button>
                    <button type="submit" disabled={!staff || saving} className="min-h-10 rounded-md bg-[#176b68] px-4 py-2 text-sm font-semibold text-white hover:bg-[#125956] disabled:opacity-60">{saving ? "Saving..." : "Save assignment"}</button>
                </footer>
            </form>
        </CustomerDialog>
    );
}