import { SiteHeader } from '@/components/nav/SiteHeader';
import { PreviewModeBanner } from '@/components/nav/PreviewModeBanner';
import { GlobalPrintModal } from '@/components/print/GlobalPrintModal';

export default function PublicLayout({ children }: { children: React.ReactNode }) {
    return (
        <main className="min-h-screen bg-[#f8fafc] pb-12 text-slate-800">
            <SiteHeader />
            <PreviewModeBanner />
            {children}
            <GlobalPrintModal />
        </main>
    );
}
