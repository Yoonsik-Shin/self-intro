export default function Loading() {
    return (
        <div className="mx-auto max-w-[1500px] animate-pulse space-y-5 px-4 py-6 sm:px-6">
            <div className="h-36 rounded-3xl bg-slate-100" />
            <div className="grid gap-4 lg:grid-cols-[340px_1fr]">
                <div className="h-[560px] rounded-2xl bg-slate-100" />
                <div className="h-[560px] rounded-2xl bg-slate-100" />
            </div>
        </div>
    );
}
