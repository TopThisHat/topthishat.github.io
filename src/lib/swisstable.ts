// Shapes the benchmark JSON under src/data/swisstable into BenchChart panels.
import cbench from '../data/swisstable/cbench.json';
import python from '../data/swisstable/python.json';
import go from '../data/swisstable/go.json';

export type Point = { x: number; y: number };
export type Series = { name: string; slot: 1 | 2 | 3; points: Point[] };
export type Panel = { label: string; series: Series[] };

const sorted = (pts: Point[]) => pts.sort((a, b) => a.x - b.x);

// Slot colors are fixed by role across every chart in the post:
// 1 = the incumbent (chained / dict / old Go map), 2 = CPython-style indexed, 3 = Swiss.
export function cPanels(): Panel[] {
  const metric = (key: 'hit_ns' | 'miss_ns' | 'dep_hit_ns' | 'bytes_per_item', label: string): Panel => ({
    label,
    series: [
      { name: 'chained', slot: 1, points: [] },
      { name: 'CPython-style', slot: 2, points: [] },
      { name: 'Swiss', slot: 3, points: [] },
    ].map((s) => ({
      ...s,
      points: sorted(
        cbench.rows
          .filter((r) => r.table === { chained: 'chained', 'CPython-style': 'indexed', Swiss: 'swiss' }[s.name])
          .map((r) => ({ x: r.n, y: r[key] as number })),
      ),
    })) as Series[],
  });
  return [metric('hit_ns', 'lookup hit'), metric('miss_ns', 'lookup miss'), metric('dep_hit_ns', 'dependent hits')];
}

export function cMemoryPanel(): Panel[] {
  return [cPanels()[0]].map(() => ({
    label: 'bytes per entry',
    series: (['chained', 'indexed', 'swiss'] as const).map((t, i) => ({
      name: ['chained', 'CPython-style', 'Swiss'][i],
      slot: (i + 1) as 1 | 2 | 3,
      points: sorted(cbench.rows.filter((r) => r.table === t).map((r) => ({ x: r.n, y: r.bytes_per_item }))),
    })),
  }));
}

type PyMetric = 'hit_ns' | 'miss_ns' | 'insert_ns' | 'delete_ns' | 'py_hit_ns' | 'bytes_per_item' | 'hit_after_delete_ns';

export function pythonPanels(metric: PyMetric): Panel[] {
  const kinds: { key: string; label: string }[] = [
    { key: 'str', label: 'str keys' },
    { key: 'int-rand', label: 'random int keys' },
    { key: 'int-seq', label: 'sequential int keys' },
  ];
  return kinds.map((k) => ({
    label: k.label,
    series: [
      { name: 'dict', slot: 1 as const, table: 'dict' },
      { name: 'SwissDict', slot: 3 as const, table: 'swiss' },
    ].map((s) => ({
      name: s.name,
      slot: s.slot,
      points: sorted(
        python.rows.filter((r) => r.keys === k.key && r.table === s.table).map((r) => ({ x: r.n, y: r[metric] as number })),
      ),
    })),
  }));
}

export function goPanels(benches: { bench: string; label: string }[], metric: 'ns_per_op' | 'ns_per_insert' | 'bytes_per_item'): Panel[] {
  return benches.map((b) => ({
    label: b.label,
    series: [
      { name: 'Go 1.23 map', slot: 1 as const, table: 'old' },
      { name: 'Swiss map', slot: 3 as const, table: 'swiss' },
    ].map((s) => ({
      name: s.name,
      slot: s.slot,
      points: sorted(
        go.rows
          .filter((r) => r.bench === b.bench && r.table === s.table)
          .map((r) => ({ x: r.n, y: (r as Record<string, unknown>)[metric] as number })),
      ),
    })),
  }));
}

export const meta = {
  cpu: cbench.cpu,
  python: python.python,
  go: go.go,
  simd: python.simd,
};
