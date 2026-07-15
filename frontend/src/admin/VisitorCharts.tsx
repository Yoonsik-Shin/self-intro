import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { VisitorDaily, VisitorHourly } from '../lib/api';

// 팔레트는 dataviz 검증 통과값 (흰 배경 기준 CVD ΔE 70+, 대비 3:1 이상)
const SERIES = [
  { key: 'visitors', label: '순 방문자', color: '#2a78d6' },
  { key: 'pageViews', label: '조회 수', color: '#199e70' },
] as const;

type SeriesKey = (typeof SERIES)[number]['key'];

const CHART_HEIGHT = 220;
const PADDING = { top: 16, right: 16, bottom: 28, left: 40 };

const GRID_COLOR = '#e2e8f0';
const BASELINE_COLOR = '#cbd5e1';
const TICK_COLOR = '#94a3b8';

function useContainerWidth<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [width, setWidth] = useState(0);

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new ResizeObserver((entries) => {
      const next = entries[0]?.contentRect.width ?? 0;
      setWidth((current) => (Math.abs(current - next) < 1 ? current : next));
    });
    observer.observe(element);
    setWidth(element.getBoundingClientRect().width);
    return () => observer.disconnect();
  }, []);

  return { ref, width };
}

function buildScale(maxValue: number) {
  const domainSource = Math.max(maxValue, 1);
  const rawStep = domainSource / 4;
  const magnitude = 10 ** Math.floor(Math.log10(rawStep));
  const step = [1, 2, 5, 10].map((m) => m * magnitude).find((s) => s >= rawStep) ?? magnitude * 10;
  const niceStep = Math.max(1, Math.round(step));
  const domainMax = Math.ceil(domainSource / niceStep) * niceStep;
  const ticks: number[] = [];
  for (let value = 0; value <= domainMax; value += niceStep) ticks.push(value);
  return { ticks, domainMax };
}

function ChartLegend({ variant }: { variant: 'line' | 'bar' }) {
  return (
    <div className="flex items-center justify-end gap-4 pb-2">
      {SERIES.map((series) => (
        <span key={series.key} className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
          {variant === 'line' ? (
            <span className="h-0.5 w-4 rounded-full" style={{ backgroundColor: series.color }} />
          ) : (
            <span className="h-2.5 w-2.5 rounded-[3px]" style={{ backgroundColor: series.color }} />
          )}
          {series.label}
        </span>
      ))}
    </div>
  );
}

function ChartTooltip({
  left,
  title,
  values,
}: {
  left: number;
  title: string;
  values: Record<SeriesKey, number>;
}) {
  return (
    <div
      className="pointer-events-none absolute top-2 z-10 -translate-x-1/2 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-lg"
      style={{ left }}
    >
      <p className="whitespace-nowrap text-[11px] font-bold text-slate-400">{title}</p>
      <div className="mt-1 space-y-0.5">
        {SERIES.map((series) => (
          <div key={series.key} className="flex items-center gap-2">
            <span className="h-0.5 w-3 shrink-0 rounded-full" style={{ backgroundColor: series.color }} />
            <span className="text-sm font-black tabular-nums text-slate-900">
              {values[series.key].toLocaleString()}
            </span>
            <span className="whitespace-nowrap text-xs font-medium text-slate-500">{series.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function EmptyOverlay({ message }: { message: string }) {
  return (
    <div className="pointer-events-none absolute inset-0 grid place-items-center">
      <p className="text-sm font-semibold text-slate-400">{message}</p>
    </div>
  );
}

const formatDayTooltip = (isoDate: string) => {
  const [year, month, day] = isoDate.split('-').map(Number);
  const weekday = ['일', '월', '화', '수', '목', '금', '토'][new Date(year, month - 1, day).getDay()];
  return `${month}월 ${day}일 (${weekday})`;
};

const formatDayTick = (isoDate: string) => {
  const [, month, day] = isoDate.split('-');
  return `${month}.${day}`;
};

export function VisitorTrendChart({ data }: { data: VisitorDaily[] }) {
  const { ref, width } = useContainerWidth<HTMLDivElement>();
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const maxValue = useMemo(
    () => data.reduce((max, day) => Math.max(max, day.visitors, day.pageViews), 0),
    [data],
  );
  const { ticks, domainMax } = useMemo(() => buildScale(maxValue), [maxValue]);

  if (data.length === 0) return null;

  const innerWidth = Math.max(width - PADDING.left - PADDING.right, 0);
  const innerHeight = CHART_HEIGHT - PADDING.top - PADDING.bottom;
  const hasData = maxValue > 0;

  const xFor = (index: number) =>
    PADDING.left + (data.length <= 1 ? innerWidth / 2 : (index * innerWidth) / (data.length - 1));
  const yFor = (value: number) => PADDING.top + innerHeight * (1 - value / domainMax);

  const moveHover = (clientX: number, element: SVGSVGElement) => {
    if (innerWidth <= 0) return;
    const pointerX = clientX - element.getBoundingClientRect().left - PADDING.left;
    const index = Math.round((pointerX / innerWidth) * (data.length - 1));
    setHoverIndex(Math.min(Math.max(index, 0), data.length - 1));
  };

  return (
    <div>
      <ChartLegend variant="line" />
      <div ref={ref} className="relative">
        {width > 0 && (
          <svg
            width={width}
            height={CHART_HEIGHT}
            role="img"
            aria-label="최근 14일 순 방문자 및 조회 수 추이"
            onPointerMove={(event) => moveHover(event.clientX, event.currentTarget)}
            onPointerLeave={() => setHoverIndex(null)}
          >
            {ticks.map((tick) => (
              <g key={tick}>
                <line
                  x1={PADDING.left}
                  x2={width - PADDING.right}
                  y1={yFor(tick)}
                  y2={yFor(tick)}
                  stroke={tick === 0 ? BASELINE_COLOR : GRID_COLOR}
                  strokeWidth={1}
                />
                <text
                  x={PADDING.left - 8}
                  y={yFor(tick) + 3.5}
                  textAnchor="end"
                  fontSize={11}
                  fill={TICK_COLOR}
                  className="tabular-nums"
                >
                  {tick.toLocaleString()}
                </text>
              </g>
            ))}
            {data.map((day, index) =>
              index % 2 === 0 ? (
                <text
                  key={day.date}
                  x={xFor(index)}
                  y={CHART_HEIGHT - 8}
                  textAnchor="middle"
                  fontSize={11}
                  fill={TICK_COLOR}
                  className="tabular-nums"
                >
                  {formatDayTick(day.date)}
                </text>
              ) : null,
            )}
            {hoverIndex !== null && hasData && (
              <line
                x1={xFor(hoverIndex)}
                x2={xFor(hoverIndex)}
                y1={PADDING.top}
                y2={PADDING.top + innerHeight}
                stroke={BASELINE_COLOR}
                strokeWidth={1}
              />
            )}
            {hasData &&
              SERIES.map((series) => (
                <g key={series.key}>
                  <path
                    d={data
                      .map((day, index) => `${index === 0 ? 'M' : 'L'}${xFor(index)},${yFor(day[series.key])}`)
                      .join(' ')}
                    fill="none"
                    stroke={series.color}
                    strokeWidth={2}
                    strokeLinejoin="round"
                    strokeLinecap="round"
                  />
                  {data.map((day, index) => (
                    <circle
                      key={day.date}
                      cx={xFor(index)}
                      cy={yFor(day[series.key])}
                      r={hoverIndex === index ? 5 : 4}
                      fill={series.color}
                      stroke="#ffffff"
                      strokeWidth={2}
                    />
                  ))}
                </g>
              ))}
            {data.map((day, index) => (
              <rect
                key={day.date}
                x={xFor(index) - innerWidth / Math.max(data.length - 1, 1) / 2}
                y={PADDING.top}
                width={innerWidth / Math.max(data.length - 1, 1)}
                height={innerHeight}
                fill="transparent"
                tabIndex={0}
                className="focus:outline-none"
                onFocus={() => setHoverIndex(index)}
                onBlur={() => setHoverIndex(null)}
              />
            ))}
          </svg>
        )}
        {!hasData && <EmptyOverlay message="아직 집계된 방문 기록이 없습니다." />}
        {hoverIndex !== null && hasData && (
          <ChartTooltip
            left={Math.min(Math.max(xFor(hoverIndex), 90), Math.max(width - 90, 90))}
            title={formatDayTooltip(data[hoverIndex].date)}
            values={{ visitors: data[hoverIndex].visitors, pageViews: data[hoverIndex].pageViews }}
          />
        )}
      </div>
    </div>
  );
}

const roundedTopBarPath = (x: number, y: number, barWidth: number, barHeight: number) => {
  if (barHeight <= 0) return '';
  const radius = Math.min(4, barWidth / 2, barHeight);
  return [
    `M${x},${y + barHeight}`,
    `L${x},${y + radius}`,
    `Q${x},${y} ${x + radius},${y}`,
    `L${x + barWidth - radius},${y}`,
    `Q${x + barWidth},${y} ${x + barWidth},${y + radius}`,
    `L${x + barWidth},${y + barHeight}`,
    'Z',
  ].join(' ');
};

export function VisitorHourlyChart({ data }: { data: VisitorHourly[] }) {
  const { ref, width } = useContainerWidth<HTMLDivElement>();
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const maxValue = useMemo(
    () => data.reduce((max, slot) => Math.max(max, slot.visitors, slot.pageViews), 0),
    [data],
  );
  const { ticks, domainMax } = useMemo(() => buildScale(maxValue), [maxValue]);

  const peak = useMemo(() => {
    let best: { index: number; seriesKey: SeriesKey; value: number } | null = null;
    for (let index = 0; index < data.length; index += 1) {
      for (const series of SERIES) {
        const value = data[index][series.key];
        if (value > 0 && (best === null || value > best.value)) {
          best = { index, seriesKey: series.key, value };
        }
      }
    }
    return best;
  }, [data]);

  if (data.length === 0) return null;

  const innerWidth = Math.max(width - PADDING.left - PADDING.right, 0);
  const innerHeight = CHART_HEIGHT - PADDING.top - PADDING.bottom;
  const hasData = maxValue > 0;

  const slotWidth = innerWidth / data.length;
  // 슬롯 안 두 막대 사이 2px 서피스 갭, 막대는 최대 24px
  const barWidth = Math.min(24, Math.max((slotWidth - 8 - 2) / 2, 2));
  const groupWidth = barWidth * 2 + 2;
  const xForSlot = (index: number) => PADDING.left + index * slotWidth;
  const yFor = (value: number) => PADDING.top + innerHeight * (1 - value / domainMax);
  const barX = (index: number, seriesIndex: number) =>
    xForSlot(index) + (slotWidth - groupWidth) / 2 + seriesIndex * (barWidth + 2);

  return (
    <div>
      <ChartLegend variant="bar" />
      <div ref={ref} className="relative">
        {width > 0 && (
          <svg
            width={width}
            height={CHART_HEIGHT}
            role="img"
            aria-label="오늘 시간대별 순 방문자 및 조회 수"
            onPointerLeave={() => setHoverIndex(null)}
          >
            {ticks.map((tick) => (
              <g key={tick}>
                <line
                  x1={PADDING.left}
                  x2={width - PADDING.right}
                  y1={yFor(tick)}
                  y2={yFor(tick)}
                  stroke={tick === 0 ? BASELINE_COLOR : GRID_COLOR}
                  strokeWidth={1}
                />
                <text
                  x={PADDING.left - 8}
                  y={yFor(tick) + 3.5}
                  textAnchor="end"
                  fontSize={11}
                  fill={TICK_COLOR}
                  className="tabular-nums"
                >
                  {tick.toLocaleString()}
                </text>
              </g>
            ))}
            {data.map((slot) =>
              slot.hour % 3 === 0 ? (
                <text
                  key={slot.hour}
                  x={xForSlot(slot.hour) + slotWidth / 2}
                  y={CHART_HEIGHT - 8}
                  textAnchor="middle"
                  fontSize={11}
                  fill={TICK_COLOR}
                  className="tabular-nums"
                >
                  {slot.hour}시
                </text>
              ) : null,
            )}
            {hoverIndex !== null && hasData && (
              <rect
                x={xForSlot(hoverIndex)}
                y={PADDING.top}
                width={slotWidth}
                height={innerHeight}
                fill="#f1f5f9"
              />
            )}
            {hasData &&
              data.map((slot, index) =>
                SERIES.map((series, seriesIndex) => {
                  const value = slot[series.key];
                  if (value <= 0) return null;
                  const barTop = yFor(value);
                  return (
                    <path
                      key={`${slot.hour}-${series.key}`}
                      d={roundedTopBarPath(
                        barX(index, seriesIndex),
                        barTop,
                        barWidth,
                        PADDING.top + innerHeight - barTop,
                      )}
                      fill={series.color}
                    />
                  );
                }),
              )}
            {peak !== null && hoverIndex === null && (
              <text
                x={barX(peak.index, SERIES.findIndex((series) => series.key === peak.seriesKey)) + barWidth / 2}
                y={yFor(peak.value) - 6}
                textAnchor="middle"
                fontSize={11}
                fontWeight={700}
                fill="#334155"
                className="tabular-nums"
              >
                {peak.value.toLocaleString()}
              </text>
            )}
            {data.map((slot, index) => (
              <rect
                key={slot.hour}
                x={xForSlot(index)}
                y={PADDING.top}
                width={slotWidth}
                height={innerHeight}
                fill="transparent"
                tabIndex={0}
                className="focus:outline-none"
                onPointerEnter={() => setHoverIndex(index)}
                onFocus={() => setHoverIndex(index)}
                onBlur={() => setHoverIndex(null)}
              />
            ))}
          </svg>
        )}
        {!hasData && <EmptyOverlay message="오늘 집계된 방문 기록이 없습니다." />}
        {hoverIndex !== null && hasData && (
          <ChartTooltip
            left={Math.min(Math.max(xForSlot(hoverIndex) + slotWidth / 2, 90), Math.max(width - 90, 90))}
            title={`${data[hoverIndex].hour}시 ~ ${data[hoverIndex].hour + 1}시`}
            values={{ visitors: data[hoverIndex].visitors, pageViews: data[hoverIndex].pageViews }}
          />
        )}
      </div>
    </div>
  );
}
