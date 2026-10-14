// A list of narrated steps that a demo can play automatically or advance one
// click at a time. Each step appends a line of text and runs an optional
// DOM/state change.
export type Step = { text: string; apply?: () => void };

export class Stepper {
  private steps: Step[] = [];
  private i = 0;
  private timer = 0;
  private reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  constructor(
    private list: HTMLOListElement,
    private manual: () => boolean,
    private onChange?: () => void,
  ) {}

  get running() {
    return this.i < this.steps.length;
  }

  load(steps: Step[], delay = 700) {
    this.stop();
    this.steps = steps;
    this.i = 0;
    this.list.replaceChildren();
    if (this.manual()) {
      this.next();
    } else if (this.reduced) {
      while (this.next());
    } else {
      this.next();
      this.timer = window.setInterval(() => {
        if (!this.next()) this.stop();
      }, delay);
    }
    this.onChange?.();
  }

  next(): boolean {
    const s = this.steps[this.i];
    if (!s) return false;
    s.apply?.();
    const li = document.createElement('li');
    li.textContent = s.text;
    this.list.append(li);
    this.list.querySelectorAll('li').forEach((el) => el.classList.remove('current'));
    li.classList.add('current');
    this.i++;
    this.onChange?.();
    return true;
  }

  finish() {
    this.stop();
    while (this.next());
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = 0;
  }

  clear() {
    this.stop();
    this.steps = [];
    this.i = 0;
    this.list.replaceChildren();
    this.onChange?.();
  }
}

// 32-bit FNV-1a followed by a murmur3 finalizer, so every bit of the result
// depends on the whole key. Shared by the demos so a key hashes the same way
// in each of them.
export function hash32(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return h >>> 0;
}

export const hex = (n: number, w = 8) => '0x' + n.toString(16).padStart(w, '0');
export const bin = (n: number, w: number) => n.toString(2).padStart(w, '0');
