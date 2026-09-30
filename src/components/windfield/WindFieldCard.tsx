// WindFieldCard - "Wind on the Water" for the marina conditions stack.
// Inline SVG plus CSS keyframes; no map library, no animation library, no images.
import React from 'react';
import { MAP_W, MAP_H, project } from '../../config/windField';
import type { WindFieldLocation } from '../../config/windField';

export interface WindFieldReading {
  speedKt: number;
  gustKt: number;
  directionDeg: number;
}

export interface WindFieldGridPoint {
  lat: number;
  lon: number;
  speedKt: number;
  gustKt: number;
  directionDeg: number;
}

export interface WindFieldData {
  status: 'ok' | 'error';
  observedAt: string;
  offshore: WindFieldReading;
  anchorage: WindFieldReading;
  /** The anchorage figure came from the shelter model, not from a measurement. */
  anchorageEstimated?: boolean;
  grid: WindFieldGridPoint[];
}

export interface WindFieldTheme {
  cardBg: string;
  headerText: string;
  headerWeight: number;
  rowBg: string;
  rowGoodBg: string;
  accent: string;
  text: string;
  textMuted: string;
  caption: string;
  mapSea: string;
  mapLand: string;
  mapCoast: string;
  mapArrow: string;
  mapLee: string;
  skeleton: string;
  neutralPin: string;
}

interface WindFieldCardProps {
  data: WindFieldData | null;
  loading: boolean;
  theme: WindFieldTheme;
  /** The basemap and sample frame for this location. */
  location: WindFieldLocation;
}

const STALE_MS = 30 * 60 * 1000;
const SHELTERED_MAX_KT = 20;
// One pitch of the conveyor, in viewBox units. The offset copy sits exactly this far
// upstream, so the last animation frame matches the first and the loop is invisible.
const PITCH = 76;

// Reserved in the skeleton too, so the card does not grow when the note appears.
const ESTIMATE_NOTE =
  'Anchorage figure is estimated from wind direction against the mouth of the bay, not measured';

const COMPASS = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE',
                 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];

const COMPASS_WORDS: Record<string, string> = {
  N: 'north', NNE: 'north-north-east', NE: 'north-east', ENE: 'east-north-east',
  E: 'east', ESE: 'east-south-east', SE: 'south-east', SSE: 'south-south-east',
  S: 'south', SSW: 'south-south-west', SW: 'south-west', WSW: 'west-south-west',
  W: 'west', WNW: 'west-north-west', NW: 'north-west', NNW: 'north-north-west',
};

function compass(deg: number): string {
  return COMPASS[Math.round(((deg % 360) + 360) % 360 / 22.5) % 16];
}

/**
 * Arrows point DOWNWIND.
 *
 * `directionDeg` is the compass bearing the wind blows FROM. The bearing it blows
 * TOWARD is that plus 180. SVG angles are measured from +x (screen right) with y
 * pointing down, so an SVG angle is its compass bearing minus 90. Combining the two:
 * theta = (direction + 180) - 90 = direction + 90.
 *
 * Sanity check, and the one that matters: ENE (67.5) gives theta 157.5, which points
 * left and down -- WSW, offshore, away from the land on the right. A reversed arrow is
 * the one bug that makes this card actively harmful.
 */
export function arrowTheta(directionDeg: number): number {
  return directionDeg + 90;
}

function band(speedKt: number): 'light' | 'mod' | 'fresh' {
  if (speedKt < 8) return 'light';
  if (speedKt <= 15) return 'mod';
  return 'fresh';
}

function minutesAgo(iso: string): number {
  return Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
}

export function WindFieldCard({ data, loading, theme, location }: WindFieldCardProps) {
  const uid = React.useId().replace(/:/g, '');

  // The conveyor needs a second copy one pitch upstream only while it is moving.
  // Frozen, that copy would sit in frame and double the field.
  const [reducedMotion, setReducedMotion] = React.useState(false);
  React.useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setReducedMotion(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  const state: 'loading' | 'error' | 'stale' | 'ok' = React.useMemo(() => {
    if (loading) return 'loading';
    if (!data || data.status !== 'ok' || !data.grid?.length) return 'error';
    if (Date.now() - new Date(data.observedAt).getTime() > STALE_MS) return 'stale';
    return 'ok';
  }, [loading, data]);

  // The error payload carries no readings, so every derived value tolerates their absence.
  const anchorageKt = data?.anchorage?.speedKt;
  const sheltered = anchorageKt !== undefined && anchorageKt <= SHELTERED_MAX_KT;
  const blowingHard = anchorageKt !== undefined && anchorageKt > SHELTERED_MAX_KT;

  const theta = arrowTheta(data?.offshore?.directionDeg ?? 67.5);
  const rad = (theta * Math.PI) / 180;
  // Flow vector stays parallel to the arrow heading, so motion and heading never disagree.
  const pitchX = Math.cos(rad) * PITCH;
  const pitchY = Math.sin(rad) * PITCH;

  const motionless = state === 'stale' || reducedMotion;
  const flowSeconds = blowingHard ? 2.6 : 6;
  const arrowSize = blowingHard ? { w: 40, h: 19 } : { w: 34, h: 16 };
  const pinFill = blowingHard ? theme.neutralPin : theme.accent;
  const fieldColor = blowingHard ? theme.neutralPin : theme.mapArrow;

  const header: React.CSSProperties = {
    padding: '12px 16px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    background: theme.cardBg,
    color: theme.headerText,
    fontWeight: theme.headerWeight,
  };

  const row: React.CSSProperties = {
    background: theme.rowBg,
    borderRadius: '3px',
    padding: '13px 14px',
    minHeight: '44px',
    boxSizing: 'border-box',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '8px',
    fontSize: '13px',
    fontWeight: 700,
    letterSpacing: '.04em',
    textTransform: 'uppercase',
    color: theme.text,
  };

  const note: React.CSSProperties = {
    fontSize: '11px',
    fontWeight: 600,
    letterSpacing: '.04em',
    textTransform: 'uppercase',
    color: theme.textMuted,
    padding: '0 2px',
  };

  const mapWrap: React.CSSProperties = {
    borderRadius: '3px',
    overflow: 'hidden',
    aspectRatio: `${MAP_W} / ${MAP_H}`,
    width: '100%',
  };

  // Keyframes carry the computed pitch, so they are generated per render rather than
  // hard-coded. Reduced motion drops the animation without touching layout.
  const css = `
    @keyframes wfblow-${uid} {
      from { transform: translate(0px, 0px); }
      to   { transform: translate(${pitchX.toFixed(2)}px, ${pitchY.toFixed(2)}px); }
    }
    @keyframes wfpulse-${uid} {
      from { r: 5; opacity: .9; }
      to   { r: 15; opacity: 0; }
    }
    @keyframes wfskel-${uid} {
      0%   { opacity: .45; }
      50%  { opacity: .9; }
      100% { opacity: .45; }
    }
    .wf-flow-${uid}  { animation: wfblow-${uid} ${flowSeconds}s linear infinite; }
    .wf-pulse-${uid} { animation: wfpulse-${uid} 2.6s ease-out infinite; }
    .wf-skel-${uid}  { animation: wfskel-${uid} 1.4s ease-in-out infinite; }
    @media (prefers-reduced-motion: reduce) {
      .wf-flow-${uid}, .wf-pulse-${uid}, .wf-skel-${uid} { animation: none; }
    }
  `;

  const inshore = new Set(location.anchorageIndices);
  const arrows = data?.grid?.map((point, i) => {
    const at = project(location.bbox, point.lat, point.lon);
    const b = band(point.speedKt);
    return (
      <g key={i} transform={`translate(${at.x.toFixed(1)},${at.y.toFixed(1)}) rotate(${arrowTheta(point.directionDeg).toFixed(1)})`}>
        <use
          href={`#wf-arrow-${b}-${uid}`}
          x={-arrowSize.w / 2}
          y={-arrowSize.h / 2}
          width={arrowSize.w}
          height={arrowSize.h}
          opacity={inshore.has(i) && sheltered ? 0.45 : 1}
        />
      </g>
    );
  });

  const ariaLabel = data?.offshore && data?.anchorage
    ? `Wind arrows over ${location.name}: ${data.offshore.speedKt} knots `
      + `${COMPASS_WORDS[compass(data.offshore.directionDeg)]} outside the bay, `
      + `${data.anchorage.speedKt} knots in the anchorage.`
    : 'Wind field map';

  return (
    <article style={{
      background: theme.cardBg,
      borderRadius: '3px',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
    }}>
      <style>{css}</style>
      <div style={header}><span>Wind on the Water</span></div>
      <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>

      {state === 'loading' && (
        <>
          <div className={`wf-skel-${uid}`} style={{ ...mapWrap, background: theme.skeleton }} />
          {[0, 1, 2].map(i => (
            <div
              key={i}
              className={`wf-skel-${uid}`}
              style={{ ...row, background: theme.skeleton, animationDelay: `${i * 0.2}s` }}
            >
              <span style={{ visibility: 'hidden' }}>&nbsp;</span>
            </div>
          ))}
          <div style={{ ...note, visibility: 'hidden' }}>{ESTIMATE_NOTE}</div>
        </>
      )}

      {state === 'error' && (
        <div style={{ ...row, color: theme.textMuted }}>
          <span>Wind Field Unavailable</span>
        </div>
      )}

      {(state === 'ok' || state === 'stale') && data && (
        <>
          <div style={{ ...mapWrap, opacity: state === 'stale' ? 0.34 : 1 }}>
            <svg
              viewBox={`0 0 ${MAP_W} ${MAP_H}`}
              style={{ display: 'block', width: '100%' }}
              role="img"
              aria-hidden={state === 'stale' ? true : undefined}
              aria-label={state === 'stale' ? undefined : ariaLabel}
            >
              <defs>
                <symbol id={`wf-arrow-light-${uid}`} viewBox="0 0 34 16">
                  <g fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
                    <path d="M9 8 H26" />
                    <path d="M26 8 l-6 -4 M26 8 l-6 4" />
                  </g>
                </symbol>
                <symbol id={`wf-arrow-mod-${uid}`} viewBox="0 0 34 16">
                  <g fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
                    <path d="M4 8 H26" />
                    <path d="M26 8 l-6 -4 M26 8 l-6 4" />
                  </g>
                </symbol>
                <symbol id={`wf-arrow-fresh-${uid}`} viewBox="0 0 34 16">
                  <g fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
                    <path d="M2 8 H26" />
                    <path d="M26 8 l-6 -4 M26 8 l-6 4" />
                  </g>
                </symbol>
                <g id={`wf-field-${uid}`}>{arrows}</g>
                {/* Sheltered water only: the band is the coast swept downwind, so on a
                    ragged shoreline it would otherwise wash over the land. */}
                <mask id={`wf-sea-${uid}`}>
                  <rect width={MAP_W} height={MAP_H} fill="#fff" />
                  <path d={location.landPath} fill="#000" />
                </mask>
              </defs>

              <rect width={MAP_W} height={MAP_H} fill={theme.mapSea} />
              <path d={location.landPath} fill={theme.mapLand} />
              {sheltered && !blowingHard && (
                <path d={location.leePath} fill={theme.mapLee} mask={`url(#wf-sea-${uid})`} />
              )}
              <path d={location.coastPath} fill="none" stroke={theme.mapCoast} strokeWidth="1.5" />
              {location.labels.map(l => (
                <text
                  key={l.text}
                  x={l.x}
                  y={l.y}
                  fontSize="9.5"
                  fontWeight="700"
                  letterSpacing="0.6"
                  fill={theme.caption}
                >
                  {l.text}
                </text>
              ))}

              {/* The field is drawn twice, the second copy one pitch upstream, and the
                  pair travels exactly one pitch per cycle -- one way, seamless loop. */}
              <g
                color={fieldColor}
                opacity={blowingHard ? 1 : 0.8}
                className={motionless ? undefined : `wf-flow-${uid}`}
              >
                <use href={`#wf-field-${uid}`} />
                {!motionless && <use href={`#wf-field-${uid}`} x={-pitchX} y={-pitchY} />}
              </g>

              <circle cx={location.marina.x} cy={location.marina.y} r="5" fill={pinFill} />
              {!motionless && (
                <circle
                  cx={location.marina.x}
                  cy={location.marina.y}
                  r="5"
                  fill="none"
                  stroke={pinFill}
                  strokeWidth="1.5"
                  className={`wf-pulse-${uid}`}
                />
              )}

              <text x="16" y="190" fontSize="10" fontWeight="700" letterSpacing="0.8" fill={theme.caption}>
                {data.offshore.speedKt} KT {compass(data.offshore.directionDeg)} · GUSTS {data.offshore.gustKt}
              </text>
            </svg>
          </div>

          {state === 'stale' ? (
            <div style={{ ...row, color: theme.textMuted }}>
              <span>Last Good Reading</span>
              <span>{minutesAgo(data.observedAt)} Min Ago</span>
            </div>
          ) : (
            <>
              {sheltered ? (
                <div style={{ ...row, background: theme.rowGoodBg, color: theme.accent }}>
                  <span>✓ Lee Side Is Sheltered</span>
                </div>
              ) : (
                <div style={row}>
                  <span>⚠ Gusts Reach The Anchorage</span>
                </div>
              )}
              <div style={row}>
                <span>Outside The Bay</span>
                <span>{data.offshore.speedKt} KT</span>
              </div>
              <div style={row}>
                <span>In The Anchorage{data.anchorageEstimated ? ' · Est.' : ''}</span>
                <span>{data.anchorage.speedKt} KT</span>
              </div>
              {data.anchorageEstimated && (
                <div style={note}>{ESTIMATE_NOTE}</div>
              )}
            </>
          )}
        </>
      )}
      </div>
    </article>
  );
}
