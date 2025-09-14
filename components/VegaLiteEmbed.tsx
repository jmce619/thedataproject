'use client';

import { useEffect, useRef } from 'react';

// type-only so it doesn't affect server bundling
type VisualizationSpec = import('vega-lite').TopLevelSpec;

export default function VegaLiteEmbed({
  spec,
  className,
  signalListeners,
}: {
  spec: VisualizationSpec;
  className?: string;
  signalListeners?: Record<string, (name: string, value: any) => void>;
}) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let view: any;
    let cancelled = false;

    (async () => {
      const embed = (await import('vega-embed')).default;
      if (!ref.current) return;
      const result = await embed(ref.current, spec as any, {
        actions: false,
        renderer: 'canvas',
      });

      if (cancelled) {
        try { result.view.finalize(); } catch {}
        return;
      }

      view = result.view;

      if (signalListeners) {
        for (const [sig, fn] of Object.entries(signalListeners)) {
          try { view.addSignalListener(sig, fn); } catch {}
        }
      }
      await view.runAsync();
    })();

    return () => {
      cancelled = true;
      try { view?.finalize?.(); } catch {}
    };
  }, [spec, signalListeners]);

  return <div ref={ref} className={className} />;
}
