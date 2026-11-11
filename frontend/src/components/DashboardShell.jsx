import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";

export default function DashboardShell({ heading, description, cards }) {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate("/login", { replace: true });
    };

    return (
        <main className="min-h-screen bg-[#f2f7f6]">
            <header className="border-b border-[#dce7e2] bg-white">
                <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-4 sm:px-8">
                    <a href="/" className="inline-flex items-center gap-3 text-sm font-bold tracking-wide text-[#153f3d]">
                        <span className="grid h-10 w-10 place-items-center rounded-md bg-[#e6c96f] font-black">T</span>
                        <span>TRAVEL CRM</span>
                    </a>
                    <div className="flex items-center gap-4">
                        <div className="hidden text-right sm:block">
                            <p className="text-sm font-semibold text-[#243936]">{user?.fullName}</p>
                            <p className="text-xs text-[#657772]">{user?.role}</p>
                        </div>
                        <button onClick={handleLogout} className="rounded-md border border-[#cbd9d3] px-4 py-2 text-sm font-semibold text-[#31504a] transition hover:border-[#176b68] hover:bg-[#f2f7f6]">
                            Log out
                        </button>
                    </div>
                </div>
            </header>
            <div className="mx-auto max-w-7xl px-5 py-10 sm:px-8 sm:py-14">
                <div className="mb-9 border-l-4 border-[#e6c96f] pl-5">
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#a17d27]">Agency overview</p>
                    <h1 className="mt-2 text-3xl font-semibold text-[#20332f]">{heading}, {user?.fullName?.split(" ")[0]}</h1>
                    <p className="mt-2 text-sm text-[#657772]">{description}</p>
                </div>

                <section aria-label="Account details" className="mb-8 flex flex-wrap gap-x-10 gap-y-3 border-y border-[#dce7e2] bg-white px-5 py-4 text-sm">
                    <p><span className="mr-2 text-[#657772]">Email</span><span className="font-medium text-[#243936]">{user?.email}</span></p>
                    <p><span className="mr-2 text-[#657772]">Role</span><span className="font-medium text-[#243936]">{user?.role}</span></p>
                </section>

                <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    {cards.map(({ title, value, note }) => (
                        <article key={title} className="min-h-40 border border-[#dce7e2] bg-white p-6 shadow-[0_3px_12px_rgba(27,65,57,0.04)]">
                            <p className="text-sm font-semibold text-[#31504a]">{title}</p>
                            <p className="mt-6 text-3xl font-semibold text-[#20332f]">{value}</p>
                            <p className="mt-2 text-xs text-[#758681]">{note}</p>
                        </article>
                    ))}
                </section>
            </div>
        </main>
    );
}