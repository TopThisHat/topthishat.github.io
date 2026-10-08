import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import { SITE } from '../site.config';

const require = createRequire(import.meta.url);
const font = (pkg: string) => readFile(require.resolve(`@fontsource/${pkg}`));

const fontsPromise = Promise.all([
  font('jetbrains-mono/files/jetbrains-mono-latin-400-normal.woff'),
  font('jetbrains-mono/files/jetbrains-mono-latin-700-normal.woff'),
  font('newsreader/files/newsreader-latin-400-normal.woff'),
]);

const C = { bg: '#0e100e', fg: '#e4e2d9', muted: '#8f8d84', rule: '#262924', accent: '#4ee07c' };

type Node = { type: string; props: Record<string, unknown> };
const h = (type: string, style: Record<string, unknown>, ...children: (Node | string)[]): Node => ({
  type,
  props: { style: { display: 'flex', ...style }, children },
});

export async function renderOg({ title, subtitle }: { title: string; subtitle?: string }) {
  const [mono, monoBold, serif] = await fontsPromise;

  const tree = h(
    'div',
    {
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      padding: '72px 80px',
      background: C.bg,
      color: C.fg,
      fontFamily: 'JetBrains Mono',
    },
    h(
      'div',
      { display: 'flex', alignItems: 'center', fontSize: 30, fontWeight: 700 },
      SITE.wordmark,
      h('div', { width: 17, height: 32, marginLeft: 6, background: C.accent }),
    ),
    h(
      'div',
      { display: 'flex', flexDirection: 'column' },
      h(
        'div',
        { fontSize: title.length > 60 ? 54 : 66, fontWeight: 700, lineHeight: 1.15, letterSpacing: -1.5, textWrap: 'balance' },
        title,
      ),
      ...(subtitle
        ? [h('div', { marginTop: 28, fontFamily: 'Newsreader', fontSize: 32, color: C.muted, lineHeight: 1.4 }, subtitle)]
        : []),
    ),
    h(
      'div',
      { display: 'flex', justifyContent: 'space-between', paddingTop: 28, borderTop: `2px solid ${C.rule}`, fontSize: 24, color: C.muted },
      h('div', {}, SITE.name),
      h('div', {}, new URL(SITE.url).host),
    ),
  );

  const svg = await satori(tree as Parameters<typeof satori>[0], {
    width: 1200,
    height: 630,
    fonts: [
      { name: 'JetBrains Mono', data: mono, weight: 400 },
      { name: 'JetBrains Mono', data: monoBold, weight: 700 },
      { name: 'Newsreader', data: serif, weight: 400 },
    ],
  });
  return new Resvg(svg).render().asPng();
}
