/**
 * Host half of the sidebar font-size knob.
 *
 * The left sidebar keeps its text sizes in the shipped stylesheets (14px rows,
 * 12px meta, 10px timestamps), so there is nothing to configure at runtime.
 * This plugin contributes one head `<style>` row to every index render instead,
 * scoped to the sidebar's own hooks, and exposes the two sizes as volatile
 * settings fields so the General section can edit them while the app runs.
 */

import z from './vendor/schemastery/lib/index.mjs'

/** Accepted range for the main sidebar text, in pixels. */
export const FONT_SIZE_RANGE = { min: 10, max: 24 }
/** Accepted range for meta labels and timestamps, in pixels. */
export const SMALL_FONT_SIZE_RANGE = { min: 9, max: 22 }
/** Main text size when the config omits the value. */
export const DEFAULT_FONT_SIZE = 15
/** Meta label size when the config omits the value. */
export const DEFAULT_SMALL_FONT_SIZE = 12

/** Settings field carrying the main sidebar text size. */
export const FONT_SIZE_FIELD = 'fontSize'
/** Settings field carrying the meta label and timestamp size. */
export const SMALL_FONT_SIZE_FIELD = 'smallFontSize'
/** CSS custom property carrying the main size; the browser half updates it live. */
export const FONT_SIZE_VARIABLE = '--dsh-sidebar-fontsize'
/** CSS custom property carrying the secondary size. */
export const SMALL_FONT_SIZE_VARIABLE = '--dsh-sidebar-fontsize-small'

/** Editable font sizes; both fields are volatile so edits apply without a restart. */
export const Config = z.object({
  [FONT_SIZE_FIELD]: z.number().step(1).min(FONT_SIZE_RANGE.min).max(FONT_SIZE_RANGE.max).default(DEFAULT_FONT_SIZE).volatile(),
  [SMALL_FONT_SIZE_FIELD]: z.number().step(1).min(SMALL_FONT_SIZE_RANGE.min).max(SMALL_FONT_SIZE_RANGE.max)
    .default(DEFAULT_SMALL_FONT_SIZE).volatile(),
})

/**
 * Clamp one configured pixel size.
 * @param value - raw config value.
 * @param fallback - size used when the value is not a finite number.
 * @param range - inclusive bounds.
 * @returns the rounded size inside `range`.
 */
function fontPixels(value, fallback, range) {
  const numeric = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(numeric)) return fallback
  return Math.min(range.max, Math.max(range.min, Math.round(numeric)))
}

/**
 * DSH's type-scale tokens, as declared by `ui-theme`'s token sheet: token name,
 * declared size, line height and weight. Panels from other plugins size their
 * text with the `font:` shorthand of these tokens, so remapping the shorthands
 * inside a scope rescales those panels without touching their CSS or class names.
 */
const TYPE_SCALE = [
  ['xl-24', 24, 32, 600],
  ['l-20', 20, 28, 500],
  ['m-18', 16, 28, 500],
  ['base-16', 16, 24, 400],
  ['base-strong-16', 16, 24, 500],
  ['s-14', 14, 22, 400],
  ['s-strong-14', 14, 22, 500],
  ['xs-13', 13, 20, 400],
  ['xs-strong-13', 13, 20, 500],
  ['xxs-12', 12, 18, 400],
  ['xxs-strong-12', 12, 18, 500],
  ['xxxs-11', 11, 14, 400],
  ['xxxs-strong-11', 11, 14, 500],
]

/** Step the scale is authored against; the panel scales relative to it. */
const SCALE_BASE = 14

/**
 * Rebuild the type-scale tokens for one main size, keeping weights, the family
 * and the relative hierarchy. Shorthands and their granular size/line-height
 * tokens are both emitted so either consumption style follows.
 * @param fontSize - main text size in px.
 * @returns the declarations for one custom-property scope.
 */
function typeScaleDeclarations(fontSize) {
  const scale = fontSize / SCALE_BASE
  const resize = (base) => Math.max(9, Math.round(base * scale))
  return TYPE_SCALE.flatMap(([name, size, lineHeight, weight]) => {
    const px = resize(size)
    const lh = Math.max(px + 2, resize(lineHeight))
    const prefix = `--dsw-font-${name}`
    const shorthand = weight === 400 ? `${px}px/${lh}px` : `${weight} ${px}px/${lh}px`
    return [
      `${prefix}:${shorthand} var(--dsw-font-family)`,
      `${prefix}-font-size:${px}px`,
      `${prefix}-line-height:${lh}px`,
    ]
  }).join(';')
}

/**
 * Build the head CSS for one pair of sizes.
 *
 * Every hook below is shipped by the owning package: `[data-sidebar-scrollport]`
 * marks the scrolling left sidebar, `[data-conversation-header-leading]` and
 * `[data-conversation-tabs]` the conversation header, `[data-sidebar-right-tab]`
 * and `[data-sidebar-right-guide]` the right sidebar; the `[class*="_…"]`
 * suffixes are the CSS-module names of the text cells themselves. Sizes go
 * through the two custom properties so the browser half can retune them live.
 * @param config - plugin config or plain sizes.
 * @returns a stylesheet body for `<style>` injection.
 */
export function sidebarFontCss(config = {}) {
  const fontSize = fontPixels(config[FONT_SIZE_FIELD], DEFAULT_FONT_SIZE, FONT_SIZE_RANGE)
  const smallFontSize = fontPixels(config[SMALL_FONT_SIZE_FIELD], DEFAULT_SMALL_FONT_SIZE, SMALL_FONT_SIZE_RANGE)
  const main = `var(${FONT_SIZE_VARIABLE})`
  const small = `var(${SMALL_FONT_SIZE_VARIABLE})`
  /** Size plus a line height that keeps the row's authored ratio. */
  const sized = (size, lineHeight) => `font-size:${size} !important;line-height:${lineHeight} !important`
  return [
    `:root{${FONT_SIZE_VARIABLE}:${fontSize}px;${SMALL_FONT_SIZE_VARIABLE}:${smallFontSize}px}`,
    // Left sidebar: rows, titles and meta labels (authored at 14/20, 12/20, 10/16).
    `[data-sidebar-scrollport]{font-size:${main} !important}`,
    `[data-sidebar-scrollport] [class*="_title"]{${sized(main, `calc(${main} * 20 / 14)`)}}`,
    `[data-sidebar-scrollport] [class*="_meta"]{${sized(small, `calc(${small} * 20 / 12)`)}}`,
    `[data-sidebar-scrollport] [class*="_time"]{${sized(small, `calc(${small} * 16 / 10)`)}}`,
    `:where(:has(> * > [data-sidebar-scrollport])) button{font-size:${main} !important}`,
    // Top bar: the session breadcrumb cluster, the mode chip beside it, and the
    // view tabs. Separators stay one step smaller than the crumbs.
    `[class*="_crumbs"] [class*="_crumb"]{${sized(main, `calc(${main} * 20 / 14)`)}}`,
    `[class*="_crumbs"] [class*="_crumbSep"]{${sized(small, `calc(${small} * 20 / 14)`)}}`,
    `[class*="_headerActions"] [class*="_label"]{font-size:${small} !important}`,
    `[data-conversation-tabs] [class*="_tab"]{${sized(main, `calc(${main} * 16 / 13)`)}}`,
    // Right sidebar: tab titles and the guide entry capsules.
    `[class*="_tabTitle"][data-sidebar-right-tab]{font-size:${main} !important}`,
    `[data-sidebar-right-guide] [class*="_entryTitle"]{${sized(main, `calc(${main} * 20 / 14)`)}}`,
    `[data-sidebar-right-guide] [class*="_entryDescription"]{font-size:${small} !important}`,
    // A third-party guide replacement (`dsh-better-sidebar`, guideTakeover) draws
    // its own cards with literal pixels instead of the type-scale tokens; it may
    // sit inside the panel or in its own guide container.
    `:is([data-sidebar-right-panel], [class*="_guide"]) [class*="_cardTitle"]{${sized(main, `calc(${main} * 20 / 14)`)}}`,
    `:is([data-sidebar-right-panel], [class*="_guide"]) [class*="_cardDesc"]{${sized(small, `calc(${small} * 18 / 12)`)}}`,
    `:is([data-sidebar-right-panel], [class*="_guide"]) [class*="_cardText"]{font-size:${small} !important}`,
    // Right sidebar panels from other plugins (files, Git, tasks, browser) size
    // their text with the shared type-scale tokens; rescale the scale in scope.
    `[data-sidebar-right-panel]{${typeScaleDeclarations(fontSize)}}`,
  ].join('\n')
}

/**
 * Publish the current sizes with every index render and serve the settings row.
 * @param ctx - Host plugin context.
 * @param config - validated live config with volatile size references.
 */
export function apply(ctx, config) {
  // Marks this instance as the owner of the `sidebar-fontsize` settings entry and
  // suppresses a generated page: the browser half draws the rows in General.
  ctx.inject(['settings'], (child) => {
    child.effect(() => child.settings.configure({ auto: false }, ctx.fiber))
  })
  ctx.on('webserver/index-inject', (table) => {
    table.push({
      kind: 'style',
      text: sidebarFontCss({
        [FONT_SIZE_FIELD]: config[FONT_SIZE_FIELD].get(),
        [SMALL_FONT_SIZE_FIELD]: config[SMALL_FONT_SIZE_FIELD].get(),
      }),
    })
  })
}
