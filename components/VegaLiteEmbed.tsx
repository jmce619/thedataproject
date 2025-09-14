'use client';

import { useEffect, useRef } from 'react';
import type { VisualizationSpec } from 'vega-embed';

export default function VegaLiteEmbed({ spec }: { spec: VisualizationSpec }) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const embed = (await import('vega-embed')).default;
      if (!cancelled && ref.current) {
        await embed(ref.current, spec, { actions: false });
      }
    })();
    return () => { cancelled = true; };
  }, [spec]);

  return <div ref={ref} />;
}
