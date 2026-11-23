# 船板的 Antigravity 主题、字体与汉化补丁 (v5.5.5)

[![Version](https://img.shields.io/badge/version-5.5.5-7A1F1A.svg)](https://github.com/henrychou0312/chuanban-antigravity-theme)
[![Antigravity](https://img.shields.io/badge/Antigravity-2.34.0%2B-D97757.svg)](https://github.com/henrychou0312/chuanban-antigravity-theme)
[![Node](https://img.shields.io/badge/node-%3E%3D22.0.0%20(22.13%2B%20Full)-339933.svg)](https://nodejs.org/)
[![Platform](https://img.shields.io/badge/platform-macOS-lightgrey.svg)](https://github.com/henrychou0312/chuanban-antigravity-theme)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

面向 macOS 版 Google Antigravity（支持最新 **`2.34.0+`**）的非侵入式运行时补丁：提供书卷暖纸与双深色预设、四层中西文排版、1,942 条界面汉化、SQLite 实时会话遥测胶囊与系统设置「Token 统计」多维分析面板。不修改客户端 `.asar` 与系统签名，零第三方 npm 依赖，由 AI Agent 一键部署并通过 `user/` 层实现 `2.5s` 热重载定制。

> 供 AI Agent 读取的完整部署与改装技术契约位于仓库根目录 **[`SKILL.md`](https://github.com/henrychou0312/chuanban-antigravity-theme/blob/main/SKILL.md)**。

---

## 🔗 资源入口

| 入口 | 地址 | 说明 |
| :--- | :--- | :--- |
| **1. Google Drive 资源包（含字体）** | [**Google Drive 共享文件夹**](https://drive.google.com/drive/folders/1NX92SgVUqtSjWg6bt6sIJXy-cn7J_boC) | 含成品包与 4 个必备字体文件：`AnthropicSerif-Regular/Bold.ttf`、`AnthropicMono-Regular.ttf`、`Sarasa-SuperTTC.ttc`（`v5.5.0+` UI 西文已直连官方 `Google Sans Flex`，无需 `AnthropicSans`）。若 `Sarasa-SuperTTC.ttc` 遇网盘 24h 下载限流，可直接使用 `brew install --cask font-sarasa-gothic` 安装。 |
| **2. GitHub 代码仓库** | [**henrychou0312/chuanban-antigravity-theme**](https://github.com/henrychou0312/chuanban-antigravity-theme) | macOS 专属安全精简版源码，包含预封装内核 `core/`、个人改装层 `user/`、生命周期 CLI `install.mjs` 与 [`SKILL.md`](https://github.com/henrychou0312/chuanban-antigravity-theme/blob/main/SKILL.md)（同步上游 [Anarcadia/chuanban-antigravity-theme-patch](https://github.com/Anarcadia/chuanban-antigravity-theme-patch) `v5.5.5` macOS 适用更新并保留精简与安全加固；字体请从上方 Google Drive 获取）。 |
| **3. Notion 引导页（上游参考）** | [**chuanban-antigravity-theme-patch**](https://chuanban.notion.site/chuanban-antigravity-theme-patch-db7c5846f37546be9481cd791aed0554) | 上游原作者图文说明与安装引导镜像页（实际部署请以本仓库 `README.md` 与 `SKILL.md` 为准）。 |

---

## 🖼️ 实机效果

### 1. 标准浅色主界面：高对比书卷暖白工作台 + 衬线正文与活字润墨 + 暗红蜡封输入框
> 左侧 `#F7F5F0` 暖燕麦侧栏（`Google Sans Flex` × 更纱黑体 UI 字重桥接）+ `#FCFCFB` 微暖亮白对话区与 Markdown 预览（`Anthropic Serif` × `Sarasa Mono Slab SC` 衬线）+ 底部 `1.5px` 暗红蜡封输入框与同行实时指标胶囊。

![标准浅色书卷暖白主界面视图](assets/preview-light-workbench.png)

### 2. 黑夜界面效果：Claude 暖纸深夜模式（`claude-warm`）+ 代码审阅 Diff 视图
> `#242320` 暖炭底色 + `#1B1A18` 深炭侧栏 + `#F3F0E4` 象牙白正文 + `#D97757` 陶土暖橙点缀；在「系统设置 → 外观界面」点击 **📖 / 🌙** 按钮即可在「暖纸深夜」与「官方冷碳黑（`onyx`）」之间 `0ms` 切换并自动持久化。

![黑夜界面 Claude 暖纸深夜与代码审阅视图](assets/preview-dark-workbench.png)

### 3. 上下文对话信息胶囊与悬停遥测详情卡
> 嵌入输入框底栏的实时指标胶囊（支持多路平铺分屏、`/btw` 支线提问与子 Agent 侧栏独立计量）；悬停展开本轮流式/端到端 `tok/s`、`TTFT`、思考链与正文输出拆分，以及当前会话累计压缩水位线与缓存命中率。

![上下文对话实时信息胶囊与悬停遥测详情卡](assets/preview-metrics-capsule.png)

---

## ✨ 核心特性（v5.5.5 · macOS 专属）

- **昼夜双模式与四套配色预设**：浅色内置高对比暖白（默认）、ClaudeDesktop 净白、复古羊皮纸三套暖纸预设及 macOS 浅色全域活字润墨；深色在客户端外观面板原生嵌入 **📖 书卷按钮**（`[ 🖥️ | ☀️ | 📖 | 🌙 ]`），一键切换官方碳黑（`onyx`）或 Claude 暖纸深夜（`claude-warm`），自动同步启动幕布与 `Swarm` 协作子帧。
- **四层中西文排版与 `2.34.0` 漂移对齐**：UI 西文直连官方 `Google Sans Flex` 可变字体引擎（`wght 350–650`, `wdth 92`，内置 `#ag-google-sans-flex-fonts` 防脱靶保底与宿主就绪自动去重），中文经 `AgSarasaUI` 精确映射更纱黑体字重；对话正文与 Markdown 保持 `Anthropic Serif` + `Sarasa Mono Slab SC` 衬线；代码、终端与 `2.34.0` 行内文件胶囊（`.inline-pill[data-uri]`）采用 `Anthropic Mono` 等宽；主输入框采用打字机板状粗衬线配三态蜡封边框。
- **1,942 条界面汉化与代码区严格隔离**：覆盖主界面、15+ 设置子页、`2.34.0` 编排器模型选择与无括号努力度档位、快捷键方案、内置浏览器管理、`Swarm` 蜂群面板与省略号 `…`/`...` 双向回退匹配；`Quote`/`Comment` 受交互控件上下文门禁保护，基于 `WeakMap` 追踪英文原词支持热还原，严格隔离代码块、行内文件胶囊、Monaco 编辑器、终端及英文历史对话标题。
- **SQLite 实时指标胶囊与「Token 统计」多维分析面板**：基于 Node.js `>= 22.13` 原生 `node:sqlite` 只读引擎，不仅在输入框底栏独立展示分屏/`/btw`/子 Agent 实时指标与 `+N sub` 消耗汇总，更在「系统设置 → 本地扩展 → Token 统计」提供 4 口径 KPI、26 周贡献热力图、近 14 日堆叠趋势、模型/工作场景/Orchestrator 规划态联动归因与低缓存预警；内置 `.cache/token-analytics-index.json` 私有磁盘持久化索引（毫秒级重开，按住 `Shift` 点击「刷新」全量硬重算），Swarm 子帧及关闭 `modules.tokenAnalytics` 时自动剥离 ~100 KB 载荷。
- **Browser 级 CDP 事件发现、零子进程空闲短路与 Homebrew 稳定路径**：订阅 `Target.setDiscoverTargets` 实现新建/唤醒窗口与 Swarm 子帧毫秒级注入，在线态跳过 5/6 拍 `/json/list` 轮询；空闲时基于 `SingletonLock` 软链 PID 预检实现 0 次 `ps` 派生；`install.mjs` 自动将 Homebrew / `fnm` Node 还原为稳定软链写入 LaunchAgent，避免 `brew upgrade node && brew cleanup` 后守护失效；保持单图标纯净模式 + `M2` 冷启动无感接力与 `2.5s` 热重载。
- **运行时完整性与最小权限加固**：守护进程在启动及每次内核热重载前强制校验 `core/manifest.json` 的四件套 SHA-256 与字节长度（篡改即拒载）；移除 `user/custom.js` 动态 JS 执行（`new Function`）与外部 Python 脚本自动拉起；安装目录、配置、plist、`.cache/` 持久化索引与私有日志统一收紧为属主独占权限（`0700` / `0600`），并支持 `node install.mjs install --no-service` 无常驻后台安装模式。

---

## 🚀 安装、升级与日常定制

### 一、新用户首次安装
1. **环境准备**：仅支持 **macOS**，需安装 **Node.js `>= 22.0.0`**（推荐 **`>= 22.13.0`** 以启用实时指标胶囊与「Token 统计」面板），并从 [**Google Drive 资源包**](https://drive.google.com/drive/folders/1NX92SgVUqtSjWg6bt6sIJXy-cn7J_boC) 下载上述 4 个字体文件（可先放在下载目录，再按下方任一方式安装）。

#### 方式 A：AI Agent 一键安装（推荐）
将以下引导词发给你的 AI Agent（Antigravity / Claude Code / Codex / Cursor 等）：

> **💬 复制发给 Agent（新用户一键安装）**：  
> 请帮我克隆 `https://github.com/henrychou0312/chuanban-antigravity-theme.git`（或读取我已下载解压的补丁目录），先完整阅读仓库内的 `SKILL.md`，再按以下顺序部署并处理边缘情况：  
> 1. 若本机有 `nvm` / `fnm` / `volta`，优先切换至 `Node >= 22.13.0` 执行命令；运行 `node install.mjs doctor` 检查 `fonts.allRequiredInstalled`。  
> 2. 若缺少字体（需 `Anthropic Serif`、`Anthropic Mono`、`Sarasa-SuperTTC.ttc`）：先在我刚下载的目录中查找并用 `node install.mjs install-fonts --from <字体目录>` 一键安装至 `~/Library/Fonts`（若缺 `Sarasa-SuperTTC.ttc` 且遇网盘限流，可直接执行 `brew install --cask font-sarasa-gothic`）。  
> 3. 运行 `node install.mjs install` 完成安装（注：默认单图标模式下 `doctor` 输出 `antigravity.launcherInstalled: false`、`install` 输出 `launcherStatus.mode: "single-icon-m2-relay"` 均属正常设计；若不希望注册 LaunchAgent 后台常驻服务，可改用 `node install.mjs install --no-service`）。  
> 4. 检查输出中的 `cdpStatus`：若为 `"missing_opt_in_flag"`（Antigravity `2.33.0+` 尚未挂调试端口），**如果你当前正在 Antigravity 内部对话中运行，请勿执行 `--force` 强行重启自断会话**，只需把空闲时执行的命令 `node ~/.gemini/antigravity/theme-patch/install.mjs relaunch`（或提示我直接手动退出重开一次 Antigravity）发给我；如果你在外部独立终端运行且客户端空闲，请直接执行 `node install.mjs relaunch`。  
> 5. 在端口就绪后运行 `node install.mjs verify`，确认 `"ok": true`、`"themeStyle": true`（`live.state.hasStyle: true`、`dictCount: 1942`）即完成验收。

#### 方式 B：手动终端安装（macOS）
在 macOS 终端（Terminal / iTerm2）中按顺序执行：

```bash
# 1. 克隆本仓库并进入目录
git clone https://github.com/henrychou0312/chuanban-antigravity-theme.git
cd chuanban-antigravity-theme

# 2. 检查 Node 版本（需 >= 22.0.0，推荐 >= 22.13.0）与当前环境/字体状态
node -v
node install.mjs doctor

# 3. 安装缺失字体至 ~/Library/Fonts（将路径替换为字体下载目录）
node install.mjs install-fonts --from ~/Downloads/<字体目录>
# 若仅缺 Sarasa-SuperTTC.ttc 且遇网盘限流，可直接通过 Homebrew 安装：
# brew install --cask font-sarasa-gothic

# 4. 安装内核与 LaunchAgent 常驻服务（不覆盖已有 user/ 配置）
node install.mjs install
# 如不希望注册后台常驻服务，可改用无常驻模式（后续按需手动运行 daemon.mjs）：
# node install.mjs install --no-service

# 5. 若上一步输出 cdpStatus 为 "missing_opt_in_flag"，在 Antigravity 空闲时补挂调试端口重启
#    （或直接手动完全退出并重开一次 Antigravity，后台守护会自动接力）
node ~/.gemini/antigravity/theme-patch/install.mjs relaunch

# 6. 实机注入验收（确认 "ok": true、"themeStyle": true 及 live.state.hasStyle: true）
node ~/.gemini/antigravity/theme-patch/install.mjs verify
```

> 如需临时卸载并即时还原原版界面，运行 `node ~/.gemini/antigravity/theme-patch/install.mjs uninstall`（保留 `~/.gemini/antigravity/theme-patch/user/` 配置并清理 `.cache/`）；如需退回上一版本内核，运行 `node ~/.gemini/antigravity/theme-patch/install.mjs rollback`。

### 二、老用户升级至当前版本
`node install.mjs install` 会自动备份旧版 `core/` 内核、更新 LaunchAgent 常驻服务（并将 Homebrew/fnm Node 自动刷新为稳定软链路径），并完整保留 `~/.gemini/antigravity/theme-patch/user/` 中的个人配置：

> **💬 复制发给 Agent（老用户无缝升级）**：  
> 请帮我拉取最新的 `https://github.com/henrychou0312/chuanban-antigravity-theme.git`（或读取最新解压目录），阅读其中的 `SKILL.md` 后直接运行 `node install.mjs install` 升级至 `v5.5.5` macOS 安全精简版（若我此前使用的是更早期的单文件版 `antigravity-font-daemon.mjs` 且有自定义字号/配色，请先帮我把自定义项迁移到 `~/.gemini/antigravity/theme-patch/user/`）。若安装后 `cdpStatus` 为 `"missing_opt_in_flag"` 且你正在 Antigravity 内部会话中运行，请勿直接中断当前对话，告诉我空闲时运行 `node ~/.gemini/antigravity/theme-patch/install.mjs relaunch`（或手动重开一次客户端）即可；端口已就绪则直接运行 `node install.mjs verify` 确认 `"ok": true`、`"themeStyle": true` 与 `"dictCount": 1942` 完成验收。

### 三、后续个性化调整与排障话术
- **🎨 切换昼夜预设、调整字号或微调样式**：
  > 请按 `~/.gemini/antigravity/theme-patch/SKILL.md` 规范，仅修改 `user/` 目录下的配置文件：把白天预设改为 `"claude-desktop-purewhite"`（或 `"vintage-deep"`） / 把黑夜预设 `"darkPreset"` 改为 `"claude-warm"` / 把对话正文字号 `"--ag-chat-font-size"` 调为 `"16.5px"` / 如需关闭「Token 统计」面板可设 `modules.tokenAnalytics: false`。
- **🇨🇳 自定义修改或补充汉化词条**：
  > 请在 `~/.gemini/antigravity/theme-patch/user/i18n.override.json` 中新增或覆盖词条 `"英文原词": "自定义中文"`，确认 2.5 秒内页面实时热更新生效。
- **🔍 故障定界与一键回滚**：
  > 请按 `~/.gemini/antigravity/theme-patch/SKILL.md` 依次运行 `node install.mjs doctor` 和 `node install.mjs verify --safe-mode` 排查是否为 `user/` 自定义层冲突；如需退回上一版本请运行 `node install.mjs rollback`。
  - *注：若客户端冷启动后偶发未显示 `Remote`（远程）入口，属官方 `language_server` 冷启动兜底包竞态（补丁已内置空输入态自动自愈；若启动瞬间正在输入触发了草稿保护，按 `Cmd + Shift + R` 刷新一次即可恢复）。*

---

## 🕒 版本演进（完整记录见 [`CHANGELOG.md`](CHANGELOG.md)）

- **v5.5.5（2026-11-22 · macOS 安全精简版同步上游 `v5.5.1 ~ v5.5.5`）**
  - 完整同步上游 `v5.5.1 ~ v5.5.5` 全部 macOS 适用更新（忽略 Windows 专属路径），保留 macOS-only 精简与运行时安全加固：新增系统设置「本地扩展 → Token 统计」增量 SQLite 归因面板与 `.cache/` 私有（`0700`/`0600`）持久化索引；适配 Antigravity `2.34.0`（`.inline-pill[data-uri]` 等宽对齐与防误译、`Quote`/`Comment` 门禁、无括号模型档位、省略号双向匹配、内置浏览器三层打孔、词典扩充至 `1,942` 条）；新增 Browser 级 CDP 事件发现（`Target.setDiscoverTargets`）与冷启动重载防误拉黑、`SingletonLock` 零子进程空闲预检、`resolveStableNodeExecPath()` 稳定 Homebrew/fnm Node 软链、渲染器热路径减负、`uncaughtExceptionMonitor` 异常落盘及 MIT `LICENSE`。
- **v5.5.0（2026-11-19 · macOS 安全精简版）**
  - 适配 macOS 版 **Antigravity `2.33.0`**，并精简加固为 macOS 专属安全版本：落地单图标纯净模式 + `M2` 零侵入 CDP 启动接力（默认单图标零冗余、可选 `--with-launcher`、`--no-service` 无常驻安装、`relaunch` 子命令、冷启动 `<=12s` / 更新重启 `<=25s` 自动补参接力及活跃会话 100% 保护）；移除 `user/custom.js` 动态代码注入与外部 `antigravity-zh-title-patch.py` 自动执行，新增守护进程运行时 `core/manifest.json` SHA-256 强校验与 `0700`/`0600` 权限收敛；UI 西文切换至官方 `Google Sans Flex` 可变字体引擎（含 `#ag-google-sans-flex-fonts` 防脱靶保底）× `AgSarasaUI` 更纱黑体字重桥接，保留正文 `Anthropic Serif`；补齐无 `data-newux-theme` 选择器并将词典扩充至 `1,860` 条。
- **v5.4.3（2026-11-18）**
  - 适配 Antigravity `2.32.2` 与 `Gemini 4 Carbon` 模型矩阵（词典 `1,790` 条）；新增多路平铺分屏、`/btw` 支线提问与子 Agent 侧栏标签页独立实时指标胶囊及窄分屏动态折行（合入 [@CaramelizedCUDA](https://github.com/CaramelizedCUDA) [#17](https://github.com/Anarcadia/chuanban-antigravity-theme-patch/pull/17) 修复 [#16](https://github.com/Anarcadia/chuanban-antigravity-theme-patch/issues/16)）；加固 Swarm 子帧 `darkPreset` `<1ms` 瞬时同步、修复 `coldBootHealer` 二次复检自锁、隔离英文历史对话标题，并升级 macOS 中文标题外挂悬浮告警卡「一键复制修复命令」与守护日志自截断保护。
- **v5.4.2（2026-11-17）**：打通主窗口至 `plugin://swarm--` 子帧的实时深浅色中继与零闪白预置，消除双向切换下的子帧主题失步（[#15](https://github.com/Anarcadia/chuanban-antigravity-theme-patch/pull/15)）。
- **v5.4.1（2026-11-17）**：在「系统设置 → 外观界面 → 主题模式」胶囊中嵌入原生 **📖 书卷按钮**，支持 `0ms` 一键切换「Claude 暖纸深夜」并自动落盘记忆。
- **v5.4.0（2026-11-16）**：新增 `claude-warm` 暖纸深夜预设（[#13](https://github.com/Anarcadia/chuanban-antigravity-theme-patch/issues/13)）、内置浏览器本地预览页豁免门禁（[#12](https://github.com/Anarcadia/chuanban-antigravity-theme-patch/pull/12)）、Windows WSL2 SQLite 双轨只读读取（[#10](https://github.com/Anarcadia/chuanban-antigravity-theme-patch/issues/10)）与中完整性计划任务自启锁（[#8](https://github.com/Anarcadia/chuanban-antigravity-theme-patch/issues/8)）。
- **v5.3.0（2026-11-15）**：支持子 Agent 全树消耗汇总 `+N sub`（[#7](https://github.com/Anarcadia/chuanban-antigravity-theme-patch/pull/7)）、动态识别模型真实上下文窗口上限（[#6](https://github.com/Anarcadia/chuanban-antigravity-theme-patch/pull/6)），并完成 `2.32.1` 双平台适配（`1,740` 条词典）。
- **v5.2.0（2026-11-14）**：适配 Antigravity `2.32.0`，完成全词库系统性去机翻重构与 6 项核心术语统一（`1,630` 条）。
- **v5.1.8（2026-11-14）**：新增冷启动内嵌兜底包零流量安全自愈机制，解决偶发丢失 `Remote` 远程入口问题。
- **v5.1.6（2026-11-13）**：适配 Antigravity `2.31.2`，打通 `Swarm` 子帧注入、原生幕布底色同步与防双倍缩放。
- **v5.1.3（2026-11-11）**：适配 Antigravity `2.31.0`，将 SQLite 指标读取与 DOM 汉化升级为 `O(1)` 增量引擎。
- **v5.1.0（2026-11-10）**：确立浅色暖纸预设与深色官方碳黑物理隔离的昼夜双模式架构。
- **v5.0.0（2026-11-04）**：确立「`core/` 只读内核 + `user/` `2.5s` 热重载改装层 + `install.mjs` 一键 CLI」模块化架构。
