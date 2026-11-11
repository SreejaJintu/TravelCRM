import { useEffect } from "react";
import DashboardIcon from "./DashboardIcon";

export default function CustomerDialog({ title, description, onClose, children, width = "max-w-xl" }) {
    useEffect(() => {
        const onKeyDown = (event) => {
            if (event.key === "Escape") onClose();
        };
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [onClose]);

    return (
        <div
            className="fixed inset-0 z-50 flex items-end justify-center bg-[#102e2c]/45 p-0 backdrop-blur-[2px] sm:items-center sm:p-5"
            onMouseDown={(event) => event.target === event.currentTarget && onClose()}
        >
            <section role="dialog" aria-modal="true" aria-labelledby="customer-dialog-title" className={`max-h-[94vh] w-full overflow-y-auto rounded-t-xl bg-white shadow-2xl sm:rounded-xl ${width}`}>
                <header className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-[#e7eeeb] bg-white px-5 py-5 sm:px-7">
                    <div className="min-w-0">
                        <h2 id="customer-dialog-title" className="text-lg font-semibold text-[#203a36]">{title}</h2>
                        {description && <p className="mt-1 text-sm leading-5 text-[#71847e]">{description}</p>}
                    </div>
                    <button type="button" onClick={onClose} aria-label="Close dialog" className="grid h-9 w-9 shrink-0 place-items-center rounded-md text-[#71847e] transition hover:bg-[#f1f6f3] hover:text-[#203a36] focus-visible:outline-2 focus-visible:outline-[#176b68]">
                        <DashboardIcon name="close" />
                    </button>
                </header>
                {children}
            </section>
        </div>
    );
}