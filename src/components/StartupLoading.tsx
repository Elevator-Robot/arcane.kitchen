import { useEffect, useState, type CSSProperties } from 'react';
import { randomMerlinColor } from '../theme/merlinPalette';
import Button from './ui/Button';

export default function StartupLoading() {
  const [accent] = useState(randomMerlinColor);
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setSlow(true), 12000);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <main
      className="ak-startup"
      style={{ '--startup-accent': accent } as CSSProperties}
      aria-label="Opening Arcane Kitchen"
    >
      <div className="ak-startup-content">
        <p className="ak-startup-eyebrow">Recipes kept. Stories shared.</p>
        <h1 className="ak-startup-title">Arcane Kitchen</h1>
        <div className="ak-startup-illustration" aria-hidden="true">
          <svg viewBox="0 0 320 260" fill="none" focusable="false">
            <ellipse
              cx="160"
              cy="228"
              rx="92"
              ry="9"
              fill="currentColor"
              opacity=".08"
            />
            <path
              d="M54 210V116a106 106 0 0 1 212 0v94"
              stroke="currentColor"
              strokeWidth="1"
              opacity=".2"
            />
            <path
              d="M65 206V116a95 95 0 0 1 190 0v90"
              stroke="currentColor"
              strokeWidth="1"
              strokeDasharray="2 7"
              opacity=".2"
            />
            <g
              className="ak-startup-steam"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <path d="M134 121c-22-21 20-29 0-52" />
              <path d="M160 115c-22-22 22-32 0-59" />
              <path d="M186 121c-20-20 20-28 0-48" />
            </g>
            <path
              d="M108 150c-30-18-38 18-12 23m116-23c30-18 38 18 12 23"
              stroke="currentColor"
              strokeWidth="5"
              strokeLinecap="round"
            />
            <path
              d="M101 146h118l-9 44c-4 19-21 29-50 29s-46-10-50-29z"
              fill="currentColor"
              opacity=".13"
            />
            <path
              d="M101 146h118l-9 44c-4 19-21 29-50 29s-46-10-50-29z"
              stroke="currentColor"
              strokeWidth="3"
            />
            <ellipse
              cx="160"
              cy="146"
              rx="59"
              ry="10"
              fill="var(--theme-bg)"
              stroke="currentColor"
              strokeWidth="3"
            />
            <path
              d="M122 145c19-5 56-5 76 0"
              stroke="currentColor"
              opacity=".45"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <path
              d="m121 212-6 11m84-11 6 11"
              stroke="currentColor"
              strokeWidth="4"
              strokeLinecap="round"
            />
            <path
              d="M160 167c1 9 7 14 16 16-9 1-15 7-16 16-2-9-7-15-16-16 9-2 14-7 16-16Z"
              fill="currentColor"
              opacity=".75"
            />
            <g className="ak-startup-embers" fill="currentColor">
              <circle cx="92" cy="93" r="2" />
              <circle cx="230" cy="109" r="2" />
              <circle cx="211" cy="56" r="1.5" />
            </g>
          </svg>
        </div>
        <div role="status" aria-live="polite" className="ak-startup-status">
          <p>Preparing your kitchen…</p>
          <span className="ak-startup-dots" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
        </div>
        <p className="ak-startup-caption">A place for recipes worth keeping.</p>
        {slow && (
          <div className="ak-startup-recovery">
            <p role="status">
              This is taking longer than usual. You can keep waiting or try
              reloading.
            </p>
            <Button
              variant="secondary"
              onClick={() => window.location.reload()}
            >
              Reload kitchen
            </Button>
          </div>
        )}
      </div>
    </main>
  );
}
