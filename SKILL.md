---
name: chuanban-antigravity-theme-patch
description: 船板的 Antigravity 2.0 macOS 专属主题、字体与汉化补丁（v6.0.0 · 适配 macOS 版 Antigravity 2.34.0+ 单图标 M2 启动接力 + Browser 级 CDP 事件发现与 SingletonLock 零子进程空闲短路 + 全新默认「莫兰迪古典矿物 (morandi)」冷暖互补配色体系与烟岚石青单层 2px 合并输入框 + 外观面板五段式主题秒切 `[ A 原版配色 | ✳️ Absolutely！ | MO 莫兰迪色 | 📖 暖纸深色 | 🌙 深色 ]` + 外观 `[ EN | 中文 ]` 一键零重刷语言切换 + UI 西文 Google Sans Flex 可变字体引擎 × 中文更纱黑体映射 + 对话正文 Anthropic Serif 衬线 + 1,965 条零冲突词典 + 分屏/支线提问(/btw)/子Agent侧栏独立上下文圆环实时指标胶囊 + 系统设置「本地扩展 → Token 统计」磁盘持久化毫秒级分析面板）。采用「core/ 只读内核（运行时 SHA-256 强校验）+ user/ 永不覆盖改装层 + install.mjs CLI」，支持 Agent 一键部署、2.5 秒热重载定制与 --safe-mode 沙箱排障。当用户提到“安装船板 Antigravity 主题”、“升级/修复 Antigravity 汉化与字体”、“定制 Antigravity 界面样式或汉化词条”时触发。
---

# 船板的 Antigravity 主题、字体与汉化补丁（v6.0.0 · macOS 专属 · AI Agent 部署与改装契约）

> **核心摘要（致执行端 AI Agent）**：
> - **功能边界**：仅支持 **macOS（`darwin`）**，纯运行时本地回环 CDP 注入（不改 `.asar`、不破系统签名、零第三方 npm 依赖），适配 Google Antigravity **`2.34.0+`**（向下兼容 `2.33.x` / `2.32.x` / `2.31.x` / `2.30.0`）：
>   - **五段式主题与双语热切换**：默认启用 **`"morandi"`（莫兰迪古典矿物：暖宣纸底 `#F4F1EA` × 亚麻侧栏 `#E8E3D9` × 烟岚石青单层 `2px` 合并输入框与按钮）**；在「系统设置 → 外观界面」嵌入 **`[ A 原版配色 | ✳️ Absolutely！ | MO 莫兰迪色 | 📖 暖纸深色 | 🌙 深色 ]`** 五段式切换（`A` 原版配色通过 `#ag-font-faces` / `#ag-custom-fonts` / `#ag-ui-widgets` 三段样式拆分实现 `<1ms` 零开销回退官方配色与原版字体，`📖` 暖纸深色采用经典 Claude 暖炭 `#242320` / `#D97757` 配色）及独立 **`[ EN | 中文 ]`** 二元语言切换（`EN` 态观察器零开销休眠），自动以 `0600` 原子落盘至 `user/config.json` 并实时同步启动幕布与 `Swarm` 协作子帧；
>   - **四层排版与双层遥测**：UI 西文直连官方 `Google Sans Flex` 可变字体（`#ag-font-faces` 常驻隔离防切肤缺字）× 中文 `AgSarasaUI` 更纱黑体字重桥接；对话正文采用 `Anthropic Serif` + `Sarasa Mono Slab SC` 衬线与 macOS 浅色全域活字润墨；代码与 `2.34.0` 行内文件胶囊（`.inline-pill[data-uri]`）采用 `Anthropic Mono` 等宽；输入框采用打字机粗衬线配单层 `2px` 合并边框；内置 `1,965` 条零冲突汉化、多路分屏/`/btw`/子 Agent 侧栏独立上下文圆环实时指标胶囊（支持 `"metricsMode": "full"` 切回全量行内指标）与「系统设置 → 本地扩展 → Token 统计」增量 SQLite 多维分析面板。
> - **真注入肉眼验真三特征（防 `2.33.0+` 原生 `Google Sans Flex` 视觉假象）**：
>   1. 对话正文与 Markdown 为 `Anthropic Serif` 衬线体（`A` 原版配色除外）；
>   2. 主输入框为单层 `2px` 合并粗线（`MO` 下为烟岚石青 `#A3B5BA → #3D6470`，`Absolutely！` 下为暖橙火漆 `#DFAC98 → #A64229`）；
>   3. 输入框底栏挂载实时指标胶囊（`.ag-live-metrics-pill`），外观面板显示五段式主题与 `界面语言 [ EN | 中文 ]` 行。
> - **两条执行红线**：
>   1. **严禁从头手写或篡改 `core/` 内核**：全部样式、词典、DOM 引擎与守护进程已预封装在 `core/`（受 `core/manifest.json` SHA-256 强校验保护），直接通过 `node install.mjs` 部署；
>   2. **所有个性化定制仅在 `user/` 层修改**：`user/` 目录升级时永不覆盖，保存后守护进程在 `2.5s` 内自动检测 `mtimeMs` 热重载生效。

---

## 一、核心资源链接与示例基准

1. **Google Drive 资源包（含必备字体）**：<https://drive.google.com/drive/folders/1NX92SgVUqtSjWg6bt6sIJXy-cn7J_boC>
   - 必备 4 个字体文件：`AnthropicSerif-Regular.ttf`、`AnthropicSerif-Bold.ttf`、`AnthropicMono-Regular.ttf`、`Sarasa-SuperTTC.ttc`（`v5.5.0+` UI 西文直连官方 `Google Sans Flex`，**不再依赖 `AnthropicSans-*.ttf`**）。
   - *限流备选*：若 `Sarasa-SuperTTC.ttc`（~791 MB）触发 Google Drive 24h 下载限额，可直接运行 `brew install --cask font-sarasa-gothic`。
2. **GitHub 代码仓库**：<https://github.com/henrychou0312/chuanban-antigravity-theme>（基于上游 <https://github.com/Anarcadia/chuanban-antigravity-theme-patch> 精简为 macOS 专属并完成运行时安全加固，同步至 `v6.0.0`）
3. **Notion 引导页（上游参考）**：<https://chuanban.notion.site/chuanban-antigravity-theme-patch-db7c5846f37546be9481cd791aed0554>

### 实机样式基准参考
- **默认莫兰迪浅色主界面视图（暖宣纸画布 + 烟岚石青单线输入框 + 实时遥测悬停详情卡）**：[`assets/preview-morandi-workbench.png`](assets/preview-morandi-workbench.png)
- **外观五段式皮肤预设与 `[ EN | 中文 ]` 语言切换视图**：[`assets/preview-theme-lang-switcher.png`](assets/preview-theme-lang-switcher.png)
- **`Absolutely！` 主题主界面视图（书卷暖白高对比工作台 + 暖橙蜡封输入框 + 子 Agent 副栏汉化）**：[`assets/preview-absolutely-workbench.png`](assets/preview-absolutely-workbench.png)
- **黑夜界面视图（暖纸深色 / 深海冷碳 + 代码审阅 Diff 视图）**：[`assets/preview-dark-workbench.png`](assets/preview-dark-workbench.png)

---

## 二、Node.js 运行时分级要求

> **多版本环境提示**：若用户电脑装有 `nvm` / `fnm` / `volta` / Homebrew Node，请优先选用 **`Node.js >= 22.13.0`** 执行 `node install.mjs install`（安装器通过 `resolveStableNodeExecPath()` 自动将 Homebrew `Cellar` 版本路径与 `fnm` 别名还原为稳定持久软链写入 LaunchAgent，避免 `brew upgrade node && brew cleanup` 后守护失效）。

| 运行时版本 | 五段式主题 / 单线矿物框 / 四层字体 | 1,965 条汉化 + `[ EN \| 中文 ]` 零重刷切换 | 死锁/冷启动自愈 + BrowserWatcher + M2 接力 | SQLite 实时指标胶囊 & 「Token 统计」面板 (`node:sqlite`) |
| :--- | :---: | :---: | :---: | :---: |
| **Node.js `>= 22.13.0`**（推荐） | ✅ 全量启用 | ✅ 全量启用 | ✅ 全量启用 | ✅ **自动启用**（圆环遥测胶囊 + 磁盘索引多维归因） |
| **Node.js `22.0.0 ~ 22.12.x`** | ✅ 全量启用 | ✅ 全量启用 | ✅ 全量启用 | ⚠️ 自动优雅关闭（后台零报错） |
| **Node.js `< 22.0.0`** | ❌ `install.mjs` 拦截提示 | ❌ 需升级至 Node 22+ | — | — |

---

## 三、目录结构：`core/` 只读内核 + `user/` 无损改装层

运行态默认安装路径：`~/.gemini/antigravity/theme-patch/`：

```text
chuanban-antigravity-theme/
├── LICENSE                     # MIT 开源许可协议
├── install.mjs                 # macOS 生命周期 CLI（install / relaunch / install-fonts / doctor / verify / rollback / uninstall / build-manifest / pack）
├── SKILL.md                    # 面向 AI Agent 的部署与二次改装契约（本文件）
├── README.md                   # 面向用户的项目说明与快速上手指南
├── CHANGELOG.md                # 版本演进记录
├── core/                       # 【只读内核】随版本升级原子替换，Agent 严禁直接修改
│   ├── manifest.json           # 版本号（6.0.0）、平台声明（darwin）、资源地址与 core/* 四件套 SHA-256 校验清单
│   ├── daemon.mjs              # macOS Node CDP 守护进程（运行时 core/manifest.json SHA-256 强校验、宿主独占指纹门禁、Browser 级 CDP 事件发现与 83% 轮询降频、SingletonLock 零子进程空闲短路、2.33.0+~2.34.0+ M2 冷启动自动接力重启、五态预设与 EN/中文跨窗口/Swarm 广播及 0600 原子持久化、SQLite O(1) 增量双语圆环胶囊与异步分片 Token 统计归因及 .cache/ 持久化索引、Swarm 子帧 ~100KB 载荷裁剪注入、2.5s 热重载感知）
│   ├── runtime.js              # 浏览器端注入引擎（宿主指纹门禁与 0ms 防闪白、五段式外观主题与 `[ EN | 中文 ]` 二元语言零重刷切换、#ag-font-faces / #ag-custom-fonts / #ag-ui-widgets 三段拆分与 <1ms 原版旁路、Swarm 子帧原版底色清理还原、EN 态观察器零开销休眠、子 Agent / Swarm Worker 副栏翻译与 (12s) 耗时保护、指标胶囊 rAF 合批防重排、设置「本地扩展 → Token 统计」零噪观察器挂载）
│   ├── theme.css               # 五段式样式表（莫兰迪古典矿物默认视觉、烟岚石青/火漆单层 2px 合并输入框、零 :has() 侧栏实色底优化、`Absolutely！` 与双深色预设、圆环指标胶囊与 Token 统计面板）
│   └── i18n.json               # 1,965 条零冲突标准 JSON 基准词典（挂载至 Object.create(null)）
└── user/                       # 【用户改装层】升级 100% 保留，守护进程每 2.5s 检测 mtimeMs 热重载注入
    ├── config.json             # 开关配置（enabled / channel / preset / darkPreset / installedLocale / metricsMode / contextLimit / contextLimitOverride / modules / themeVars / darkThemeVars）
    ├── custom.css              # 自定义追加 CSS（独立挂载于 #antigravity-user-custom-style）
    └── i18n.override.json      # 自定义词条覆盖或新增（支持扁平键值对或 "exact": { ... }，优先级高于 core/i18n.json）
```

---

## 四、AI Agent 标准部署流程与关键边缘场景处理

### Step 1：环境与字体前置检查
```bash
node install.mjs doctor
```
重点检查输出中的 `fonts.allRequiredInstalled`（以及缺失列表 `fonts.missing`）与 `node.serviceExecPath`：
- **若 `fonts.allRequiredInstalled === false`**：
  - 若用户已将字体下载解压到本地（如 `~/Downloads`），可直接执行内置命令一键安装至 `~/Library/Fonts`：
    ```bash
    node install.mjs install-fonts --from "<字体所在目录>"
    ```
  - 若尚未下载：引导用户从 [Google Drive 资源包](https://drive.google.com/drive/folders/1NX92SgVUqtSjWg6bt6sIJXy-cn7J_boC) 获取（`Sarasa-SuperTTC.ttc` 亦可直接执行 `brew install --cask font-sarasa-gothic`）。
- **若老用户此前使用早期 `v1 ~ v4` 单文件版 `~/.gemini/antigravity/scripts/antigravity-font-daemon.mjs`**：先读取旧文件检查是否有用户手改过的字号或配色值，安装完成后将其迁入 `~/.gemini/antigravity/theme-patch/user/config.json` 或 `user/custom.css`。

### Step 2：安装内核与注册 LaunchAgent 常驻服务
```bash
# 默认安装（channel="auto"，默认 preset="morandi"，单守护进程同时自动兼容 Stable 正式版与 Insiders 预览版窗口）
node install.mjs install

# 可选：安装时直接指定初始浅色预设或黑夜预设
node install.mjs install --preset morandi --dark-preset claude-warm

# 可选：无常驻后台模式（不注册 LaunchAgent，且移除已有常驻服务；后续按需手动运行 daemon）
node install.mjs install --no-service

# （仅在需要重置 user/ 模板时使用）先备份旧 user/ 至 backups/<timestamp>-user/，再同步最新模板
node install.mjs install --sync-user
```
**关键行为与边缘判读（必读）**：
1. **单图标纯净模式（无多余 `.app` 图标）**：
   - 默认不创建第二个 `.app` 图标：`doctor` 返回 `antigravity.launcherMode: "single-icon-m2-relay"` 且 `antigravity.launcherInstalled: false`，`install` 返回 `launcherStatus.mode: "single-icon-m2-relay"` 且 `launcherStatus.launchers: []`，**均属于正常预期设计，切勿误判为安装失败**（仅显式传 `--with-launcher` 时才生成可选 `Antigravity (Theme).app` 启动器）。
2. **Antigravity `2.33.0+` / `2.34.0+` 调试端口接力与防 Agent 自断会话**：
   - Antigravity `2.33.0+` 默认不生成 `DevToolsActivePort`，需携带 `--remote-debugging-port=0` 启动。后台守护进程内置 **M2 冷启动接力**：当用户日常点击原版图标或客户端更新重启时，守护进程会在冷启动前 `12s`（更新重启 `25s`）内自动无感补参重拉，且**对运行已超时间窗的存量会话 100% 豁免绝不强杀**。
   - **若 `install` 返回顶层 `"cdpStatus": "missing_opt_in_flag"`（或 `doctor` 返回 `antigravity.cdpStatus: "missing_opt_in_flag"`）**：
     - **场景 A（当前 Agent 正运行在 Antigravity 内部对话中）**：**严禁加 `--force` 同步调用 `relaunch` 自杀中断当前回复！**（不带 `--force` 调用也会被 15 秒 `.db-wal` 活跃会话门禁以退出码 `2` 安全拦截）。请直接告知用户补丁与后台守护已部署就绪，等本轮对话结束后**手动退出重开一次 Antigravity**（`M2` 将自动接力），或在外部终端执行：
       `node ~/.gemini/antigravity/theme-patch/install.mjs relaunch`
     - **场景 B（当前 Agent 运行在外部独立终端，如 Claude Code / Codex / iTerm2 / Terminal.app，且 Antigravity 无正在输出的对话）**：可直接运行 `node install.mjs relaunch` 自动完成平滑重启与重注。

### Step 3：CDP 实机注入验收
```bash
node install.mjs verify
```
当顶层输出 `"ok": true`、`"themeStyle": true`，且 `live.state` 下 `"bodyReady": true`、`"hasStyle": true`、`"dictCount": 1965`（以及 `"preset"` / `"uiLang"` 符合预期）时，代表主题、字体、汉化、指标胶囊与「Token 统计」面板已全部实机生效。

---

## 五、个性化改装与故障排障规范

永远在 `~/.gemini/antigravity/theme-patch/user/` 下修改，**无需重启守护进程或客户端**（保存后 `2.5s` 自动热生效）。

### 1. 修改配色预设、字号变量或模块开关（`user/config.json`）
```json
{
  "enabled": true,
  "channel": "auto",
  "preset": "morandi",
  "darkPreset": "onyx",
  "installedLocale": "zh-CN",
  "contextLimit": 256000,
  "modules": {
    "i18n": true,
    "metrics": true,
    "tokenAnalytics": true,
    "composerWaxSeal": true,
    "deadlockHealer": true,
    "coldBootHealer": true,
    "zoomShortcuts": true,
    "cdpAutoRelaunch": true,
    "customCss": true
  },
  "themeVars": {
    "--ag-chat-font-size": "16px",
    "--ag-wax-seal-hover": "#74221A",
    "--ag-dark-wax-seal-hover": "rgba(47, 113, 227, 0.72)"
  }
}
```
- **`preset`（浅色与原版预设）**：`"morandi"`（默认莫兰迪古典矿物）、`"absolutely"`（致敬 Claude 书卷暖白）、`"native"`（官方原版配色与原版字体）、`"claude-desktop-purewhite"`（莫兰迪素绢浅雾）、`"vintage-deep"`（莫兰迪敦煌古壁）；旧版 `"high-contrast"` 升级时自动平滑映射至 `"morandi"`。
- **`darkPreset`（黑夜配色预设）**：默认 `"onyx"`（深海冷碳黑）；设为 `"claude-warm"`（或在客户端「系统设置 → 外观界面」点击 **📖 书卷按钮**）启用暖纸深色并自动持久化。
- **`modules.i18n` / `installedLocale`**：默认启用中文汉化（也可直接在外观界面点击 **`[ EN | 中文 ]`** 一键零重刷切换并自动落盘）；若将 `"installedLocale"` 设为 `"none"` 则完全不加载汉化词典。
- **`metricsMode`（可选）**：默认 `"compact"`（极简上下文圆环 + 4 行精简中英双语悬停卡）；如需旧版完整行内指标展示，可显式配置 `"metricsMode": "full"`。
- **`contextLimit` / `contextLimitOverride`**：默认从会话元数据动态识别真实模型上下文窗口（`256k` / `512k` / `840k` / `1M+`），缺失时回退 `contextLimit`；如需全局强制锁定固定上限，可设正整数 `"contextLimitOverride": 1000000`。
- **`modules`**：支持独立开关各模块（如设 `"tokenAnalytics": false` 关闭设置弹窗「Token 统计」Tab 并动态剥离 ~100 KB CSS/JS 注入载荷；设 `"googleFonts": false` 关闭保底外链字体；设 `"cdpEventDiscovery": false` 关闭 Browser 级事件发现；设 `"cdpAutoRelaunch": false` 关闭冷启动自动补参重拉；或将顶层 `"enabled": false` 保存以在 `2.5s` 内无损卸载全部样式并还原英文界面）。
- **`themeVars` / `darkThemeVars`**：自动注入 `<style id="ag-user-theme-vars">`；普通色彩变量（如 `--sidebar`）仅作用于白天模式，如需微调黑夜模式核心色彩变量请写入可选对象 `"darkThemeVars": { "--background": "#1B1A18" }`。

### 2. 追加自定义 CSS（`user/custom.css`）
编写标准原生 CSS（零反斜杠转义），保存后 `2.5s` 自动挂载于最高优先级的 `<style id="antigravity-user-custom-style">`；仅针对单模式微调时请加 `body:not(.dark)` 或 `body.dark` 前缀。

### 3. 覆盖或新增汉化词条（`user/i18n.override.json`）
写入扁平键值对 `"英文原词": "自定义中文"`（或包裹在 `"exact": { ... }` 中）。得益于 `WeakMap` 原文追踪，新增、修改或删除词条后 `2.5s` 内页面已渲染文字均实时更新或还原。

### 4. 故障定界、回滚与卸载
```bash
# 安全模式：绕过 user/ 层仅注入纯净 core/ 内核，快速定界是否为自定义配置冲突
node install.mjs verify --safe-mode

# 检查环境、字体完整性、稳定 Node 路径、进程参数、core/* SHA-256 与窗口实时状态
node install.mjs doctor

# 一键回滚至上一次自动备份的快照版本并立即重注
node install.mjs rollback

# 卸载：停止 LaunchAgent 服务与后台守护进程、清理 .cache/ 索引，并将当前已打开窗口即时还原为官方原貌（保留 user/ 配置）
node install.mjs uninstall
```

---

## 六、安全加固约束

1. **零任意代码注入**：已移除 `user/custom.js` 动态前端 JS 执行（`new Function`）与外部 `antigravity-zh-title-patch.py` Python 脚本自动调用；`user/` 层仅支持声明式配置（`config.json`）、纯 CSS（`custom.css`）与词典覆盖（`i18n.override.json`）。
2. **运行时 SHA-256 强校验（Fail-Closed）**：`core/daemon.mjs` 在启动（含 `--keep-alive` 接管路径）及每次内核热重载前逐字节核验 `core/manifest.json` 中 4 个核心文件的 SHA-256 与文件大小；若发现缺失或篡改，启动阶段立即以非零退出，运行期间拒绝继续注入。
3. **属主独占权限与私有日志/缓存**：安装目录 `~/.gemini/antigravity/theme-patch/`、LaunchAgent `.plist`、包装脚本、`.cache/` Token 统计索引、PID/冷却锁、原子写入配置文件及日志统一收紧为 `0700` / `0600`（LaunchAgent 日志存放在 `~/.gemini/antigravity/theme-patch/logs/`，不再写入公共 `/tmp`）。
4. **可选无常驻模式**：如不需要后台 LaunchAgent，可使用 `node install.mjs install --no-service` 部署后按需手动执行 `daemon.mjs` 或 `daemon.mjs --once`。
