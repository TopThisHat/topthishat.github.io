// Renders $…$ and $$…$$ to MathML with KaTeX, as a Sätteri mdast plugin.
//
// Why not satteri-katex: it emits raw HTML nodes, which need
// `features.rawHtml`, and under Sätteri 0.10 raw-HTML mode drops the
// `lang` and `meta` data from fenced code blocks, which breaks code titles.
// Returning `{ raw, mdxExpressions: false }` has the HTML parsed into
// elements without that feature. MathML needs no stylesheet or fonts.
import katex from 'katex';

const render = (source, displayMode) => {
  try {
    return katex.renderToString(source, { output: 'mathml', displayMode, throwOnError: true });
  } catch (error) {
    const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
    return `<span class="katex-error" title="${esc(String(error))}">${esc(source)}</span>`;
  }
};

export function satteriMathML() {
  return {
    name: 'mathml',
    math: (node) => ({ raw: render(node.value, true), mdxExpressions: false }),
    inlineMath: (node) => ({ raw: render(node.value, false), mdxExpressions: false }),
  };
}
