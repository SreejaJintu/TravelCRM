export default function AuthLayout({ title, description, footer, children }) {
    return (
        <main className="min-h-screen bg-[#f2f7f6] p-4 sm:p-8">
            <div className="mx-auto grid min-h-[calc(100vh-2rem)] w-full max-w-6xl overflow-hidden rounded-lg bg-white shadow-[0_24px_80px_rgba(27,65,57,0.12)] sm:min-h-[calc(100vh-4rem)] lg:grid-cols-[1.05fr_0.95fr]">
                <section className="relative hidden overflow-hidden bg-[#153f3d] p-12 text-white lg:flex lg:flex-col lg:justify-between xl:p-16">
                    <div className="absolute inset-0 opacity-30" aria-hidden="true">
                        <div className="absolute -left-20 top-28 h-96 w-96 rounded-full border border-[#a5d0bd]" />
                        <div className="absolute -left-8 top-40 h-72 w-72 rounded-full border border-[#a5d0bd]" />
                        <div className="absolute -left-[-20px] top-52 h-48 w-48 rounded-full border border-[#a5d0bd]" />
                        <div className="absolute bottom-28 right-[-4rem] h-80 w-80 rounded-full border border-[#d6bc70]" />
                        <div className="absolute bottom-40 right-[-1rem] h-52 w-52 rounded-full border border-[#d6bc70]" />
                        <div className="absolute left-[28%] top-[35%] h-2 w-2 rounded-full bg-[#e6c96f] shadow-[0_0_0_8px_rgba(230,201,111,0.18)]" />
                        <div className="absolute left-[57%] top-[54%] h-2 w-2 rounded-full bg-[#e6c96f] shadow-[0_0_0_8px_rgba(230,201,111,0.18)]" />
                        <div className="absolute left-[28%] top-[35%] h-[20%] w-[30%] rotate-[27deg] border-t border-dashed border-[#d3e2d9]" />
                    </div>
                    <div className="relative">
                        <a href="/" className="inline-flex items-center gap-3 text-sm font-bold tracking-wide text-white">
                            <span className="grid h-10 w-10 place-items-center rounded-md bg-[#e6c96f] text-sm font-black text-[#153f3d]">T</span>
                            <span>TRAVEL CRM</span>
                        </a>
                    </div>
                    <div className="relative max-w-md pb-8">
                        <p className="mb-5 text-xs font-bold uppercase tracking-[0.16em] text-[#e6c96f]">Every journey, in view</p>
                        <p className="text-4xl font-semibold leading-tight tracking-[-0.02em] xl:text-5xl">Make the details feel like the destination.</p>
                        <p className="mt-5 max-w-sm text-base leading-7 text-[#c5d8d1]">A calmer way to coordinate travelers, itineraries, and the people behind every trip.</p>
                    </div>
                    <p className="relative text-xs text-[#b3cbc2]">Travel agency workspace</p>
                </section>

                <section className="flex items-center justify-center px-5 py-10 sm:px-12 lg:px-14 xl:px-20">
                    <div className="w-full max-w-md">
                        <div className="mb-10 lg:hidden">
                            <a href="/" className="inline-flex items-center gap-3 text-sm font-bold tracking-wide text-[#153f3d]">
                                <span className="grid h-10 w-10 place-items-center rounded-md bg-[#e6c96f] text-sm font-black">T</span>
                                <span>TRAVEL CRM</span>
                            </a>
                        </div>
                        <div className="mb-8">
                            <p className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-[#a17d27]">Your agency workspace</p>
                            <h1 className="text-3xl font-semibold text-[#20332f]">{title}</h1>
                            <p className="mt-3 text-sm leading-6 text-[#657772]">{description}</p>
                        </div>
                        {children}
                        <p className="mt-8 text-center text-sm text-[#657772]">{footer}</p>
                    </div>
                </section>
            </div>
        </main>
    );
}