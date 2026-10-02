<script setup>
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import CgIcon from './CgIcon.vue'

const props = defineProps({
  /** primary = CTA néon vert · outline = contour accent · secondary = contour neutre · ghost = texte accent · danger */
  variant: { type: String, default: 'primary' },
  /** l = 56px · m = 52px · s = 44px */
  size: { type: String, default: null },
  icon: { type: String, default: null },
  to: { type: [String, Object], default: null },
  type: { type: String, default: 'button' },
  block: Boolean,
  loading: Boolean,
  disabled: Boolean,
})

const tag = computed(() => (props.to ? RouterLink : 'button'))
const resolvedSize = computed(() => props.size ?? (props.variant === 'primary' ? 'l' : 's'))
</script>

<template>
  <component
    :is="tag"
    :to="to || undefined"
    :type="to ? undefined : type"
    :disabled="to ? undefined : disabled || loading"
    :aria-busy="loading || undefined"
    class="cg-btn"
    :class="[`cg-btn--${variant}`, `cg-btn--${resolvedSize}`, { 'cg-btn--block': block }]"
  >
    <CgIcon v-if="icon" :name="icon" :size="variant === 'primary' ? 20 : 18" :stroke="variant === 'primary' ? null : 2.5" />
    <span class="cg-btn__label"><slot /></span>
  </component>
</template>

<style scoped>
.cg-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  min-width: var(--tap);
  padding: 0 var(--space-3);
  border: var(--border-w) solid transparent;
  border-radius: var(--radius-m);
  background: transparent;
  color: var(--color-text);
  font-family: var(--font-body);
  font-size: var(--fs-body);
  font-weight: 700;
  line-height: 1.1;
  text-align: center;
  text-decoration: none;
  white-space: nowrap;
  cursor: pointer;
  transition: transform var(--dur-fast) var(--ease-out), box-shadow var(--dur) var(--ease-out), opacity var(--dur);
  -webkit-user-select: none;
  user-select: none;
}
.cg-btn:active:not(:disabled) { transform: scale(0.97); }
.cg-btn:disabled { opacity: 0.45; cursor: not-allowed; }
.cg-btn[aria-busy='true'] { opacity: 0.7; cursor: progress; }
.cg-btn__label { min-width: 0; overflow: hidden; text-overflow: ellipsis; }
.cg-btn--block { display: flex; width: 100%; }

.cg-btn--l { height: var(--control-l); border-radius: 16px; }
.cg-btn--m { height: var(--control-m); border-radius: 16px; font-size: var(--fs-body-l); }
.cg-btn--s { height: var(--tap); border-radius: 12px; }

.cg-btn--primary {
  background: var(--color-action);
  color: var(--color-text-inverse);
  font-family: var(--font-display);
  font-style: italic;
  font-weight: 800;
  font-size: var(--fs-cta);
  letter-spacing: 0.04em;
  text-transform: uppercase;
  box-shadow: 0 0 24px rgb(var(--rgb-action) / 0.45);
  padding-inline: var(--space-4);
}
.cg-btn--primary.cg-btn--s { font-size: 1.0625rem; }
.cg-btn--primary:hover:not(:disabled) { box-shadow: 0 0 32px rgb(var(--rgb-action) / 0.6); }

.cg-btn--outline {
  border: var(--border-w-accent) solid var(--accent);
  color: var(--accent);
  box-shadow: 0 0 14px rgb(var(--rgb-accent) / 0.3);
}
.cg-btn--danger {
  border: var(--border-w-accent) solid var(--color-danger);
  color: var(--color-danger);
  box-shadow: 0 0 14px rgb(var(--rgb-pink) / 0.4);
}
.cg-btn--secondary {
  border-color: var(--color-border);
  color: var(--color-text);
}
.cg-btn--secondary:hover:not(:disabled) { border-color: var(--color-border-strong); }
.cg-btn--ghost {
  color: var(--accent);
  padding-inline: var(--space-2);
}
</style>
