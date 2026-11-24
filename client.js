/**
 * Browser half of the sidebar font-size knob.
 *
 * Registers the two size rows into Settings → General, applies the chosen sizes
 * to the document through the two CSS custom properties, and writes edits back
 * through the shared configuration form of the `sidebar-fontsize` entry.
 *
 * A click is optimistic and coalesced: the row keeps a local draft that moves the
 * number and the document immediately, then one atomic settings write carries the
 * settled value to the Host. Without the draft the displayed value could only
 * change after a full settings round trip, so repeated clicks would queue repeated
 * whole-document writes and the settings page would stall behind them.
 */
window.__ModuleLoader__.load({
  id: '@local/dsh-sidebar-fontsize',
  factory(require) {
    const React = require('react')

    const NAMESPACE = 'sidebarFontSize'
    const ENTRY_ID = 'sidebar-fontsize'
    const FONT_SIZE_FIELD = 'fontSize'
    const SMALL_FONT_SIZE_FIELD = 'smallFontSize'
    const FONT_SIZE_VARIABLE = '--dsh-sidebar-fontsize'
    const SMALL_FONT_SIZE_VARIABLE = '--dsh-sidebar-fontsize-small'
    const FONT_SIZE_RANGE = { min: 10, max: 24, defaultValue: 15 }
    const SMALL_FONT_SIZE_RANGE = { min: 9, max: 22, defaultValue: 12 }
    /** Quiet window that folds a burst of stepper clicks into one settings write. */
    const WRITE_DELAY_MS = 220

    // Dotted keys: the locale service looks a key up verbatim in the dictionary.
    const messages = {
      zh: {
        'main.title': '标题字号',
        'main.description': '左侧栏会话与分组标题、顶部会话标题与页签、右侧栏页签与入口标题',
        'small.title': '次要文字字号',
        'small.description': '时间戳、说明文字与状态标签',
        increase: '增大',
        decrease: '减小',
        unit: 'px',
      },
      en: {
        'main.title': 'Title text size',
        'main.description': 'Left sidebar session and group titles, the session header and its tabs, right sidebar tabs and guide entry titles',
        'small.title': 'Secondary text size',
        'small.description': 'Timestamps, descriptions and status labels',
        increase: 'Increase',
        decrease: 'Decrease',
        unit: 'px',
      },
    }

    // Same cell rhythm as the shipped font-size rows; only --dsw-alias tokens so
    // the rows follow the active theme.
    const styles = [
      '.dshsfs-row{display:flex;align-items:center;gap:8px;padding:16px 0;border-bottom:0.5px solid var(--dsw-alias-border-l2)}',
      '.dshsfs-row:last-child{border-bottom:none}',
      '.dshsfs-text{flex:1;min-width:0;display:flex;flex-direction:column;gap:4px;padding-right:24px}',
      '.dshsfs-title{font-size:14px;font-weight:400;line-height:22px;color:var(--dsw-alias-label-primary)}',
      '.dshsfs-desc{font-size:12px;font-weight:400;line-height:18px;color:var(--dsw-alias-label-tertiary)}',
      '.dshsfs-control{display:inline-flex;align-items:center;gap:8px}',
      '.dshsfs-stepper{display:inline-flex;align-items:center;justify-content:space-between;gap:2px;box-sizing:border-box;min-width:108px;height:36px;padding:0 6px;border-radius:var(--dsw-radius-md);background:var(--dsw-alias-bg-module-platform)}',
      '.dshsfs-button{display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;padding:0;border:none;border-radius:var(--dsw-radius-xs);background:transparent;color:var(--dsw-alias-label-primary);font-size:15px;line-height:1;cursor:pointer}',
      '.dshsfs-button:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover)}',
      '.dshsfs-button:disabled{color:var(--dsw-alias-label-caption);cursor:default}',
      '.dshsfs-value{min-width:24px;text-align:center;font-size:14px;line-height:22px;font-variant-numeric:tabular-nums;color:var(--dsw-alias-label-primary)}',
      '.dshsfs-unit{font-size:14px;line-height:22px;color:var(--dsw-alias-label-secondary)}',
    ].join('')

    /**
     * Read one pair of sizes from a config-form value, falling back to the defaults.
     * @param value - accepted settings section, or undefined before the first answer.
     * @returns the two sizes in pixels.
     */
    function readSizes(value) {
      const fontSize = value === undefined ? undefined : value[FONT_SIZE_FIELD]
      const smallFontSize = value === undefined ? undefined : value[SMALL_FONT_SIZE_FIELD]
      return {
        fontSize: typeof fontSize === 'number' && Number.isFinite(fontSize)
          ? fontSize : FONT_SIZE_RANGE.defaultValue,
        smallFontSize: typeof smallFontSize === 'number' && Number.isFinite(smallFontSize)
          ? smallFontSize : SMALL_FONT_SIZE_RANGE.defaultValue,
      }
    }

    /** Sizes already written to the document, so an unchanged pair never reruns style invalidation. */
    let appliedSizes = { fontSize: undefined, smallFontSize: undefined }

    /**
     * Publish one pair of sizes as inline custom properties on the document root.
     * @param sizes - the two sizes in pixels.
     */
    function applySizeVariables(sizes) {
      if (sizes.fontSize === appliedSizes.fontSize && sizes.smallFontSize === appliedSizes.smallFontSize) return
      appliedSizes = sizes
      const root = document.documentElement
      root.style.setProperty(FONT_SIZE_VARIABLE, `${sizes.fontSize}px`)
      root.style.setProperty(SMALL_FONT_SIZE_VARIABLE, `${sizes.smallFontSize}px`)
    }

    /**
     * One size row: title, description, and a −/+ stepper.
     * @param props - label, description, current value, range, translations and the step callback.
     * @returns the row element tree.
     */
    function SizeRow({ label, description, value, range, t, onStep }) {
      const button = (delta, glyph, text) => React.createElement('button', {
        type: 'button',
        className: 'dshsfs-button',
        'aria-label': text,
        title: text,
        disabled: value + delta < range.min || value + delta > range.max,
        onClick: () => { onStep(delta) },
      }, glyph)
      return React.createElement('div', { className: 'dshsfs-row' },
        React.createElement('div', { className: 'dshsfs-text' },
          React.createElement('div', { className: 'dshsfs-title' }, label),
          React.createElement('div', { className: 'dshsfs-desc' }, description),
        ),
        React.createElement('div', { className: 'dshsfs-control' },
          React.createElement('div', { className: 'dshsfs-stepper' },
            button(-1, '\u2212', t('decrease')),
            React.createElement('span', { className: 'dshsfs-value' }, String(value)),
            button(1, '+', t('increase')),
          ),
          React.createElement('span', { className: 'dshsfs-unit' }, t('unit')),
        ),
      )
    }

    /**
     * The General-section contribution: the two size rows.
     *
     * The shown sizes are a local draft until the Host accepts them; one debounced
     * `mutate` carries every field the draft changed, so a burst of clicks becomes a
     * single settings write instead of one whole-document write per click.
     * @param props - translated copy from the slot and the injected form.
     * @returns the rows.
     */
    function SidebarFontSizeRows({ t, host }) {
      const subscribe = React.useCallback((listener) => host.subscribe(listener), [host])
      const getSnapshot = React.useCallback(() => host.getSnapshot(), [host])
      const snapshot = React.useSyncExternalStore(subscribe, getSnapshot)
      const accepted = readSizes(snapshot.value)

      /** Latest user choice; null means the rows follow the accepted settings. */
      const [draft, setDraft] = React.useState(null)
      const shown = draft ?? accepted
      const desired = React.useRef(null)
      /** Bumped on every user step so a settling write never discards newer clicks. */
      const steps = React.useRef(0)
      const timer = React.useRef(0)
      const busy = React.useRef(false)
      const alive = React.useRef(true)

      React.useEffect(() => () => {
        alive.current = false
        window.clearTimeout(timer.current)
      }, [])

      // While the rows are mounted they own the preview: a click restyles the
      // document immediately, before any settings round trip.
      React.useLayoutEffect(() => { applySizeVariables(shown) })

      /** Send the settled draft as one atomic settings write. */
      const flush = React.useCallback(async () => {
        timer.current = 0
        if (busy.current || desired.current === null) return
        const next = desired.current
        const current = readSizes(host.getSnapshot().value)
        const ops = []
        if (next.fontSize !== current.fontSize) {
          ops.push({ op: 'set', path: [FONT_SIZE_FIELD], value: next.fontSize })
        }
        if (next.smallFontSize !== current.smallFontSize) {
          ops.push({ op: 'set', path: [SMALL_FONT_SIZE_FIELD], value: next.smallFontSize })
        }
        if (ops.length === 0) {
          // The burst ended on the accepted value: drop the draft without a write.
          desired.current = null
          if (alive.current) setDraft(null)
          return
        }
        const revision = steps.current
        busy.current = true
        try {
          const written = await host.mutate(ops)
          if (!written) console.warn('sidebar font size: settings write was refused', ops)
        } catch (error) {
          console.warn('sidebar font size: settings write failed', error)
        } finally {
          busy.current = false
          if (!alive.current) return
          if (revision === steps.current) {
            // Nothing newer arrived: adopt the accepted settings again.
            desired.current = null
            setDraft(null)
          } else {
            // A click landed while the write crossed the wire; send that one too.
            void flush()
          }
        }
      }, [host])

      /** Move one size by `delta` from the shown value and schedule the settle write. */
      const step = (field, delta) => {
        const base = desired.current ?? shown
        const next = { ...base, [field]: base[field] + delta }
        steps.current += 1
        desired.current = next
        setDraft(next)
        window.clearTimeout(timer.current)
        timer.current = window.setTimeout(() => { void flush() }, WRITE_DELAY_MS)
      }

      return React.createElement(React.Fragment, null,
        React.createElement('style', null, styles),
        React.createElement(SizeRow, {
          label: t('main.title'), description: t('main.description'),
          value: shown.fontSize, range: FONT_SIZE_RANGE, t,
          onStep: (delta) => { step(FONT_SIZE_FIELD, delta) },
        }),
        React.createElement(SizeRow, {
          label: t('small.title'), description: t('small.description'),
          value: shown.smallFontSize, range: SMALL_FONT_SIZE_RANGE, t,
          onStep: (delta) => { step(SMALL_FONT_SIZE_FIELD, delta) },
        }),
      )
    }

    return {
      inject: ['slots', 'locale', 'configForms'],
      apply(ctx) {
        const host = ctx.configForms.get(ENTRY_ID)
        ctx.effect(() => {
          applySizeVariables(readSizes(host.getSnapshot().value))
          const unsubscribe = host.subscribe(() => {
            applySizeVariables(readSizes(host.getSnapshot().value))
          })
          return () => {
            unsubscribe()
            appliedSizes = { fontSize: undefined, smallFontSize: undefined }
            document.documentElement.style.removeProperty(FONT_SIZE_VARIABLE)
            document.documentElement.style.removeProperty(SMALL_FONT_SIZE_VARIABLE)
          }
        }, 'sidebar font size: live size variables')
        ctx.effect(() => ctx.locale.register(NAMESPACE, messages), 'sidebar font size: dictionaries')
        ctx.slots.inject('settings.general.item', () => ctx.slots.register({
          name: 'settings.general.item',
          id: ENTRY_ID,
          order: 25,
          locale: NAMESPACE,
          inject: () => ({ host }),
        }, SidebarFontSizeRows))
      },
    }
  },
})
