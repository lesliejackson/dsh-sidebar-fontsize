# Interface text size

The shipped UI keeps its typography in stylesheets: the left sidebar rows render
at 14 px with 12/10 px meta labels, the session header title at 14 px, its view
tabs at 13 px, the right sidebar guide entries at 14/11 px and its tab titles at
whatever the shell inherits. This bundle publishes a head stylesheet on every
index render and registers two rows in **Settings → General**, so those sizes
become user preferences.

## Edit in Settings

Open **Settings → General** and find *Title text size* and *Secondary text size*
(next to the appearance and font rows). Each row has a −/+ stepper; edits are
written through the settings document, apply immediately, and survive restarts.

| Row | Field | Range | Default | Applies to |
| --- | --- | --- | --- | --- |
| Title text size | `fontSize` | 10–24 | 15 | Left sidebar session/workspace titles, navigation rows, group names, the New session control; the session header breadcrumbs and view tabs; right sidebar tab titles and guide entry titles; the whole type scale inside right sidebar panels |
| Secondary text size | `smallFontSize` | 9–22 | 12 | Timestamps, meta labels, the breadcrumb separator `/`, the mode chip beside the session title, and guide entry descriptions |

Panels from other plugins (files, Git, task board, browser — here
`dsh-better-sidebar`) size their text with the shared `--dsw-font-*` type-scale
tokens instead of literal pixels. The stylesheet rebuilds those tokens
proportionally inside `[data-sidebar-right-panel]` from `fontSize` (the scale is
authored against 14 px, so `fontSize: 15` makes the panel's 14 px step 15 px and
its 11 px step 12 px), which rescales those panels without touching their CSS,
class names or code.

Both fields are volatile, so the Host commits a change into the running config
without a restart; the browser half also updates the two CSS custom properties
directly, so the class-targeted surfaces restyle immediately. The type-scale
token block is generated per page render, so third-party panels pick up a new
size on the next page load rather than instantly.

## Edit in the plugin config

The bundle inserts the row `sidebar-fontsize` and ships these defaults in its
own patch (`dsh-sidebar-fontsize/cordis.patch.yml`):

```yaml
- insert:
    - id: sidebar-fontsize
      name: '@local/dsh-sidebar-fontsize'
      config:
        fontSize: 15
        smallFontSize: 12
```

A profile-patch entry targeting the same id replaces that whole config and
serves as the composition layer the Settings rows fall back to:

```yaml
- id: sidebar-fontsize
  config:
    fontSize: 16
    smallFontSize: 13
```

## Tune without opening Settings

The injected CSS reads two custom properties, so you can preview sizes from
DevTools:

```js
document.documentElement.style.setProperty('--dsh-sidebar-fontsize', '16px')
document.documentElement.style.setProperty('--dsh-sidebar-fontsize-small', '13px')
```

## What it changes and what it does not

- Every rule is scoped to a shipped hook or to the CSS-module name of the text
  cell it sizes: `[data-sidebar-scrollport]`, `[class*="_title"]`,
  `[class*="_meta"]`/`[class*="_time"]` for the left sidebar;
  `[class*="_crumbs"] [class*="_crumb"]`, `[class*="_crumbSep"]`,
  `[data-conversation-tabs] [class*="_tab"]` and `[class*="_headerActions"]
  [class*="_label"]` for the top bar; `[class*="_tabTitle"][data-sidebar-right-tab]`
  and `[data-sidebar-right-guide] [class*="_entryTitle"]/"_entryDescription"` for
  the right sidebar. The right sidebar panel scope only redefines the
  `--dsw-font-*` type-scale tokens, so nothing inside it is matched by class.
- Panel text that ignores the type scale is matched by its own CSS-module
  suffix: third-party guide cards (`dsh-better-sidebar` replaces the guide body
  and sizes `cardTitle`/`cardDesc` with literal pixels) follow the two rows
  through `_cardTitle`, `_cardDesc` and `_cardText`.
- Size overrides carry a line height derived from the authored ratio
  (20/14 for titles, 20/12 for meta, 16/10 for timestamps, 16/13 for view
  tabs, 18/12 for guide descriptions), so raising a size does not clip the text
  inside rows with fixed heights.
- Only `font-size` changes: row heights, icons, spacing and the terminal cell
  grid stay as shipped. At the top of the ranges the fixed row heights hold, so
  very large values look cramped rather than expanding lists.
- The terminal keeps its own font: DSH sizes it from the theme's terminal font
  settings, not from these two rows.
- The workspace/session count badges and other micro-labels that ship below
  10 px keep their own sizes where no rule above matches them.

## Limitations

- Text cells are matched by their CSS-module name suffix (`_title`, `_time`,
  `_crumb`, `_tab`, `_entryTitle`, …). A DSH upgrade that renames one of them
  silently stops that rule from applying until this bundle is updated; the data
  hooks (`data-sidebar-scrollport`, `data-conversation-tabs`,
  `data-sidebar-right-guide`) are the same kind of contract.
- `vendor/{schemastery,cosmokit}` is a copy of the two packages shipped with the
  installed DSH (schemastery 3.19.0, cosmokit 1.9.0); schemastery's import of
  cosmokit was rewritten to a relative path so the copy works outside a
  `node_modules` tree (npm/pnpm packing drops nested `node_modules`). They are
  vendored because a linked bundle in this workspace cannot resolve the
  installation's packages, and the settings service requires a real schemastery
  schema with `.volatile()` fields. Copy them again after a DSH upgrade if the
  settings row reports a schema incompatibility.
