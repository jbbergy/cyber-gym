<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

const props = defineProps({
  /** [{ value: number, label: string }] dans l'ordre chronologique */
  points: { type: Array, required: true },
  height: { type: Number, default: 170 },
  /** description accessible de la courbe */
  label: { type: String, required: true },
  format: { type: Function, default: (v) => String(v) },
})

const root = ref(null)
const width = ref(0) // mesurée au montage : pas de débordement au premier rendu
let ro
onMounted(() => {
  width.value = Math.max(160, root.value.clientWidth)
  ro = new ResizeObserver(([entry]) => (width.value = Math.max(160, entry.contentRect.width)))
  ro.observe(root.value)
})
onBeforeUnmount(() => ro?.disconnect())

const STEPS = [0.5, 1, 2, 2.5, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000]
const axisW = 30
const padTop = 12
const padBottom = 8

const scale = computed(() => {
  const values = props.points.map((p) => p.value)
  let min = Math.min(...values)
  let max = Math.max(...values)
  if (min === max) { min -= 5; max += 5 }
  const step = STEPS.find((s) => (max - min) / s <= 3) ?? 1000
  const lo = Math.floor(min / step) * step
  const hi = Math.max(Math.ceil(max / step) * step, lo + step)
  const ticks = []
  for (let v = hi; v >= lo - 1e-9; v -= step) ticks.push(Math.round(v * 100) / 100)
  return { lo, hi, ticks }
})

const geo = computed(() => {
  const w = width.value
  const h = props.height
  const { lo, hi } = scale.value
  const x0 = axisW + 8
  const x1 = w - 8
  const n = props.points.length
  const y = (v) => padTop + (1 - (v - lo) / (hi - lo)) * (h - padTop - padBottom)
  const pts = props.points.map((p, i) => ({
    x: n === 1 ? (x0 + x1) / 2 : x0 + (i * (x1 - x0)) / (n - 1),
    y: y(p.value),
  }))
  return { w, h, y, pts }
})
const polyline = computed(() => geo.value.pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' '))
</script>

<template>
  <div ref="root" class="cg-chart" :style="{ minHeight: `${height}px` }">
    <svg v-if="width" :width="geo.w" :height="geo.h" :viewBox="`0 0 ${geo.w} ${geo.h}`" role="img" :aria-label="label">
      <g v-for="t in scale.ticks" :key="t">
        <line :x1="axisW" :x2="geo.w" :y1="geo.y(t)" :y2="geo.y(t)" class="cg-chart__grid" />
        <text x="0" :y="geo.y(t) + 4" class="cg-chart__tick">{{ format(t) }}</text>
      </g>
      <polyline :points="polyline" class="cg-chart__line" />
      <circle
        v-for="(p, i) in geo.pts"
        :key="i"
        :cx="p.x"
        :cy="p.y"
        :r="i === geo.pts.length - 1 ? 6 : 3.5"
        :class="i === geo.pts.length - 1 ? 'cg-chart__last' : 'cg-chart__dot'"
      />
    </svg>
    <div class="cg-chart__x" :style="{ paddingLeft: `${axisW}px` }">
      <span>{{ points[0]?.label }}</span>
      <span v-if="points.length > 1">{{ points.at(-1)?.label }}</span>
    </div>
  </div>
</template>

<style scoped>
.cg-chart { width: 100%; min-width: 0; display: flex; flex-direction: column; gap: var(--space-2); }
.cg-chart svg { overflow: visible; }
.cg-chart__grid { stroke: var(--color-border); stroke-width: 1; }
.cg-chart__tick { fill: var(--color-text-muted); font-size: 11px; font-family: var(--font-body); }
.cg-chart__line {
  fill: none;
  stroke: var(--color-action);
  stroke-width: 3;
  stroke-linecap: round;
  stroke-linejoin: round;
  filter: drop-shadow(0 0 6px rgb(var(--rgb-action) / 0.75));
}
.cg-chart__dot { fill: var(--color-surface); stroke: var(--color-action); stroke-width: 2; }
.cg-chart__last { fill: var(--color-action); filter: drop-shadow(0 0 8px rgb(var(--rgb-action) / 0.9)); }
.cg-chart__x { display: flex; justify-content: space-between; font-size: var(--fs-label); line-height: 16px; color: var(--color-text-muted); }
</style>
