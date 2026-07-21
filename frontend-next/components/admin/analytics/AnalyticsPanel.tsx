'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart3, Bot, CalendarDays, Clock, MousePointerClick, Users } from 'lucide-react';
import { visitorApi } from '@/lib/api';
import { VisitorHourlyChart, VisitorTrendChart } from './VisitorCharts';

const formatLocalDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

export function AnalyticsPanel() {
    const visitorDateRange = useMemo(() => {
        const to = new Date();
        const from = new Date(to);
        from.setDate(from.getDate() - 13);
        return { from: formatLocalDate(from), to: formatLocalDate(to) };
    }, []);

    const { data: visitorSummary, isLoading: isVisitorSummaryLoading } = useQuery({
        queryKey: ['visitor', 'admin', 'summary'],
        queryFn: visitorApi.adminSummary,
    });
    const { data: visitorDaily = [], isLoading: isVisitorDailyLoading } = useQuery({
        queryKey: ['visitor', 'admin', 'daily', visitorDateRange.from, visitorDateRange.to],
        queryFn: () => visitorApi.adminDaily(visitorDateRange.from, visitorDateRange.to),
    });
    const { data: visitorHourly = [], isLoading: isVisitorHourlyLoading } = useQuery({
        queryKey: ['visitor', 'admin', 'hourly', visitorDateRange.to],
        queryFn: () => visitorApi.adminHourly(visitorDateRange.to),
    });

    return (
        <div className="space-y-6">
            <div className="border-b border-slate-200 pb-3">
                <h2 className="text-xl font-black text-slate-950">방문자 통계</h2>
                <p className="mt-0.5 text-sm text-slate-500">
                    브라우저 쿠키 기준 순 방문자와 페이지 조회 수입니다.
                </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {[
                    {
                        label: '오늘 방문자',
                        value: visitorSummary?.todayVisitors,
                        icon: CalendarDays,
                    },
                    { label: '누적 방문자', value: visitorSummary?.totalVisitors, icon: Users },
                    {
                        label: '누적 조회 수',
                        value: visitorSummary?.totalPageViews,
                        icon: MousePointerClick,
                    },
                    { label: '오늘 봇 의심', value: visitorSummary?.todayBotVisitors, icon: Bot },
                ].map(({ label, value, icon: Icon }) => (
                    <div
                        key={label}
                        className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                    >
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-bold text-slate-500">{label}</p>
                            <span className="grid h-9 w-9 place-items-center rounded-xl bg-slate-100 text-slate-600">
                                <Icon className="h-4 w-4" />
                            </span>
                        </div>
                        <p className="mt-3 text-3xl font-black tracking-tight text-slate-950">
                            {isVisitorSummaryLoading || value === undefined
                                ? '—'
                                : value.toLocaleString()}
                        </p>
                    </div>
                ))}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
                    <div>
                        <h3 className="font-black text-slate-900">오늘 시간대별</h3>
                        <p className="mt-0.5 text-xs font-medium text-slate-400">
                            {visitorDateRange.to} · 0시 ~ 23시
                        </p>
                    </div>
                    <Clock className="h-5 w-5 text-slate-400" />
                </div>
                <div className="px-5 pb-5 pt-4">
                    {isVisitorHourlyLoading ? (
                        <p className="py-10 text-center text-sm font-semibold text-slate-400">
                            통계를 불러오는 중입니다.
                        </p>
                    ) : (
                        <VisitorHourlyChart data={visitorHourly} />
                    )}
                </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
                    <div>
                        <h3 className="font-black text-slate-900">최근 14일</h3>
                        <p className="mt-0.5 text-xs font-medium text-slate-400">
                            {visitorDateRange.from} ~ {visitorDateRange.to}
                        </p>
                    </div>
                    <BarChart3 className="h-5 w-5 text-slate-400" />
                </div>
                <div className="border-b border-slate-200 px-5 pb-5 pt-4">
                    {isVisitorDailyLoading ? (
                        <p className="py-10 text-center text-sm font-semibold text-slate-400">
                            통계를 불러오는 중입니다.
                        </p>
                    ) : (
                        <VisitorTrendChart data={visitorDaily} />
                    )}
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[520px] text-left text-sm">
                        <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-400">
                            <tr>
                                <th className="px-5 py-3 font-bold">날짜</th>
                                <th className="px-5 py-3 text-right font-bold">순 방문자</th>
                                <th className="px-5 py-3 text-right font-bold">조회 수</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {visitorDaily.map((day) => (
                                <tr key={day.date} className="text-slate-600">
                                    <td className="px-5 py-3 font-semibold text-slate-700">
                                        {day.date}
                                    </td>
                                    <td className="px-5 py-3 text-right font-bold">
                                        {day.visitors.toLocaleString()}
                                    </td>
                                    <td className="px-5 py-3 text-right font-bold">
                                        {day.pageViews.toLocaleString()}
                                    </td>
                                </tr>
                            ))}
                            {!isVisitorDailyLoading && visitorDaily.length === 0 && (
                                <tr>
                                    <td
                                        colSpan={3}
                                        className="px-5 py-10 text-center font-semibold text-slate-400"
                                    >
                                        아직 집계된 방문 기록이 없습니다.
                                    </td>
                                </tr>
                            )}
                            {isVisitorDailyLoading && (
                                <tr>
                                    <td
                                        colSpan={3}
                                        className="px-5 py-10 text-center font-semibold text-slate-400"
                                    >
                                        통계를 불러오는 중입니다.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
