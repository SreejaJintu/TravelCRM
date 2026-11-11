import CustomerDialog from "./CustomerDialog";

export default function FollowUpConfirmDialog({ followUp, busy, onClose, onConfirm }) {
    return (
        <CustomerDialog title="Cancel follow-up?" description={followUp.subject} onClose={onClose} width="max-w-md">
            <div className="p-5 sm:p-6">
                <p className="text-sm leading-6 text-[#657772]">This reminder will be marked cancelled and kept in the follow-up history.</p>
                <footer className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                    <button type="button" onClick={onClose} disabled={busy} className="min-h-10 rounded-md border border-[#d6e0dc] px-4 py-2 text-sm font-semibold text-[#526b65] hover:bg-[#f5f8f6]">Keep follow-up</button>
                    <button type="button" onClick={onConfirm} disabled={busy} className="min-h-10 rounded-md bg-[#b64c3c] px-4 py-2 text-sm font-semibold text-white hover:bg-[#963d31] disabled:opacity-60">{busy ? "Cancelling..." : "Cancel follow-up"}</button>
                </footer>
            </div>
        </CustomerDialog>
    );
}