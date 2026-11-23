# 界面文字字号（`@local/dsh-sidebar-fontsize`）

给 DeepSeek Harness 加两档可调的界面文字字号，在 **设置 → 通用** 里用 −/+ 调整，实时生效并持久化到设置文档。

| 档位 | 字段 | 范围 | 默认 | 覆盖 |
| --- | --- | --- | --- | --- |
| 标题字号 | `fontSize` | 10–24 | 15 | 左侧栏会话/分组标题与导航、顶部会话标题与视图页签、右侧栏页签与 guide 入口卡片、右侧栏面板整套字号标尺 |
| 次要文字字号 | `smallFontSize` | 9–22 | 12 | 时间戳、meta 标签、面包屑分隔符、会话标题旁的「标准模式」标签、卡片说明 |

## 实现

- **Host 半侧**（`index.js`）把样式注入页面 `<head>`：`webserver/index-inject` 每次渲染时生成一张 `[data-sidebar-scrollport]`、`[data-conversation-tabs]`、`[data-sidebar-right-panel]` 等宿主钩子的作用域规则表。
- 两个字段都用 schemastery `.volatile()` 声明，并通过 `settings.configure({ auto: false })` 注册为 `sidebar-fontsize` 设置项。
- **浏览器半侧**（`client.js`）在设置页注册两行（`settings.general.item`），写值走 `ctx.configForms.get('sidebar-fontsize')`，同时把 `--dsh-sidebar-fontsize` / `--dsh-sidebar-fontsize-small` 直接写到 `documentElement`，让类规则立即重排。
- 右侧栏里第三方面板（文件树 / Git / 任务板 / 浏览器）用 DSH 的 `--dsw-font-*` 字号标尺绘制，插件在 `[data-sidebar-right-panel]` 内按比例重映射整套标尺（以 14px 为基准），不需要改那些插件。

## 安装

- 本机（开发目录）：`插件 → 添加插件 → 本地目录`，选择本目录；或在 profile 里 `link:`。
- 其他机器：用 `dist/` 里的 tarball，或发布到 npm 后按包名安装，见仓库根的 `PUBLISHING.md`。

## 配置默认值

```yaml
- id: sidebar-fontsize
  name: '@local/dsh-sidebar-fontsize'
  config:
    fontSize: 15
    smallFontSize: 12
```

用户在设置页做的选择会覆盖这里（作为 base 层保留）。

## 限制

- 文本单元按 CSS module 类名后缀匹配（`_title`、`_meta`、`_crumb`、`_tab`、`_cardTitle` …）；DSH 或面板插件升级改名后，对应规则会静默失效，需要更新本插件。
- 右侧栏面板的字号标尺在每次页面渲染时生成，改设置后刷新页面才反映到那些面板；其余区域即时生效。
- `vendor/` 内是随当前 DSH 安装复制的 `schemastery`（3.19.0）与 `cosmokit`（1.9.0），并把 schemastery 对 cosmokit 的裸导入改成了相对路径。link 到工作区的插件解析不到安装目录里的包，而设置服务要求真实的 schemastery schema，所以内置这两份。目标机器 DSH 大版本不同导致 schema 报错时，重新从该安装复制一份即可。
- 只改字号，不改行高之外的行距/图标/间距；终端字号仍由主题的「终端字号」设置决定。

## 兼容性

随 DSH 0.2.2-rc.5 开发与验证（Web / Desktop）。设置接口、`settings.general.item` 槽位与 `--dsw-font-*` 标尺来自该版本的公开包。

MIT License。
