import DashboardIcon from "./DashboardIcon";

const accents = {
    teal: { icon: "bg-[#e2f2ed] text-[#21836f]", change: "text-[#21836f]" },
    blue: { icon: "bg-[#e5eff8] text-[#477fac]", change: "text-[#477fac]" },
    gold: { icon: "bg-[#f7f0dc] text-[#a17d27]", change: "text-[#a17d27]" },
    coral: { icon: "bg-[#fae9e3] text-[#c56f55]", change: "text-[#c56f55]" }
};

export default function StatCard({ stat }) {
    const accent = accents[stat.accent] || accents.teal;
    const trend = stat.change.startsWith("+");

    return (
        <article className="rounded-lg border border-[#e3ebe7] bg-white p-5 shadow-[0_3px_14px_rgba(27,65,57,0.035)] transition hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(27,65,57,0.08)] sm:p-6">
            <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-medium text-[#647b76]">{stat.label}</p>
                <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg ${accent.icon}`}>
                    <DashboardIcon name={stat.icon} className="h-5 w-5" />
                </span>
            </div>
            <p className="mt-4 text-[28px] font-semibold leading-none text-[#203a36]">{stat.value}</p>
            <div className="mt-4 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs">
                {trend && <DashboardIcon name="arrowUp" className={`h-4 w-4 ${accent.change}`} />}
                <span className={`font-semibold ${accent.change}`}>{stat.change}</span>
                <span className="text-[#8a9a95]">{stat.detail}</span>
            </div>
        </article>
    );
}