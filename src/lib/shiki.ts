import type { ShikiTransformer } from 'shiki';

// ```ts title="agent.ts"  ->  <pre data-title="agent.ts">
export function transformerTitle(): ShikiTransformer {
  return {
    name: 'title',
    pre(node) {
      const title = this.options.meta?.__raw?.match(/title="([^"]+)"/)?.[1];
      if (title) node.properties['data-title'] = title;
    },
  };
}
