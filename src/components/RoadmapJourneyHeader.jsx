import { useState, useEffect, useRef, useMemo } from 'react';
import { T } from '../styles/tokens';

// --- Date utilities ---

function dateToT(dateStr, startMs, rangeMs) {
  if (!dateStr || rangeMs === 0) return 0.5;
  return (new Date(dateStr).getTime() - startMs) / rangeMs;
}

function computeRange(milestones) {
  const dates = milestones.filter((m) => m.date).map((m) => new Date(m.date).getTime());
  if (dates.length === 0) return { startMs: Date.now(), endMs: Date.now(), rangeMs: 1 };
  const min = Math.min(...dates);
  const max = Math.max(...dates);
  const pad = Math.max((max - min) * 0.18, 21 * 86400000);
  return { startMs: min - pad, endMs: max + pad, rangeMs: (max - min) + 2 * pad };
}

// --- Smooth SVG path: cubic bezier with horizontal tangents at every point ---
// This makes shelves flat and milestones the steepest (inflection) points.

function smoothPath(points) {
  if (points.length < 2) return '';
  let d = `M ${points[0].x.toFixed(1)},${points[0].y.toFixed(1)}`;
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const dx = curr.x - prev.x;
    d += ` C ${(prev.x + dx * 0.5).toFixed(1)},${prev.y.toFixed(1)} ${(curr.x - dx * 0.5).toFixed(1)},${curr.y.toFixed(1)} ${curr.x.toFixed(1)},${curr.y.toFixed(1)}`;
  }
  return d;
}

// --- Layout constants ---

const X_MIN = 30;
const X_MAX = 970;
const X_SPAN = X_MAX - X_MIN;
const Y_START = 158; // bottom-left (low, early)
const Y_END = 32;    // top-right (high, late)

// --- Lane layout to prevent callout overlaps ---

function assignLanes(items) {
  const OFFSETS = [-36, 42, -64];
  const CHAR_W = 6.5;
  const PAD = 28;
  const GAP = 14;
  const sorted = [...items].sort((a, b) => a.x - b.x);
  const lanes = [[], [], []];
  return sorted.map((item) => {
    const w = Math.min(item.title.length, 22) * CHAR_W + PAD;
    const halfW = w / 2;
    for (let l = 0; l < OFFSETS.length; l++) {
      const conflict = lanes[l].some((p) => Math.abs(item.x - p.x) < halfW + p.halfW + GAP);
      if (!conflict) {
        lanes[l].push({ x: item.x, halfW });
        return { ...item, lane: l, yOff: OFFSETS[l], cw: w, collapsed: false };
      }
    }
    return { ...item, lane: 0, yOff: OFFSETS[0], cw: w, collapsed: true };
  });
}

// --- Month ticks ---

function getMonthTicks(startMs, endMs) {
  const rangeMonths = (endMs - startMs) / (30 * 86400000);
  const step = rangeMonths > 24 ? 6 : rangeMonths > 12 ? 3 : 1;
  const ticks = [];
  const start = new Date(startMs);
  let cur = new Date(start.getFullYear(), start.getMonth() + 1, 1);
  let i = 0;
  while (cur.getTime() <= endMs && ticks.length < 24) {
    if (i % step === 0) {
      ticks.push({
        label: cur.toLocaleString('en', { month: 'short' }) + (step >= 3 || cur.getMonth() === 0 ? " '" + String(cur.getFullYear()).slice(2) : ''),
        ms: cur.getTime(),
      });
    }
    cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1);
    i++;
  }
  return ticks;
}

// --- Binary search: find point on rendered SVG path at a given x ---

function findAtX(path, targetX, totalLen) {
  let lo = 0;
  let hi = totalLen;
  for (let i = 0; i < 25; i++) {
    const mid = (lo + hi) / 2;
    if (path.getPointAtLength(mid).x < targetX) lo = mid;
    else hi = mid;
  }
  const len = (lo + hi) / 2;
  return { pt: path.getPointAtLength(len), len };
}

// --- Static mountain backdrop ---

const MTN_BACK = 'M 0,200 Q 100,40 200,70 Q 300,100 400,48 Q 500,0 600,38 Q 700,76 800,28 Q 900,0 1000,38 L 1000,200 Z';
const MTN_FRONT = 'M 0,200 L 0,158 Q 100,128 200,148 Q 300,168 400,138 Q 500,108 600,142 Q 700,176 800,148 Q 900,118 1000,152 L 1000,200 Z';

const STATUS_CLR = { done: T.done, active: T.accent, planned: T.textDim };

// --- Component ---

export default function RoadmapJourneyHeader({ milestones, onSelectMilestone, selectedId }) {
  const pathRef = useRef(null);
  const [todayInfo, setTodayInfo] = useState(null);
  const [hoveredId, setHoveredId] = useState(null);

  const range = useMemo(() => computeRange(milestones), [milestones]);
  const monthTicks = useMemo(() => getMonthTicks(range.startMs, range.endMs), [range]);

  // 1. Compute milestone positions on a monotonically rising curve.
  //    Milestones sit at inflection points; shelves between them are flat.
  const milestoneLayout = useMemo(() => {
    const dated = milestones.filter((m) => m.date).sort((a, b) => a.date.localeCompare(b.date));
    const n = dated.length;
    if (n === 0) return [];

    // Shelf y values: n+1 evenly-spaced horizontal levels from Y_START → Y_END
    const shelfYs = [];
    for (let i = 0; i <= n; i++) shelfYs.push(Y_START - (i / n) * (Y_START - Y_END));

    return dated.map((ms, i) => {
      const t = Math.max(0.04, Math.min(0.96, dateToT(ms.date, range.startMs, range.rangeMs)));
      return {
        ...ms,
        x: X_MIN + t * X_SPAN,
        y: (shelfYs[i] + shelfYs[i + 1]) / 2, // midpoint = inflection of S-curve
        t,
      };
    });
  }, [milestones, range]);

  // 2. Generate the rising path: shelf → milestone → shelf → milestone → …
  const journeyPathD = useMemo(() => {
    const n = milestoneLayout.length;
    if (n === 0) return smoothPath([{ x: X_MIN, y: Y_START }, { x: X_MAX, y: Y_END }]);

    const shelfYs = [];
    for (let i = 0; i <= n; i++) shelfYs.push(Y_START - (i / n) * (Y_START - Y_END));

    const shelfXs = [X_MIN];
    for (let i = 0; i < n - 1; i++) shelfXs.push((milestoneLayout[i].x + milestoneLayout[i + 1].x) / 2);
    shelfXs.push(X_MAX);

    const pts = [];
    pts.push({ x: shelfXs[0], y: shelfYs[0] });
    for (let i = 0; i < n; i++) {
      pts.push({ x: milestoneLayout[i].x, y: milestoneLayout[i].y });
      pts.push({ x: shelfXs[i + 1], y: shelfYs[i + 1] });
    }
    return smoothPath(pts);
  }, [milestoneLayout]);

  // 3. Lane layout for callouts
  const layoutPositions = useMemo(() => assignLanes(milestoneLayout), [milestoneLayout]);

  // 4. Month tick x positions
  const monthXs = useMemo(() => {
    return monthTicks.map((tick) => {
      const t = Math.max(0, Math.min(1, dateToT(new Date(tick.ms).toISOString().slice(0, 10), range.startMs, range.rangeMs)));
      return X_MIN + t * X_SPAN;
    });
  }, [monthTicks, range]);

  // 5. Today marker — needs rendered path for on-path y + progress length
  useEffect(() => {
    const path = pathRef.current;
    if (!path) { setTodayInfo(null); return; }
    const totalLen = path.getTotalLength();
    const todayStr = new Date().toISOString().slice(0, 10);
    const todayT = dateToT(todayStr, range.startMs, range.rangeMs);
    if (todayT < 0.01 || todayT > 0.99) { setTodayInfo(null); return; }
    const todayX = X_MIN + todayT * X_SPAN;
    const { pt, len } = findAtX(path, todayX, totalLen);
    setTodayInfo({ pt, len, totalLen });
  }, [journeyPathD, range]);

  if (milestoneLayout.length === 0) return null;

  return (
    <div style={{ marginBottom: 20, borderRadius: T.radiusLg, overflow: 'hidden', border: `1px solid ${T.border}` }}>
      <svg viewBox="0 0 1000 200" style={{ width: '100%', display: 'block' }} preserveAspectRatio="xMidYMid meet">
        <defs>
          <linearGradient id="rjh-bg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0f1018" />
            <stop offset="100%" stopColor="#0a0b10" />
          </linearGradient>
          <linearGradient id="rjh-prog" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={T.accent} />
            <stop offset="100%" stopColor={T.accentHover} />
          </linearGradient>
          <filter id="rjh-glow">
            <feGaussianBlur stdDeviation="4" result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <filter id="rjh-mg">
            <feGaussianBlur stdDeviation="3" result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        {/* Background + mountains */}
        <rect width="1000" height="200" fill="url(#rjh-bg)" />
        <path d={MTN_BACK} fill="rgba(255,255,255,0.012)" />
        <path d={MTN_FRONT} fill="rgba(255,255,255,0.024)" />

        {/* Month grid */}
        {monthXs.map((x, i) => (
          <g key={i}>
            <line x1={x} y1={10} x2={x} y2={186} stroke="rgba(255,255,255,0.025)" strokeWidth="0.5" />
            <text x={x} y={196} textAnchor="middle" fill={T.textDim} fontSize="8" fontFamily={T.font} opacity="0.4">
              {monthTicks[i]?.label}
            </text>
          </g>
        ))}

        {/* Journey path — dim base */}
        <path ref={pathRef} d={journeyPathD} fill="none" stroke="rgba(139,124,246,0.1)" strokeWidth="2.5" strokeLinecap="round" />

        {/* Progress path — bright portion up to today */}
        {todayInfo && todayInfo.len > 0 && (
          <path d={journeyPathD} fill="none" stroke="url(#rjh-prog)" strokeWidth="2.5" strokeLinecap="round"
            strokeDasharray={`${todayInfo.len} ${todayInfo.totalLen}`} filter="url(#rjh-glow)" opacity="0.7" />
        )}

        {/* Today marker */}
        {todayInfo && (
          <g>
            <line x1={todayInfo.pt.x} y1={10} x2={todayInfo.pt.x} y2={186}
              stroke={T.accent} strokeWidth="0.5" strokeDasharray="4,4" opacity="0.25" />
            <circle cx={todayInfo.pt.x} cy={todayInfo.pt.y} r="4" fill={T.accent} opacity="0.7">
              <animate attributeName="r" values="3;5.5;3" dur="2.5s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.7;0.25;0.7" dur="2.5s" repeatCount="indefinite" />
            </circle>
            <text x={todayInfo.pt.x} y={186} textAnchor="middle"
              fill={T.accent} fontSize="7" fontFamily={T.font} opacity="0.45" fontWeight="600">
              TODAY
            </text>
          </g>
        )}

        {/* Milestones */}
        {layoutPositions.map((ms) => {
          const isActive = hoveredId === ms.id || selectedId === ms.id;
          const hasSelection = selectedId != null || hoveredId != null;
          const color = isActive ? T.accent : hasSelection ? T.textDim : (STATUS_CLR[ms.status] || T.textDim);
          const r = 5;
          const cY = Math.max(16, Math.min(184, ms.y + ms.yOff));
          const connEnd = cY + (ms.yOff < 0 ? 12 : -12);
          const baseOp = isActive ? 1 : hasSelection ? 0.35 : (ms.status === 'done' ? 0.45 : ms.status === 'planned' ? 0.55 : 0.85);

          return (
            <g key={ms.id}
              onMouseEnter={() => setHoveredId(ms.id)}
              onMouseLeave={() => setHoveredId(null)}
              onClick={() => onSelectMilestone?.(ms.id)}
              style={{ cursor: 'pointer' }}
            >
              {/* Connector */}
              {(!ms.collapsed || isActive) && (
                <line x1={ms.x} y1={ms.y} x2={ms.x} y2={connEnd}
                  stroke={color} strokeWidth="0.7" opacity={isActive ? 0.5 : 0.15} strokeDasharray="2,2" />
              )}

              {/* Callout card */}
              {(!ms.collapsed || isActive) && (
                <g opacity={baseOp}>
                  <rect
                    x={Math.max(4, ms.x - ms.cw / 2)} y={cY - 12}
                    width={ms.cw} height={24} rx="5"
                    fill={isActive ? 'rgba(30,33,50,0.95)' : 'rgba(16,18,28,0.82)'}
                    stroke={isActive ? `${T.accent}60` : 'rgba(255,255,255,0.04)'}
                    strokeWidth={isActive ? 1.2 : 0.5}
                  />
                  <text
                    x={Math.max(4 + ms.cw / 2, ms.x)} y={cY}
                    textAnchor="middle" fill={isActive ? T.text : color}
                    fontSize="9.5" fontFamily={T.fontSans} fontWeight="600"
                  >
                    {ms.title.length > 20 ? ms.title.slice(0, 18) + '\u2026' : ms.title}
                  </text>
                  <text
                    x={Math.max(4 + ms.cw / 2, ms.x)} y={cY + 10}
                    textAnchor="middle" fill={T.textDim} fontSize="7.5" fontFamily={T.font}
                  >
                    {ms.date}
                  </text>
                </g>
              )}

              {/* Marker circle */}
              <circle cx={ms.x} cy={ms.y}
                r={isActive ? r + 2 : r}
                fill={isActive ? T.accent : color}
                stroke={color} strokeWidth={isActive ? 0 : 1}
                opacity={baseOp}
                filter={isActive ? 'url(#rjh-mg)' : undefined}
              />

              {/* Done checkmark */}
              {ms.status === 'done' && (
                <path
                  d={`M${ms.x - 2.5},${ms.y} L${ms.x - 0.5},${ms.y + 2.5} L${ms.x + 3},${ms.y - 2}`}
                  fill="none" stroke="white" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"
                  opacity={isActive ? 1 : 0.7}
                />
              )}

              {/* Hover/selected description tooltip */}
              {isActive && ms.description && (() => {
                const tY = ms.yOff < 0 ? ms.y + 16 : ms.y - 28;
                return (
                  <g>
                    <rect x={ms.x - 80} y={tY} width="160" height="18" rx="4"
                      fill="rgba(10,11,16,0.95)" stroke="rgba(255,255,255,0.06)" strokeWidth="0.5" />
                    <text x={ms.x} y={tY + 12} textAnchor="middle"
                      fill={T.textDim} fontSize="7.5" fontFamily={T.fontSans}>
                      {ms.description.length > 36 ? ms.description.slice(0, 34) + '\u2026' : ms.description}
                    </text>
                  </g>
                );
              })()}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
