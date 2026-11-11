import CustomerDialog from "./CustomerDialog";

export default function LeadConfirmDialog({ title, description, confirmLabel, danger = false, busy = false, onClose, onConfirm }) {
    return (
        <CustomerDialog title={title} description={description} onClose={onClose} width="max-w-md">
            <div className="p-5 sm:p-6">
                <footer className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                    <button type="button" onClick={onClose} disabled={busy} className="min-h-10 rounded-md border border-[#d6e0dc] px-4 py-2 text-sm font-semibold text-[#526b65] hover:bg-[#f5f8f6] disabled:opacity-60">Cancel</button>
                    <button type="button" onClick={onConfirm} disabled={busy} className={`min-h-10 rounded-md px-4 py-2 text-sm font-semibold text-white transition disabled:cursor-wait disabled:opacity-65 ${danger ? "bg-[#b64c3c] hover:bg-[#963d31]" : "bg-[#176b68] hover:bg-[#125956]"}`}>
                        {busy ? "Working..." : confirmLabel}
                    </button>
                </footer>
            </div>
        </CustomerDialog>
    );
}