import { Suspense } from 'react';
import Script from 'next/script';
import { SiteHeader } from '@/components/nav/SiteHeader';
import { PreviewModeBanner } from '@/components/nav/PreviewModeBanner';
import { DonationWidget } from '@/components/donation/DonationWidget';
import { PlatformFooter } from '@/components/nav/PlatformFooter';

export default function PublicLayout({ children }: { children: React.ReactNode }) {
    return (
        <main className="min-h-screen bg-[#f8fafc] text-slate-800">
            <Script
                id="adsense-public-pages"
                async
                strategy="afterInteractive"
                src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-6825696073869286"
                crossOrigin="anonymous"
            />
            <SiteHeader />
            <Suspense fallback={null}>
                <PreviewModeBanner />
            </Suspense>
            {children}
            <PlatformFooter />
            <DonationWidget />
        </main>
    );
}
