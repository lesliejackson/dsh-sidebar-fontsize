/**
 * Browser half of the sidebar font-size knob.
 *
 * Registers the two size rows into Settings → General, keeps the injected head
 * stylesheet in sync with the accepted settings values through the two CSS
 * custom properties, and writes edits back through the shared configuration
 * form of the `sidebar-fontsize` entry.
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
     * Apply the accepted sizes to the document so the sidebar restyles live.
     * @param {object} host - shared configuration form of this entry.
     */
    function applyLiveVariables(host) {
      const value = host.getSnapshot().value
      if (value === undefined) return
      const root = document.documentElement
      root.style.setProperty(FONT_SIZE_VARIABLE, `${value[FONT_SIZE_FIELD]}px`)
      root.style.setProperty(SMALL_FONT_SIZE_VARIABLE, `${value[SMALL_FONT_SIZE_FIELD]}px`)
    }

    /**
     * Queue one settings write and report a refused or failed write in the console.
     * @param {object} host - shared configuration form of this entry.
     * @param {string} field - settings field name.
     * @param {number} px - chosen pixel size.
     */
    function writeSize(host, field, px) {
      void host.set(field, px).catch((error) => { console.warn('sidebar font size: write failed', error) })
    }

    /**
     * One size row: title, description, and a −/+ stepper.
     * @param props - label, value, range, translations and the write callback.
     * @returns the row element tree.
     */
    function SizeRow({ label, description, value, range, t, onChange }) {
      const button = (delta, glyph, text) => React.createElement('button', {
        type: 'button',
        className: 'dshsfs-button',
        'aria-label': text,
        title: text,
        disabled: value + delta < range.min || value + delta > range.max,
        onClick: () => { onChange(value + delta) },
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
     * @param props - translated copy from the slot and the injected form.
     * @returns the rows.
     */
    function SidebarFontSizeRows({ t, host }) {
      const subscribe = React.useCallback((listener) => host.subscribe(listener), [host])
      const getSnapshot = React.useCallback(() => host.getSnapshot(), [host])
      const snapshot = React.useSyncExternalStore(subscribe, getSnapshot)
      const value = snapshot.value ?? {}
      const fontSize = value[FONT_SIZE_FIELD] ?? FONT_SIZE_RANGE.defaultValue
      const smallFontSize = value[SMALL_FONT_SIZE_FIELD] ?? SMALL_FONT_SIZE_RANGE.defaultValue
      return React.createElement(React.Fragment, null,
        React.createElement('style', null, styles),
        React.createElement(SizeRow, {
          label: t('main.title'), description: t('main.description'),
          value: fontSize, range: FONT_SIZE_RANGE, t,
          onChange: (px) => { writeSize(host, FONT_SIZE_FIELD, px) },
        }),
        React.createElement(SizeRow, {
          label: t('small.title'), description: t('small.description'),
          value: smallFontSize, range: SMALL_FONT_SIZE_RANGE, t,
          onChange: (px) => { writeSize(host, SMALL_FONT_SIZE_FIELD, px) },
        }),
      )
    }

    return {
      inject: ['slots', 'locale', 'configForms'],
      apply(ctx) {
        const host = ctx.configForms.get(ENTRY_ID)
        ctx.effect(() => {
          applyLiveVariables(host)
          const unsubscribe = host.subscribe(() => { applyLiveVariables(host) })
          return () => {
            unsubscribe()
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
