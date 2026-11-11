import DashboardIcon from "./DashboardIcon";

const actions = [
    { label: "Add customer", icon: "customersAdd", color: "text-[#267d6d]" },
    { label: "Create booking", icon: "bookingAdd", color: "text-[#4d78a1]" },
    { label: "Add travel package", icon: "packageAdd", color: "text-[#a17d27]" }
];

export default function QuickActions({ onAction }) {
    return (
        <section className="rounded-lg border border-[#e3ebe7] bg-white p-5 shadow-[0_3px_14px_rgba(27,65,57,0.035)]">
            <div className="mb-4">
                <h2 className="font-semibold text-[#203a36]">Quick actions</h2>
                <p className="mt-1 text-xs text-[#7c8f89]">Common tasks, one step away</p>
            </div>
            <div className="space-y-2">
                {actions.map((action) => (
                    <button
                        key={action.label}
                        type="button"
                        onClick={() => onAction(action.label)}
                        className="flex min-h-11 w-full items-center gap-3 rounded-md border border-[#e6eeea] px-3.5 py-2.5 text-left text-xs font-semibold text-[#3d5751] transition hover:border-[#c9ded5] hover:bg-[#f7faf8] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#176b68]"
                    >
                        <DashboardIcon name={action.icon} className={`h-[18px] w-[18px] ${action.color}`} />
                        <span className="flex-1">{action.label}</span>
                        <span className="text-[#a0afaa]" aria-hidden="true">+</span>
                    </button>
                ))}
            </div>
        </section>
    );
}