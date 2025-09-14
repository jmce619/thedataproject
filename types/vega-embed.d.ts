declare module 'vega-embed' {
  // Minimal declarations to satisfy TS in app code.
  export type VisualizationSpec = unknown;
  export interface EmbedOptions {
    actions?: boolean | { export?: boolean; source?: boolean; compiled?: boolean; editor?: boolean };
    renderer?: 'canvas' | 'svg';
    tooltip?: boolean;
    width?: number;
    height?: number;
    // (add any others you actually use)
  }
  const embed: (el: Element | string, spec: VisualizationSpec, options?: EmbedOptions) => Promise<any>;
  export default embed;
}
