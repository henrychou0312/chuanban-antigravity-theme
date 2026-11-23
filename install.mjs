#!/usr/bin/env node
/**
 * chuanban-antigravity-theme-patch · macOS 专属一键安装、自检、CDP 接力重启、安全模式验证、打包与回滚 CLI (install.mjs)
 *
 * 支持子命令：
 *   node install.mjs install  [--channel auto|stable|insiders] [--preset high-contrast|claude-desktop-purewhite|vintage-deep] [--dark-preset onyx|claude-warm] [--sync-user] [--with-launcher] [--no-service] [--target-dir <dir>]
 *   node install.mjs relaunch [--channel auto|stable|insiders] [--force] [--target-dir <dir>]
 *   node install.mjs install-fonts --from <font-folder-path>
 *   node install.mjs doctor   [--channel auto|stable|insiders] [--target-dir <dir>]
 *   node install.mjs verify   [--safe-mode] [--channel auto|stable|insiders] [--target-dir <dir>]
 *   node install.mjs rollback [--target-dir <dir>]
 *   node install.mjs uninstall [--target-dir <dir>]
 *   node install.mjs build-manifest
 *   node install.mjs pack
 */

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
import crypto from 'node:crypto';
import { execSync, spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 屏蔽 Node 22.x 动态探测 node:sqlite 时的 ExperimentalWarning 噪声，保持 doctor/verify JSON 输出纯净
const _origEmitWarning = process.emitWarning;
process.emitWarning = function (warning, ...rest) {
  const type = typeof rest[0] === 'string' ? rest[0] : rest[0] && rest[0].type;
  if (type === 'ExperimentalWarning' || (warning && warning.name === 'ExperimentalWarning')) return;
  return _origEmitWarning.call(this, warning, ...rest);
};

const GOOGLE_DRIVE_URL = 'https://drive.google.com/drive/folders/1NX92SgVUqtSjWg6bt6sIJXy-cn7J_boC';
const NOTION_GUIDE_URL = 'https://chuanban.notion.site/chuanban-antigravity-theme-patch-db7c5846f37546be9481cd791aed0554';
const GITHUB_REPO_URL = 'https://github.com/henrychou0312/chuanban-antigravity-theme';
const UPSTREAM_REPO_URL = 'https://github.com/Anarcadia/chuanban-antigravity-theme-patch';

const ALLOWED_ORIGINS = [
  'http://127.0.0.1',
  'https://127.0.0.1',
  'http://localhost',
  'https://localhost',
  'vscode-file://'
];

const args = process.argv.slice(2);
const subcommand = args.find((a) => !a.startsWith('-')) || 'help';
const hasFlag = (f) => args.some((a) => a === f || a.startsWith(f + '='));
function getArg(flag, fallback = null) {
  for (let i = 0; i < args.length; i++) {
    if (args[i] === flag && i + 1 < args.length) return args[i + 1];
    if (args[i].startsWith(flag + '=')) return args[i].slice(flag.length + 1);
  }
  return fallback;
}

function sha256File(filePath) {
  const buf = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(buf).digest('hex');
}

function canonicalPath(p) {
  const resolved = path.resolve(p);
  try {
    return fs.realpathSync.native ? fs.realpathSync.native(resolved) : fs.realpathSync(resolved);
  } catch {
    const parent = path.dirname(resolved);
    if (parent && parent !== resolved) {
      try {
        const realParent = fs.realpathSync.native ? fs.realpathSync.native(parent) : fs.realpathSync(parent);
        return path.join(realParent, path.basename(resolved));
      } catch {}
    }
    return resolved;
  }
}

function isSameTargetPath(a, b) {
  return canonicalPath(a).toLowerCase() === canonicalPath(b).toLowerCase();
}

function resolveGlobalInstallDir() {
  return path.join(os.homedir(), '.gemini', 'antigravity', 'theme-patch');
}

function resolveDefaultTargetDir() {
  const installed = resolveGlobalInstallDir();
  if (fs.existsSync(path.join(installed, 'core', 'daemon.mjs'))) {
    return installed;
  }
  return __dirname;
}

// ============================================================================
// 1. 生成与校验 core/manifest.json 及 dist/ 发行包
// ============================================================================
function buildManifest(baseDir = __dirname) {
  const coreDir = path.join(baseDir, 'core');
  const files = ['daemon.mjs', 'runtime.js', 'theme.css', 'i18n.json'];
  const entries = {};
  for (const name of files) {
    const p = path.join(coreDir, name);
    if (!fs.existsSync(p)) {
      throw new Error(`Missing core file: ${p}`);
    }
    const stat = fs.statSync(p);
    entries[name] = {
      sha256: sha256File(p),
      bytes: stat.size
    };
  }
  const manifest = {
    name: 'chuanban-antigravity-theme-patch',
    version: '5.5.5',
    platform: 'darwin',
    minNodeVersion: '22.0.0',
    fullMetricsNodeVersion: '22.13.0',
    distribution: {
      notionGuide: NOTION_GUIDE_URL,
      googleDriveFullBundle: GOOGLE_DRIVE_URL,
      githubRepo: GITHUB_REPO_URL,
      upstreamRepo: UPSTREAM_REPO_URL
    },
    files: entries
  };
  const manifestPath = path.join(coreDir, 'manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n', 'utf8');
  return manifest;
}

function buildDistZip(baseDir = __dirname) {
  const manifest = buildManifest(baseDir);
  const distDir = path.join(baseDir, 'dist');
  fs.mkdirSync(distDir, { recursive: true });
  const zipName = `${manifest.name}-v${manifest.version}.zip`;
  const zipPath = path.join(distDir, zipName);
  if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);

  const includeItems = [
    'LICENSE',
    'SKILL.md',
    'README.md',
    'CHANGELOG.md',
    'install.mjs',
    '.gitattributes',
    '.gitignore',
    'core',
    'user',
    'assets'
  ].filter((item) => fs.existsSync(path.join(baseDir, item)));

  const allowedUserFiles = new Set(['config.json', 'custom.css', 'i18n.override.json']);
  const skipNames = new Set(['.DS_Store']);
  const entriesToPack = [];
  const collectEntries = (relPosix) => {
    const fullPath = path.join(baseDir, ...relPosix.split('/'));
    if (!fs.existsSync(fullPath)) return;
    const st = fs.statSync(fullPath);
    if (st.isDirectory()) {
      for (const child of fs.readdirSync(fullPath).sort()) {
        if (skipNames.has(child)) continue;
        if (relPosix === 'user' && !allowedUserFiles.has(child)) continue;
        collectEntries(`${relPosix}/${child}`);
      }
    } else if (st.isFile()) {
      entriesToPack.push({ abs: fullPath, entry: relPosix });
    }
  };
  for (const item of includeItems) {
    collectEntries(item);
  }

  const r = spawnSync('zip', ['-q', zipPath, ...entriesToPack.map((e) => e.entry)], {
    cwd: baseDir,
    stdio: 'inherit'
  });
  if (r.status !== 0) throw new Error('zip command failed');
  // 逐文件校验 zip 内 core/* 的 SHA-256 与字节数与 manifest 完全一致，杜绝脏包发布
  for (const [name, meta] of Object.entries(manifest.files)) {
    const uz = spawnSync('unzip', ['-p', zipPath, `core/${name}`], { maxBuffer: 20 * 1024 * 1024 });
    if (uz.status !== 0) {
      fs.unlinkSync(zipPath);
      throw new Error(`Verification failed: missing core/${name} in ${zipName}`);
    }
    const actualSha = crypto.createHash('sha256').update(uz.stdout).digest('hex');
    if (actualSha !== meta.sha256 || uz.stdout.length !== meta.bytes) {
      fs.unlinkSync(zipPath);
      throw new Error(
        `Verification failed for core/${name} in ${zipName}: expected ${meta.sha256} (${meta.bytes}B), got ${actualSha} (${uz.stdout.length}B)`
      );
    }
  }
  return { zipPath, version: manifest.version, filesVerified: Object.keys(manifest.files).length };
}

function verifyCoreIntegrity(baseDir = __dirname) {
  const coreDir = path.join(baseDir, 'core');
  const manifestPath = path.join(coreDir, 'manifest.json');
  if (!fs.existsSync(manifestPath)) {
    return { ok: false, reason: 'missing manifest.json', modified: [] };
  }
  let manifest;
  try {
    manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  } catch (err) {
    return { ok: false, reason: `invalid manifest.json: ${err?.message || err}`, modified: [] };
  }
  const filesMap = manifest && typeof manifest.files === 'object' && !Array.isArray(manifest.files) ? manifest.files : null;
  if (!filesMap) {
    return { ok: false, reason: 'manifest.json missing files map', modified: [] };
  }
  const requiredFiles = ['daemon.mjs', 'runtime.js', 'theme.css', 'i18n.json'];
  const allNames = Array.from(new Set([...requiredFiles, ...Object.keys(filesMap)]));
  const modified = [];
  for (const name of allNames) {
    const meta = filesMap[name];
    if (!meta || typeof meta.sha256 !== 'string' || !/^[0-9a-f]{64}$/i.test(meta.sha256) || !Number.isInteger(meta.bytes)) {
      modified.push({ file: name, status: 'missing_manifest_entry' });
      continue;
    }
    const p = path.join(coreDir, name);
    if (!fs.existsSync(p)) {
      modified.push({ file: name, status: 'missing' });
      continue;
    }
    const buf = fs.readFileSync(p);
    const actualHash = crypto.createHash('sha256').update(buf).digest('hex');
    if (actualHash !== meta.sha256 || buf.length !== meta.bytes) {
      modified.push({
        file: name,
        status: 'modified',
        expected: meta.sha256,
        actual: actualHash,
        expectedBytes: meta.bytes,
        actualBytes: buf.length
      });
    }
  }
  return { ok: modified.length === 0, manifest, modified };
}

// ============================================================================
// 2. 环境、字体、2.33.0+ CDP Opt-in 状态、M1 启动器与实时 CDP 窗口检查
// ============================================================================
function readHostVersionAndProcesses(channel = 'auto') {
  const home = os.homedir();
  const allowStable = channel !== 'insiders';
  const allowInsiders = channel !== 'stable';
  let appVersion = null;
  let runningProcesses = [];
  let launcherInstalled = false;

  const appCandidates =
    channel === 'insiders'
      ? ['/Applications/Antigravity - Insiders.app', path.join(home, 'Applications/Antigravity - Insiders.app')]
      : ['/Applications/Antigravity.app', path.join(home, 'Applications/Antigravity.app'), '/Applications/Antigravity - Insiders.app'];
  for (const appBundle of appCandidates) {
    const infoPlist = path.join(appBundle, 'Contents', 'Info.plist');
    if (!fs.existsSync(infoPlist)) continue;
    try {
      const xml = fs.readFileSync(infoPlist, 'utf8');
      const m = xml.match(/<key>CFBundleShortVersionString<\/key>\s*<string>([^<]+)<\/string>/);
      if (m && m[1]) {
        appVersion = m[1].trim();
        break;
      }
    } catch {}
  }
  const launcherApp =
    channel === 'insiders'
      ? path.join(home, 'Applications', 'Antigravity - Insiders (Theme).app')
      : path.join(home, 'Applications', 'Antigravity (Theme).app');
  launcherInstalled = fs.existsSync(path.join(launcherApp, 'Contents', 'MacOS', 'launcher'));

  const ps = spawnSync('ps', ['-axo', 'pid=,command='], { encoding: 'utf8', timeout: 2500 });
  if (ps.status === 0 && ps.stdout) {
    for (const line of String(ps.stdout).split(/\r?\n/)) {
      const m = line.trim().match(/^(\d+)\s+(.+)$/);
      if (!m) continue;
      const pid = parseInt(m[1], 10);
      const cmd = m[2];
      if (
        !pid ||
        /--type=|--crashpad|--utility-sub-type=|--import=|sidecar_sdk|--ms-enable-electron-run-as-node/i.test(cmd) ||
        /Helper(?:\s|\.|\/)/i.test(cmd)
      ) {
        continue;
      }
      const appMatch = cmd.match(/^(\S.*?\/Antigravity(?:\s-\sInsiders)?\.app)\/Contents\/MacOS\/(Antigravity(?:\s-\sInsiders)?)(?:\s|$)/);
      if (!appMatch) continue;
      const ch = /Insiders/i.test(appMatch[2]) ? 'insiders' : 'stable';
      if ((ch === 'stable' && !allowStable) || (ch === 'insiders' && !allowInsiders)) continue;
      runningProcesses.push({
        pid,
        channel: ch,
        appPath: appMatch[1],
        exePath: `${appMatch[1]}/Contents/MacOS/${appMatch[2]}`,
        hasCdpFlag: /--remote-debugging-port(?:=|\s|$)/.test(cmd)
      });
    }
  }

  return { appVersion, runningProcesses, launcherInstalled };
}

async function detectEnvironment(channel = 'auto') {
  const nodeVer = process.versions.node;
  const [major, minor] = nodeVer.split('.').map((n) => parseInt(n, 10));
  const nodeBasicOk = major >= 22;

  let sqliteAvailable = false;
  try {
    const mod = await import('node:sqlite').catch(() => null);
    sqliteAvailable = !!(mod && typeof mod.DatabaseSync === 'function');
  } catch {
    sqliteAvailable = false;
  }

  const home = os.homedir();
  const fontDirs = [path.join(home, 'Library/Fonts'), '/Library/Fonts'];

  let allFontFiles = [];
  for (const d of fontDirs) {
    try {
      if (fs.existsSync(d)) {
        allFontFiles.push(...fs.readdirSync(d));
      }
    } catch {}
  }

  // v5.5.0+ UI 西文直连官方 Google Sans Flex 引擎，本地仅需 Anthropic Serif（对话正文）+ Anthropic Mono（代码）+ Sarasa（中文）
  const hasAnthropicSerifFont = allFontFiles.some((f) => /AnthropicSerif|Anthropic[ _-]Serif/i.test(f));
  const hasAnthropicMonoFont = allFontFiles.some((f) => /AnthropicMono|Anthropic[ _-]Mono/i.test(f));
  const hasAnthropicFont = hasAnthropicSerifFont && hasAnthropicMonoFont;
  const hasSarasaFont = allFontFiles.some((f) => /Sarasa|更纱|更紗/i.test(f));

  const checkSingleChannel = (ch) => {
    const isInsiders = ch === 'insiders';
    const appDirName = isInsiders ? 'Antigravity - Insiders' : 'Antigravity';
    const portFile = path.join(home, 'Library/Application Support', appDirName, 'DevToolsActivePort');
    const appPath = isInsiders ? '/Applications/Antigravity - Insiders.app' : '/Applications/Antigravity.app';
    const userAppPath = path.join(home, 'Applications', `${appDirName}.app`);
    const portFileExists = fs.existsSync(portFile);
    const appExists = fs.existsSync(appPath) || fs.existsSync(userAppPath);
    return {
      channel: ch,
      appExists,
      portFile,
      portFileExists
    };
  };

  const primaryChannel = channel === 'insiders' ? 'insiders' : 'stable';
  const stableInfo = checkSingleChannel('stable');
  const insidersInfo = checkSingleChannel('insiders');
  const chInfo = primaryChannel === 'insiders' ? insidersInfo : stableInfo;
  const channelsMap = {
    stable: stableInfo,
    insiders: insidersInfo
  };
  const hostRuntime = readHostVersionAndProcesses(channel);
  const portFileExists =
    channel === 'stable'
      ? stableInfo.portFileExists
      : channel === 'insiders'
      ? insidersInfo.portFileExists
      : hostRuntime.runningProcesses.length > 0
      ? hostRuntime.runningProcesses.some((p) => channelsMap[p.channel]?.portFileExists)
      : stableInfo.portFileExists || insidersInfo.portFileExists;

  let cdpStatus = 'app_not_running';
  if (hostRuntime.runningProcesses.length > 0) {
    const anyReadyRunning = hostRuntime.runningProcesses.some(
      (p) => p.hasCdpFlag || channelsMap[p.channel]?.portFileExists
    );
    cdpStatus = anyReadyRunning ? 'ready' : 'missing_opt_in_flag';
  } else if (portFileExists) {
    cdpStatus = 'stale_port_file';
  }

  const activeRunningChannel = hostRuntime.runningProcesses[0]?.channel || primaryChannel;
  const preferredPortFile =
    channelsMap[activeRunningChannel]?.portFile ||
    (chInfo.portFileExists ? chInfo.portFile : insidersInfo.portFileExists ? insidersInfo.portFile : chInfo.portFile);

  return {
    nodeVer,
    major,
    minor,
    nodeBasicOk,
    sqliteAvailable,
    tier: sqliteAvailable
      ? 'FULL (>= 22.13, Theme + Google Sans Flex/Sarasa/Serif + i18n + SQLite Live Metrics & Token Analytics)'
      : nodeBasicOk
      ? 'STANDARD (22.0~22.12, Theme + Fonts + i18n; SQLite Metrics & Token Analytics gracefully disabled)'
      : 'UNSUPPORTED (< 22.0, requires Node 22+)',
    hasAnthropicFont,
    hasAnthropicSerifFont,
    hasAnthropicMonoFont,
    hasSarasaFont,
    channel,
    appExists: chInfo.appExists || insidersInfo.appExists || hostRuntime.runningProcesses.length > 0,
    appVersion: hostRuntime.appVersion,
    cdpStatus,
    launcherInstalled: hostRuntime.launcherInstalled,
    runningProcesses: hostRuntime.runningProcesses,
    portFile: preferredPortFile,
    portFileExists,
    channels: channelsMap
  };
}

function inspectJsoncRootObject(raw) {
  let i = 0;
  const len = raw.length;
  let depth = 0;
  let openBraceIdx = -1;
  let closeBraceIdx = -1;
  let hasTopProps = false;
  let hasRemoteDebuggingPort = false;

  while (i < len) {
    const ch = raw[i];
    const next = i + 1 < len ? raw[i + 1] : '';

    if (ch === '/' && next === '/') {
      i += 2;
      while (i < len && raw[i] !== '\n') i++;
      continue;
    }
    if (ch === '/' && next === '*') {
      i += 2;
      while (i + 1 < len && !(raw[i] === '*' && raw[i + 1] === '/')) i++;
      i += 2;
      continue;
    }
    if (ch === '"') {
      i++;
      let val = '';
      while (i < len) {
        if (raw[i] === '\\') {
          val += raw.slice(i, i + 2);
          i += 2;
          continue;
        }
        if (raw[i] === '"') {
          i++;
          break;
        }
        val += raw[i++];
      }
      if (depth === 1 && openBraceIdx !== -1 && closeBraceIdx === -1) {
        hasTopProps = true;
        if (val === 'remote-debugging-port') {
          let k = i;
          while (k < len) {
            if (/\s/.test(raw[k])) {
              k++;
            } else if (raw[k] === '/' && raw[k + 1] === '/') {
              k += 2;
              while (k < len && raw[k] !== '\n') k++;
            } else if (raw[k] === '/' && raw[k + 1] === '*') {
              k += 2;
              while (k + 1 < len && !(raw[k] === '*' && raw[k + 1] === '/')) k++;
              k += 2;
            } else {
              break;
            }
          }
          if (raw[k] === ':') {
            hasRemoteDebuggingPort = true;
          }
        }
      }
      continue;
    }

    if (ch === '{') {
      if (depth === 0 && openBraceIdx === -1) {
        openBraceIdx = i;
      }
      depth++;
    } else if (ch === '}') {
      depth--;
      if (depth === 0 && openBraceIdx !== -1 && closeBraceIdx === -1) {
        closeBraceIdx = i;
      }
    } else if (depth === 1 && openBraceIdx !== -1 && closeBraceIdx === -1 && !/\s/.test(ch)) {
      hasTopProps = true;
    }
    i++;
  }

  return { openBraceIdx, closeBraceIdx, hasTopProps, hasRemoteDebuggingPort };
}

function ensureArgvRemoteDebugging(channel = 'auto') {
  const home = os.homedir();
  const dirs =
    channel === 'insiders'
      ? ['.antigravity-insiders']
      : channel === 'stable'
      ? ['.antigravity']
      : ['.antigravity', '.antigravity-insiders'];

  const results = [];
  for (const d of dirs) {
    const defaultPort = d === '.antigravity-insiders' ? 9223 : 9222;
    const argvDir = path.join(home, d);
    const argvPath = path.join(argvDir, 'argv.json');
    if (!fs.existsSync(argvDir)) continue;
    try {
      if (!fs.existsSync(argvPath)) {
        fs.writeFileSync(argvPath, JSON.stringify({ 'remote-debugging-port': defaultPort }, null, 2) + '\n', 'utf8');
        results.push({ path: argvPath, port: defaultPort, action: 'created' });
        continue;
      }
      const raw = fs.readFileSync(argvPath, 'utf8');
      const parsedInfo = inspectJsoncRootObject(raw);
      if (parsedInfo.hasRemoteDebuggingPort) {
        results.push({ path: argvPath, action: 'already-present' });
        continue;
      }
      if (parsedInfo.openBraceIdx !== -1 && parsedInfo.closeBraceIdx > parsedInfo.openBraceIdx) {
        const afterOpen = raw.slice(parsedInfo.openBraceIdx + 1);
        const comma = parsedInfo.hasTopProps ? ',' : '';
        const trailingNl = afterOpen.startsWith('\n') || afterOpen.startsWith('\r') ? '' : '\n';
        const patched =
          raw.slice(0, parsedInfo.openBraceIdx + 1) +
          `\n\t"remote-debugging-port": ${defaultPort}${comma}${trailingNl}` +
          afterOpen;
        fs.writeFileSync(argvPath, patched, 'utf8');
        results.push({ path: argvPath, port: defaultPort, action: 'patched' });
      } else {
        results.push({ path: argvPath, action: 'skipped', error: 'root JSON object not found' });
      }
    } catch (e) {
      results.push({ path: argvPath, action: 'skipped', error: e.message });
    }
  }
  return results;
}

function isAllowedOrigin(urlStr) {
  if (!urlStr || typeof urlStr !== 'string') return false;
  return ALLOWED_ORIGINS.some((prefix) => urlStr.startsWith(prefix));
}

function fetchTargetsFromPort(port) {
  return new Promise((resolve) => {
    const req = http.get({ host: '127.0.0.1', port, path: '/json/list', timeout: 450 }, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch {
          resolve([]);
        }
      });
    });
    req.on('error', () => resolve([]));
    req.on('timeout', () => {
      req.destroy();
      resolve([]);
    });
  });
}

async function inspectLiveWindow(portFileOrEnv, fallbackPort = 9222) {
  const candidateFiles = [];
  const candidatePorts = [];

  if (portFileOrEnv && typeof portFileOrEnv === 'object' && portFileOrEnv.channels) {
    if (portFileOrEnv.portFile) candidateFiles.push(portFileOrEnv.portFile);
    if (portFileOrEnv.channels.stable?.portFile) candidateFiles.push(portFileOrEnv.channels.stable.portFile);
    if (portFileOrEnv.channels.insiders?.portFile) candidateFiles.push(portFileOrEnv.channels.insiders.portFile);
    if (portFileOrEnv.channels.stable?.appExists !== false) candidatePorts.push(9222);
    if (portFileOrEnv.channels.insiders?.appExists) candidatePorts.push(9223);
  } else if (typeof portFileOrEnv === 'string' && portFileOrEnv) {
    candidateFiles.push(portFileOrEnv);
    if (fallbackPort > 0) candidatePorts.push(fallbackPort);
  } else if (fallbackPort > 0) {
    candidatePorts.push(fallbackPort);
  }

  let port = null;
  let targets = [];
  const triedPorts = new Set();

  for (const pf of candidateFiles) {
    if (pf && fs.existsSync(pf)) {
      const raw = fs.readFileSync(pf, 'utf8').trim();
      const parsed = parseInt(raw.split(/\r?\n/)[0], 10);
      if (parsed > 0 && !triedPorts.has(parsed)) {
        triedPorts.add(parsed);
        const res = await fetchTargetsFromPort(parsed);
        if (res.length > 0) {
          port = parsed;
          targets = res;
          break;
        }
      }
    }
  }
  if (targets.length === 0) {
    for (const fb of candidatePorts) {
      if (fb > 0 && !triedPorts.has(fb)) {
        triedPorts.add(fb);
        const fbTargets = await fetchTargetsFromPort(fb);
        if (fbTargets.length > 0) {
          port = fb;
          targets = fbTargets;
          break;
        }
      }
    }
  }
  if (!port || targets.length === 0) {
    return { reachable: false, reason: 'No active CDP port responded (checked DevToolsActivePort & fallback port 9222)' };
  }

  const pages = targets.filter(
    (t) =>
      t.type === 'page' &&
      t.webSocketDebuggerUrl &&
      !String(t.url || '').startsWith('devtools://') &&
      isAllowedOrigin(t.url) &&
      !String(t.title || '').includes('Launchpad')
  );

  if (pages.length === 0) {
    return { reachable: true, port, pages: 0, reason: 'No active workbench page target' };
  }

  const evaluatePageState = (candidate) =>
    new Promise((resolve) => {
      const ws = new WebSocket(candidate.webSocketDebuggerUrl);
      const timer = setTimeout(() => {
        try {
          ws.close();
        } catch {}
        resolve(null);
      }, 2000);
      ws.addEventListener('open', () => {
        ws.send(
          JSON.stringify({
            id: 1,
            method: 'Runtime.evaluate',
            params: {
              expression: `(() => {
                const pills = typeof document !== 'undefined' && typeof document.querySelectorAll === 'function'
                  ? Array.from(document.querySelectorAll('[data-ag-metrics-pill="1"], #ag-live-metrics-pill'))
                  : [];
                const primaryPill = (typeof document !== 'undefined' && document.getElementById('ag-live-metrics-pill')) || pills[0] || null;
                return {
                  __isHost: !!(
                    (window.location && window.location.protocol === 'vscode-file:') ||
                    (window.__APP_CONFIG__ && window.__APP_CONFIG__.productName === 'antigravity') ||
                    (window.electronNative && (
                      (typeof window.electronNative.setTitleBarOverlay === 'function' && window.nativeStorage && typeof window.nativeStorage.getItems === 'function') ||
                      (typeof window.electronNative.getZoomLevel === 'function' && window.electronNative.wcvBrowser && typeof window.electronNative.wcvBrowser.setThemeColor === 'function')
                    )) ||
                    (typeof document !== 'undefined' && typeof document.querySelector === 'function' && document.querySelector('link[href*="/jetbox.css"], body[data-agy-theme], body[data-newux-theme], [id="antigravity.agentSidePanelInputBox"]'))
                  ),
                  version: window.__ag_patch_version || null,
                  bodyReady: window.__ag_body_ready === true,
                  hasStyle: !!document.getElementById('ag-custom-fonts'),
                  hasUserStyle: !!document.getElementById('antigravity-user-custom-style'),
                  preset: document.documentElement ? document.documentElement.getAttribute('data-ag-preset') : null,
                  darkPreset: document.documentElement ? document.documentElement.getAttribute('data-ag-dark-preset') : null,
                  themeMode: document.documentElement ? document.documentElement.getAttribute('data-ag-theme-mode') : null,
                  pageType: document.documentElement ? document.documentElement.getAttribute('data-ag-page-type') : null,
                  waxSeal: document.documentElement ? document.documentElement.getAttribute('data-ag-wax-seal') : null,
                  dictCount: window.__ag_i18n_dict ? Object.keys(window.__ag_i18n_dict).length : 0,
                  protoSafe: window.__ag_i18n_dict ? Object.getPrototypeOf(window.__ag_i18n_dict) === null : false,
                  pillMounted: pills.length > 0,
                  pillCount: pills.length,
                  pillText: primaryPill ? (primaryPill.textContent || null) : null
                };
              })()`,
              returnByValue: true
            }
          })
        );
      });
      ws.addEventListener('message', (ev) => {
        try {
          const msg = JSON.parse(String(ev.data));
          if (msg.id === 1) {
            clearTimeout(timer);
            ws.close();
            resolve(msg.result?.result?.value || null);
          }
        } catch {}
      });
      ws.addEventListener('error', () => {
        clearTimeout(timer);
        resolve(null);
      });
    });

  let selected = null;
  let firstHostCandidate = null;
  let firstNullCandidate = null;

  for (const candidate of pages) {
    const rawState = await evaluatePageState(candidate);
    if (rawState === null) {
      if (!firstNullCandidate) {
        firstNullCandidate = { page: candidate, state: null };
      }
      continue;
    }
    const isHost = rawState.__isHost === true;
    const cleanState = { ...rawState };
    delete cleanState.__isHost;
    if (isHost) {
      if (cleanState.hasStyle === true) {
        selected = { page: candidate, state: cleanState };
        break;
      }
      if (!firstHostCandidate) {
        firstHostCandidate = { page: candidate, state: cleanState };
      }
    }
  }

  if (!selected) {
    selected = firstHostCandidate || firstNullCandidate;
  }
  if (!selected) {
    return { reachable: true, port, pages: 0, reason: 'No active workbench page target' };
  }

  return {
    reachable: true,
    port,
    targetId: selected.page.id,
    title: selected.page.title,
    state: selected.state
  };
}

// ============================================================================
// 3. M1 macOS 可选 CDP Opt-in 启动器部署与清理 + 子命令实现
// ============================================================================
function ensureCdpLaunchers(channel = 'auto', options = {}) {
  const home = os.homedir();
  const allowStable = channel !== 'insiders';
  const allowInsiders = channel !== 'stable';
  const withDarwinLauncher = Boolean(options && options.withLauncher);

  // 默认采用「单图标纯净模式」：不额外生成第二个 .app 图标，全靠 M2 守护进程冷启动自动接力 + relaunch 子命令；
  // 若历史安装曾生成过 (Theme).app，默认自动注销 LaunchServices 索引并移入废纸篓，确保启动台/Spotlight 仅保留唯一官方图标。
  if (!withDarwinLauncher) {
    const cleaned = removeCdpLaunchers();
    return {
      platform: 'darwin',
      mode: 'single-icon-m2-relay',
      launchers: [],
      cleanedLegacyLaunchers: cleaned
    };
  }

  const appsDir = path.join(home, 'Applications');
  const specs = [
    allowStable
      ? {
          channel: 'stable',
          srcApp: ['/Applications/Antigravity.app', path.join(appsDir, 'Antigravity.app')].find((p) => fs.existsSync(p)),
          launcherName: 'Antigravity (Theme).app',
          bundleId: 'com.chuanban.antigravity.theme-launcher',
          displayName: 'Antigravity (Theme)'
        }
      : null,
    allowInsiders
      ? {
          channel: 'insiders',
          srcApp: ['/Applications/Antigravity - Insiders.app', path.join(appsDir, 'Antigravity - Insiders.app')].find(
            (p) => fs.existsSync(p)
          ),
          launcherName: 'Antigravity - Insiders (Theme).app',
          bundleId: 'com.chuanban.antigravity.theme-launcher.insiders',
          displayName: 'Antigravity - Insiders (Theme)'
        }
      : null
  ].filter((s) => s && s.srcApp);

  const created = [];
  for (const spec of specs) {
    try {
      const destApp = path.join(appsDir, spec.launcherName);
      const contentsDir = path.join(destApp, 'Contents');
      const macosDir = path.join(contentsDir, 'MacOS');
      const resDir = path.join(contentsDir, 'Resources');
      fs.mkdirSync(macosDir, { recursive: true });
      fs.mkdirSync(resDir, { recursive: true });

      const srcResDir = path.join(spec.srcApp, 'Contents', 'Resources');
      let iconBase = '';
      if (fs.existsSync(srcResDir)) {
        const icnsCandidate =
          ['icon.icns', 'electron.icns'].find((n) => fs.existsSync(path.join(srcResDir, n))) ||
          fs.readdirSync(srcResDir).find((n) => n.endsWith('.icns')) ||
          '';
        if (icnsCandidate) {
          fs.copyFileSync(path.join(srcResDir, icnsCandidate), path.join(resDir, 'icon.icns'));
          iconBase = 'icon';
        }
      }

      const plistXml = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">',
        '<plist version="1.0">',
        '<dict>',
        '  <key>CFBundleExecutable</key>',
        '  <string>launcher</string>',
        '  <key>CFBundleIdentifier</key>',
        `  <string>${spec.bundleId}</string>`,
        '  <key>CFBundleName</key>',
        `  <string>${spec.displayName}</string>`,
        '  <key>CFBundleDisplayName</key>',
        `  <string>${spec.displayName}</string>`,
        '  <key>CFBundlePackageType</key>',
        '  <string>APPL</string>',
        '  <key>CFBundleShortVersionString</key>',
        '  <string>5.5.5</string>',
        '  <key>CFBundleVersion</key>',
        '  <string>555</string>',
        ...(iconBase ? ['  <key>CFBundleIconFile</key>', `  <string>${iconBase}</string>`] : []),
        '  <key>LSMinimumSystemVersion</key>',
        '  <string>12.0</string>',
        '  <key>LSUIElement</key>',
        '  <true/>',
        '  <key>NSHighResolutionCapable</key>',
        '  <true/>',
        '</dict>',
        '</plist>',
        ''
      ].join('\n');
      fs.writeFileSync(path.join(contentsDir, 'Info.plist'), plistXml, 'utf8');

      const escapedAppPath = spec.srcApp.replace(/(["\\$`])/g, '\\$1');
      const launcherScript = [
        '#!/bin/sh',
        '# Managed by chuanban-antigravity-theme-patch (Optional M1 CDP Opt-in Launcher)',
        `exec /usr/bin/open -a "${escapedAppPath}" --args --remote-debugging-port=0 "$@"`,
        ''
      ].join('\n');
      const binPath = path.join(macosDir, 'launcher');
      fs.writeFileSync(binPath, launcherScript, { encoding: 'utf8', mode: 0o755 });
      fs.chmodSync(binPath, 0o755);

      const lsreg =
        '/System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister';
      if (fs.existsSync(lsreg)) {
        spawnSync(lsreg, ['-f', destApp], { stdio: 'ignore', timeout: 4000 });
      }
      created.push(destApp);
    } catch {}
  }
  return { platform: 'darwin', mode: 'optional-m1-launcher', launchers: created };
}

function removeCdpLaunchers() {
  const home = os.homedir();
  const appsDir = path.join(home, 'Applications');
  const lsreg =
    '/System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister';
  const removed = [];
  for (const name of ['Antigravity (Theme).app', 'Antigravity - Insiders (Theme).app']) {
    const appPath = path.join(appsDir, name);
    const plistPath = path.join(appPath, 'Contents', 'Info.plist');
    if (!fs.existsSync(plistPath)) continue;
    try {
      const xml = fs.readFileSync(plistPath, 'utf8');
      if (!xml.includes('com.chuanban.antigravity.theme-launcher')) continue;
      if (fs.existsSync(lsreg)) {
        spawnSync(lsreg, ['-u', appPath], { stdio: 'ignore', timeout: 4000 });
      }
      if (fs.existsSync('/usr/bin/trash')) {
        spawnSync('/usr/bin/trash', [appPath], { stdio: 'ignore', timeout: 4000 });
      } else {
        fs.rmSync(appPath, { recursive: true, force: true });
      }
      removed.push(appPath);
    } catch {}
  }
  return removed;
}

async function runDoctor() {
  const channel = getArg('--channel', 'auto');
  const defaultTarget = resolveGlobalInstallDir();
  const targetDir = path.resolve(getArg('--target-dir', resolveDefaultTargetDir()));
  const isCustomSandboxTarget =
    hasFlag('--target-dir') && !isSameTargetPath(targetDir, defaultTarget) && !hasFlag('--register-service');
  const env = await detectEnvironment(channel);
  const integrity = verifyCoreIntegrity(targetDir);
  const live = await inspectLiveWindow(env);

  const cdpMissingFlag = !isCustomSandboxTarget && !live.reachable && env.cdpStatus === 'missing_opt_in_flag';
  const remediation = cdpMissingFlag ? `node ${JSON.stringify(path.join(targetDir, 'install.mjs'))} relaunch` : null;

  const missingFonts = [];
  if (!env.hasAnthropicSerifFont) missingFonts.push('Anthropic Serif (AnthropicSerif-Regular.ttf, AnthropicSerif-Bold.ttf)');
  if (!env.hasAnthropicMonoFont) missingFonts.push('Anthropic Mono (AnthropicMono-Regular.ttf)');
  if (!env.hasSarasaFont) missingFonts.push('Sarasa Gothic (Sarasa-SuperTTC.ttc)');
  const allRequiredFontsInstalled = missingFonts.length === 0;
  const launcherMode = env.launcherInstalled ? 'optional-launcher-app' : 'single-icon-m2-relay';

  const report = {
    ok: Boolean(env.nodeBasicOk && integrity.ok && !cdpMissingFlag),
    node: {
      version: env.nodeVer,
      execPath: process.execPath,
      serviceExecPath: resolveStableNodeExecPath(),
      tier: env.tier
    },
    fonts: {
      uiLatinEngine: 'Google Sans Flex (native variable font)',
      allRequiredInstalled: allRequiredFontsInstalled,
      anthropicInstalled: env.hasAnthropicFont,
      anthropicSerifInstalled: env.hasAnthropicSerifFont,
      anthropicMonoInstalled: env.hasAnthropicMonoFont,
      sarasaInstalled: env.hasSarasaFont,
      missing: missingFonts,
      downloadUrl: !allRequiredFontsInstalled ? GOOGLE_DRIVE_URL : null
    },
    antigravity: {
      channel: env.channel,
      appExists: env.appExists,
      appVersion: env.appVersion,
      cdpStatus: live.reachable ? 'ready' : env.cdpStatus,
      launcherMode,
      launcherInstalled: env.launcherInstalled,
      runningProcesses: env.runningProcesses,
      remediation,
      portFile: env.portFile,
      portFileExists: env.portFileExists,
      channels: env.channels
    },
    coreIntegrity: {
      targetDir,
      clean: integrity.ok,
      modifiedFiles: integrity.modified
    },
    liveWindow: live
  };

  console.log(JSON.stringify(report, null, 2));
  if (!env.nodeBasicOk) {
    console.error('\n[ERROR] Node.js >= 22.0.0 is required. Current:', env.nodeVer);
    process.exit(1);
  }
}

function writePrivateFileSync(filePath, data, encoding = 'utf8', mode = 0o600) {
  fs.writeFileSync(filePath, data, typeof data === 'string' ? { encoding, mode } : { mode });
  try {
    fs.chmodSync(filePath, mode);
  } catch {}
}

function tightenPermissions(rootDir) {
  if (!rootDir || !fs.existsSync(rootDir)) return;
  const executableNames = new Set(['daemon.mjs', 'install.mjs']);
  const walk = (p) => {
    let st;
    try {
      st = fs.lstatSync(p);
    } catch {
      return;
    }
    if (st.isSymbolicLink()) return;
    if (st.isDirectory()) {
      try {
        fs.chmodSync(p, 0o700);
      } catch {}
      let children = [];
      try {
        children = fs.readdirSync(p);
      } catch {}
      for (const child of children) {
        walk(path.join(p, child));
      }
    } else if (st.isFile()) {
      const mode = executableNames.has(path.basename(p)) ? 0o700 : 0o600;
      try {
        fs.chmodSync(p, mode);
      } catch {}
    }
  };
  walk(rootDir);
}

function copyDirRecursive(src, dest) {
  fs.mkdirSync(dest, { recursive: true, mode: 0o700 });
  try {
    fs.chmodSync(dest, 0o700);
  } catch {}
  for (const item of fs.readdirSync(src)) {
    const s = path.join(src, item);
    const d = path.join(dest, item);
    const st = fs.statSync(s);
    if (st.isDirectory()) {
      copyDirRecursive(s, d);
    } else {
      fs.copyFileSync(s, d);
      try {
        fs.chmodSync(d, item === 'daemon.mjs' ? 0o700 : 0o600);
      } catch {}
    }
  }
}

function sleepSync(ms) {
  try {
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
  } catch {}
}

function parsePidFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) return { pid: 0, stopRequested: false };
    const raw = fs.readFileSync(filePath, 'utf8').trim();
    if (!raw) return { pid: 0, stopRequested: false };
    const lines = raw.split(/\r?\n/);
    const pid = parseInt(lines[0], 10) || 0;
    const second = (lines[1] || '').trim();
    return { pid, stopRequested: second === 'STOP' };
  } catch {
    return { pid: 0, stopRequested: false };
  }
}

function checkDaemonPidState(pid) {
  if (!pid || pid <= 0 || pid === process.pid) return 'not_daemon';
  try {
    process.kill(pid, 0);
  } catch {
    return 'not_daemon';
  }
  const ps = spawnSync('ps', ['-p', String(pid), '-o', 'command='], { encoding: 'utf8', timeout: 2000 });
  if (ps.status === 0 && ps.stdout) {
    const cmd = String(ps.stdout).trim().toLowerCase();
    if (cmd && !cmd.includes('daemon.mjs') && !cmd.includes('antigravity-font-daemon')) {
      return 'not_daemon';
    }
  }
  return 'confirmed';
}

function sendCooperativeStop(pidPath, pid, waitMs = 1200) {
  try {
    writePrivateFileSync(pidPath, `${pid}\nSTOP`, 'utf8', 0o600);
    const steps = Math.max(1, Math.ceil(waitMs / 50));
    for (let i = 0; i < steps; i++) {
      sleepSync(50);
      if (!fs.existsSync(pidPath)) return true;
      if (pid > 0) {
        try {
          process.kill(pid, 0);
        } catch (err) {
          if (!err || err.code !== 'EPERM') return true;
        }
      }
    }
  } catch {}
  return false;
}

function stopRunningDaemonProcesses() {
  const tmpDir = os.tmpdir();
  const stopped = [];
  try {
    for (const f of fs.readdirSync(tmpDir)) {
      if (f.startsWith('ag-theme-daemon-') && f.endsWith('.pid')) {
        const pidPath = path.join(tmpDir, f);
        const { pid, stopRequested } = parsePidFile(pidPath);
        if (!stopRequested && pid > 0 && checkDaemonPidState(pid) === 'confirmed') {
          let killed = false;
          try {
            process.kill(pid, 'SIGTERM');
            for (let i = 0; i < 8; i++) {
              sleepSync(50);
              try {
                process.kill(pid, 0);
              } catch (e) {
                if (!e || e.code !== 'EPERM') {
                  killed = true;
                  break;
                }
              }
            }
          } catch {}
          if (!killed) {
            killed = sendCooperativeStop(pidPath, pid, 1500);
          }
          if (killed) stopped.push(pid);
        }
        try {
          if (fs.existsSync(pidPath)) fs.unlinkSync(pidPath);
        } catch {}
      }
    }
  } catch {}
  return stopped;
}

function removeSystemService() {
  const home = os.homedir();
  const uid = process.getuid ? process.getuid() : 501;
  const launchAgentsDir = path.join(home, 'Library', 'LaunchAgents');
  for (const label of ['com.antigravity.customfont', 'com.antigravity.theme']) {
    try {
      execSync(`launchctl bootout gui/${uid}/${label} 2>/dev/null || true`);
    } catch {}
    for (let i = 0; i < 15; i++) {
      const res = spawnSync('launchctl', ['print', `gui/${uid}/${label}`], { stdio: 'ignore' });
      if (res.status !== 0) break;
      sleepSync(100);
    }
    try {
      const plistFile = path.join(launchAgentsDir, `${label}.plist`);
      if (fs.existsSync(plistFile)) fs.unlinkSync(plistFile);
    } catch {}
  }
}

function resolveStableNodeExecPath(execPath = process.execPath, home = os.homedir()) {
  let realExec = '';
  try {
    realExec = fs.realpathSync(execPath);
  } catch {
    return execPath;
  }

  const dynamicCellarCandidates = [];
  for (const probePath of [execPath, realExec]) {
    const m = String(probePath || '').match(/^(.*)\/Cellar\/([^/]+)\/[^/]+\/bin\/(node)$/i);
    if (m) {
      const brewPrefix = m[1];
      const formula = m[2];
      const binName = m[3];
      dynamicCellarCandidates.push(path.join(brewPrefix, 'bin', binName));
      dynamicCellarCandidates.push(path.join(brewPrefix, 'opt', formula, 'bin', binName));
    }
  }

  const envExtra = process.env.AG_STABLE_NODE_CANDIDATES
    ? String(process.env.AG_STABLE_NODE_CANDIDATES)
        .split(path.delimiter)
        .map((s) => s.trim())
        .filter(Boolean)
    : [];

  const staticCandidates = [
    '/opt/homebrew/bin/node',
    '/usr/local/bin/node',
    '/opt/homebrew/opt/node/bin/node',
    '/usr/local/opt/node/bin/node',
    '/opt/homebrew/opt/node@22/bin/node',
    '/opt/homebrew/opt/node@24/bin/node',
    path.join(home, 'Library', 'Application Support', 'fnm', 'aliases', 'default', 'bin', 'node'),
    path.join(home, '.local', 'share', 'fnm', 'aliases', 'default', 'bin', 'node')
  ];

  const seen = new Set();
  for (const cand of [...envExtra, ...dynamicCellarCandidates, ...staticCandidates]) {
    if (!cand || seen.has(cand)) continue;
    seen.add(cand);
    try {
      if (fs.existsSync(cand) && fs.realpathSync(cand) === realExec) {
        return cand;
      }
    } catch {}
  }
  return execPath;
}

function registerSystemService(wrapperDaemon, targetDir) {
  const home = os.homedir();
  const serviceNodeExec = resolveStableNodeExecPath();
  const launchAgentsDir = path.join(home, 'Library', 'LaunchAgents');
  fs.mkdirSync(launchAgentsDir, { recursive: true });
  const logsDir = path.join(targetDir, 'logs');
  fs.mkdirSync(logsDir, { recursive: true, mode: 0o700 });
  try {
    fs.chmodSync(logsDir, 0o700);
  } catch {}
  const stdoutLog = path.join(logsDir, 'daemon.log');
  const stderrLog = path.join(logsDir, 'daemon.err');
  const existingCustomFontPlist = path.join(launchAgentsDir, 'com.antigravity.customfont.plist');
  const themePlist = path.join(launchAgentsDir, 'com.antigravity.theme.plist');
  const activePlist = fs.existsSync(existingCustomFontPlist) ? existingCustomFontPlist : themePlist;
  const label = path.basename(activePlist, '.plist');

  const plistContent = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>${label}</string>
    <key>ProgramArguments</key>
    <array>
        <string>${serviceNodeExec}</string>
        <string>--disable-warning=ExperimentalWarning</string>
        <string>${wrapperDaemon}</string>
    </array>
    <key>EnvironmentVariables</key>
    <dict>
        <key>PATH</key>
        <string>/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin</string>
    </dict>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardOutPath</key>
    <string>${stdoutLog}</string>
    <key>StandardErrorPath</key>
    <string>${stderrLog}</string>
</dict>
</plist>
`;
  const prevPlist = fs.existsSync(activePlist) ? fs.readFileSync(activePlist, 'utf8') : '';
  const plistChanged = prevPlist !== plistContent;
  if (plistChanged) {
    writePrivateFileSync(activePlist, plistContent, 'utf8', 0o600);
  } else {
    try {
      fs.chmodSync(activePlist, 0o600);
    } catch {}
  }

  const uid = process.getuid ? process.getuid() : 501;
  const domainTarget = `gui/${uid}/${label}`;
  const queryServiceState = () => {
    const r = spawnSync('launchctl', ['print', domainTarget], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    const out = String(r.stdout || '');
    return { loaded: r.status === 0, running: r.status === 0 && /\bpid\s*=\s*\d+/i.test(out) };
  };

  let runningNow = false;
  try {
    const initial = queryServiceState();
    if (initial.loaded && !plistChanged) {
      spawnSync('launchctl', ['kickstart', '-k', domainTarget], { stdio: 'ignore' });
    } else {
      if (initial.loaded) {
        spawnSync('launchctl', ['bootout', domainTarget], { stdio: 'ignore' });
        for (let i = 0; i < 20 && queryServiceState().loaded; i++) {
          sleepSync(100);
        }
      }
      for (let i = 0; i < 6; i++) {
        if (!queryServiceState().loaded) {
          const bootRes = spawnSync('launchctl', ['bootstrap', `gui/${uid}`, activePlist], { stdio: 'ignore' });
          if (bootRes.status !== 0 && !queryServiceState().loaded) {
            spawnSync('launchctl', ['load', '-w', activePlist], { stdio: 'ignore' });
          }
        }
        if (queryServiceState().loaded) break;
        sleepSync(120);
      }
      spawnSync('launchctl', ['kickstart', '-k', domainTarget], { stdio: 'ignore' });
    }
    for (let i = 0; i < 5; i++) {
      const st = queryServiceState();
      if (st.running) {
        runningNow = true;
        break;
      }
      sleepSync(60);
    }
    if (!runningNow) runningNow = queryServiceState().loaded;
  } catch {}
  return { platform: 'darwin', serviceFile: activePlist, label, nodeExec: serviceNodeExec, runningNow };
}

async function runInstall() {
  const cliChannel = getArg('--channel', null);
  const channel = cliChannel || 'auto';
  const preset = getArg('--preset', null);
  const darkPreset = getArg('--dark-preset', null);
  const syncUser = hasFlag('--sync-user');
  const noService = hasFlag('--no-service');
  const defaultTarget = resolveGlobalInstallDir();
  const targetDir = path.resolve(getArg('--target-dir', defaultTarget));
  const isCustomSandboxTarget =
    hasFlag('--target-dir') && !isSameTargetPath(targetDir, defaultTarget) && !hasFlag('--register-service');

  const env = await detectEnvironment(channel);
  if (!env.nodeBasicOk) {
    console.error(`[ERROR] Node.js >= 22.0.0 is required (current: ${env.nodeVer}).`);
    process.exit(1);
  }

  buildManifest(__dirname);

  const srcCore = path.join(__dirname, 'core');
  const srcUser = path.join(__dirname, 'user');
  const targetCore = path.join(targetDir, 'core');
  const targetPrev = path.join(targetDir, 'core.prev');
  const backupsDir = path.join(targetDir, 'backups');
  const targetUser = path.join(targetDir, 'user');

  let backupCreated = null;
  let userBackupCreated = null;
  if (!isSameTargetPath(__dirname, targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true, mode: 0o700 });

    // 仅当已安装的 core/ 与当前待安装 core/ 的 manifest SHA-256 不同时才备份，防止重复 install 冲掉上一版快照
    const srcManifestPath = path.join(srcCore, 'manifest.json');
    const targetManifestPath = path.join(targetCore, 'manifest.json');
    const shouldBackup =
      fs.existsSync(targetCore) &&
      (!fs.existsSync(targetManifestPath) || sha256File(srcManifestPath) !== sha256File(targetManifestPath));

    if (shouldBackup) {
      const stamp = new Date().toISOString().replace(/[:.]/g, '-');
      const stampedBackupDir = path.join(backupsDir, stamp);
      fs.mkdirSync(backupsDir, { recursive: true, mode: 0o700 });
      copyDirRecursive(targetCore, stampedBackupDir);
      fs.rmSync(targetPrev, { recursive: true, force: true });
      copyDirRecursive(targetCore, targetPrev);
      backupCreated = stampedBackupDir;
    } else if (fs.existsSync(targetCore) && !fs.existsSync(targetPrev)) {
      copyDirRecursive(targetCore, targetPrev);
      backupCreated = targetPrev;
    }

    fs.rmSync(targetCore, { recursive: true, force: true });
    copyDirRecursive(srcCore, targetCore);

    // user/ 层默认永不覆盖已有文件；仅在显式传入 --sync-user 时先备份旧 user/ 再按标准 3 模板白名单同步
    const USER_TEMPLATE_FILES = ['config.json', 'custom.css', 'i18n.override.json'];
    if (syncUser && fs.existsSync(targetUser)) {
      const userStamp = new Date().toISOString().replace(/[:.]/g, '-') + '-user';
      const stampedUserBackupDir = path.join(backupsDir, userStamp);
      fs.mkdirSync(backupsDir, { recursive: true, mode: 0o700 });
      copyDirRecursive(targetUser, stampedUserBackupDir);
      userBackupCreated = stampedUserBackupDir;
    }
    fs.mkdirSync(targetUser, { recursive: true, mode: 0o700 });
    for (const item of USER_TEMPLATE_FILES) {
      const s = path.join(srcUser, item);
      const d = path.join(targetUser, item);
      if (fs.existsSync(s) && (!fs.existsSync(d) || syncUser)) {
        fs.copyFileSync(s, d);
      }
    }

    for (const docFile of ['install.mjs', 'SKILL.md', 'README.md', 'CHANGELOG.md']) {
      const s = path.join(__dirname, docFile);
      const d = path.join(targetDir, docFile);
      if (fs.existsSync(s)) fs.copyFileSync(s, d);
    }
  }

  // 更新 user/config.json（仅在显式传入 CLI 参数或首次初始化时更新对应字段，保留用户自定义）
  const userConfigPath = path.join(targetUser, 'config.json');
  let currentCfg = {};
  let canWriteUserCfg = true;
  if (fs.existsSync(userConfigPath)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(userConfigPath, 'utf8').replace(/^\uFEFF/, ''));
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        currentCfg = parsed;
      } else {
        canWriteUserCfg = false;
      }
    } catch {
      canWriteUserCfg = false;
      console.warn('[Install] Warning: existing user/config.json is invalid JSON; leaving it untouched to prevent data loss.');
    }
  }
  if (typeof currentCfg.enabled !== 'boolean') currentCfg.enabled = true;
  if (cliChannel) {
    currentCfg.channel = cliChannel;
  } else if (!currentCfg.channel) {
    currentCfg.channel = 'auto';
  }
  if (preset) {
    currentCfg.preset = preset;
  } else if (!currentCfg.preset) {
    currentCfg.preset = 'high-contrast';
  }
  if (darkPreset) {
    currentCfg.darkPreset = darkPreset;
  } else if (!currentCfg.darkPreset) {
    currentCfg.darkPreset = 'onyx';
  }
  if (!currentCfg.modules || typeof currentCfg.modules !== 'object' || Array.isArray(currentCfg.modules)) {
    currentCfg.modules = {};
  }
  for (const modKey of [
    'i18n',
    'metrics',
    'tokenAnalytics',
    'composerWaxSeal',
    'deadlockHealer',
    'coldBootHealer',
    'zoomShortcuts',
    'cdpAutoRelaunch',
    'customCss'
  ]) {
    if (typeof currentCfg.modules[modKey] !== 'boolean') {
      currentCfg.modules[modKey] = true;
    }
  }
  delete currentCfg.modules.customJs;
  // 自动清理早期版本遗留在 user/config.json 中的出厂默认 selectors，确保后续升级由 core/runtime.js 统一托管
  if (currentCfg.selectors && typeof currentCfg.selectors === 'object') {
    if (currentCfg.selectors.inputBoxId === 'antigravity.agentSidePanelInputBox') {
      delete currentCfg.selectors;
    } else if (
      typeof currentCfg.selectors.excludeI18n === 'string' &&
      (!currentCfg.selectors.excludeI18n.includes('.monaco-editor') ||
        (currentCfg.selectors.excludeI18n.startsWith('code, pre, kbd, samp') &&
          !currentCfg.selectors.excludeI18n.includes('[data-markdown-root]')))
    ) {
      delete currentCfg.selectors.excludeI18n;
      if (Object.keys(currentCfg.selectors).length === 0) {
        delete currentCfg.selectors;
      }
    }
  }
  if (canWriteUserCfg) {
    writePrivateFileSync(userConfigPath, JSON.stringify(currentCfg, null, 2) + '\n', 'utf8', 0o600);
  }
  tightenPermissions(targetDir);

  const realDaemon = path.join(targetCore, 'daemon.mjs');
  let argvStatus = { skipped: true, reason: 'custom-target-dir' };
  let launcherStatus = { skipped: true, reason: 'custom-target-dir' };
  let serviceInfo = { skipped: true, reason: 'custom-target-dir' };

  if (!isCustomSandboxTarget) {
    // 自动检查并修补 ~/.antigravity/argv.json (兼容 1.x) 与 macOS 单图标模式 / 可选启动器 (2.33.0+)
    argvStatus = ensureArgvRemoteDebugging(currentCfg.channel);
    launcherStatus = ensureCdpLaunchers(currentCfg.channel, { withLauncher: hasFlag('--with-launcher') });

    // 创建兼容包装脚本 ~/.gemini/antigravity/scripts/antigravity-font-daemon.mjs
    const scriptsDir = path.join(os.homedir(), '.gemini', 'antigravity', 'scripts');
    fs.mkdirSync(scriptsDir, { recursive: true, mode: 0o700 });
    try {
      fs.chmodSync(scriptsDir, 0o700);
    } catch {}
    const wrapperDaemon = path.join(scriptsDir, 'antigravity-font-daemon.mjs');
    const realDaemonUrl = pathToFileURL(realDaemon).href;
    writePrivateFileSync(
      wrapperDaemon,
      `#!/usr/bin/env node\n// Auto-generated wrapper -> ${realDaemon}\nawait import(${JSON.stringify(realDaemonUrl)});\n`,
      'utf8',
      0o700
    );

    if (noService) {
      // 无常驻服务模式：卸载已有 LaunchAgent 并停止旧常驻守护进程，按需手动运行
      removeSystemService();
      stopRunningDaemonProcesses();
      serviceInfo = {
        skipped: true,
        reason: 'no-service-flag',
        manualStartCommand: `node ${JSON.stringify(realDaemon)}`,
        manualOnceCommand: `node ${JSON.stringify(realDaemon)} --once`
      };
    } else {
      // 注册/更新 macOS LaunchAgent 自启服务
      serviceInfo = registerSystemService(wrapperDaemon, targetDir);
    }

    // 立即执行一次 --once 同步注入
    spawnSync(process.execPath, ['--disable-warning=ExperimentalWarning', realDaemon, '--once'], {
      stdio: 'inherit'
    });
  }

  const postEnv = isCustomSandboxTarget ? env : await detectEnvironment(currentCfg.channel);
  const live = isCustomSandboxTarget ? { skipped: true, reason: 'custom-target-dir' } : await inspectLiveWindow(postEnv);
  const needsCdpRelaunch =
    !isCustomSandboxTarget && !live.reachable && postEnv.cdpStatus === 'missing_opt_in_flag';
  console.log(
    '\n[Install Complete]',
    JSON.stringify(
      {
        ok: true,
        targetDir,
        backupCreated,
        userSynced: syncUser,
        userBackupCreated,
        argvStatus,
        launcherStatus,
        serviceInfo,
        config: currentCfg,
        cdpStatus: isCustomSandboxTarget ? 'sandbox' : live.reachable ? 'ready' : postEnv.cdpStatus,
        relaunchHint: needsCdpRelaunch
          ? `Antigravity (${postEnv.appVersion || '2.33.0+'}) is currently running without --remote-debugging-port. When idle, run: node ${JSON.stringify(path.join(targetDir, 'install.mjs'))} relaunch`
          : null,
        liveWindow: live
      },
      null,
      2
    )
  );
}

function hasRecentActiveConversationWal(channel = 'auto', windowSec = 15) {
  const home = os.homedir();
  const dirs = [];
  if (channel !== 'insiders') dirs.push(path.join(home, '.gemini', 'antigravity', 'conversations'));
  if (channel !== 'stable') dirs.push(path.join(home, '.gemini', 'antigravity-insiders', 'conversations'));
  const now = Date.now();
  const windowMs = windowSec * 1000;
  const activeFiles = [];
  for (const dir of dirs) {
    try {
      if (!fs.existsSync(dir)) continue;
      for (const name of fs.readdirSync(dir)) {
        if (!name.endsWith('.db-wal')) continue;
        const full = path.join(dir, name);
        const st = fs.statSync(full, { throwIfNoEntry: false });
        if (st && st.size > 4096 && now - st.mtimeMs < windowMs) {
          activeFiles.push({ file: name, ageMs: Math.round(now - st.mtimeMs), bytes: st.size });
        }
      }
    } catch {}
  }
  return activeFiles;
}

function isPidRunning(pid) {
  if (!pid || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (err) {
    return Boolean(err && err.code === 'EPERM');
  }
}

async function runRelaunch() {
  const channel = getArg('--channel', 'auto');
  const force = hasFlag('--force');
  const targetDir = path.resolve(getArg('--target-dir', resolveDefaultTargetDir()));
  const daemonPath = path.join(targetDir, 'core', 'daemon.mjs');

  if (!force) {
    const activeWals = hasRecentActiveConversationWal(channel, 15);
    if (activeWals.length > 0) {
      console.error(
        JSON.stringify(
          {
            ok: false,
            reason: 'active_conversation_detected',
            activeWals,
            hint: 'An Agent conversation updated its WAL within the last 15s. Wait until the turn finishes, or pass --force to relaunch anyway.'
          },
          null,
          2
        )
      );
      process.exit(2);
    }
  }

  const hostBefore = readHostVersionAndProcesses(channel);
  const procsToStop = hostBefore.runningProcesses;
  const home = os.homedir();

  // 写入防重入冷却锁，告知后台守护进程 M2 本次为主动接力重启
  const guardFile = path.join(os.tmpdir(), 'ag-cdp-relaunch-guard.json');
  try {
    const prevGuard = fs.existsSync(guardFile) ? JSON.parse(fs.readFileSync(guardFile, 'utf8')) : {};
    const prevHandled = Array.isArray(prevGuard.handledPids) ? prevGuard.handledPids : [];
    writePrivateFileSync(
      guardFile,
      JSON.stringify(
        {
          lastRelaunchAtMs: Date.now(),
          lastChannel: channel,
          reason: 'manual-cli-relaunch',
          handledPids: Array.from(new Set([...prevHandled.slice(-15), ...procsToStop.map((p) => p.pid)]))
        },
        null,
        2
      ) + '\n',
      'utf8',
      0o600
    );
  } catch {}

  let launchTarget = procsToStop[0] || null;
  if (!launchTarget) {
    const appPath =
      channel === 'insiders'
        ? ['/Applications/Antigravity - Insiders.app', path.join(home, 'Applications/Antigravity - Insiders.app')].find(
            (p) => fs.existsSync(p)
          ) || '/Applications/Antigravity - Insiders.app'
        : ['/Applications/Antigravity.app', path.join(home, 'Applications/Antigravity.app')].find((p) =>
            fs.existsSync(p)
          ) || '/Applications/Antigravity.app';
    launchTarget = { channel: channel === 'insiders' ? 'insiders' : 'stable', appPath };
  }

  for (const p of procsToStop) {
    if (p.appPath) {
      spawnSync('osascript', ['-e', `tell application "${p.appPath}" to quit`], { stdio: 'ignore', timeout: 3000 });
      for (let i = 0; i < 25 && isPidRunning(p.pid); i++) sleepSync(100);
    }
    if (isPidRunning(p.pid)) {
      try {
        process.kill(p.pid, 'SIGTERM');
      } catch {}
      for (let i = 0; i < 35 && isPidRunning(p.pid); i++) sleepSync(100);
    }
    if (isPidRunning(p.pid)) {
      try {
        process.kill(p.pid, 'SIGKILL');
      } catch {}
      for (let i = 0; i < 15 && isPidRunning(p.pid); i++) sleepSync(80);
    }
  }

  // 确保 Electron SingletonLock 完全释放后再启动带 --remote-debugging-port=0 的新宿主实例
  sleepSync(250);

  if (launchTarget.appPath && fs.existsSync(launchTarget.appPath)) {
    spawnSync('/usr/bin/open', ['-a', launchTarget.appPath, '--args', '--remote-debugging-port=0'], {
      stdio: 'ignore',
      timeout: 5000
    });
  } else {
    console.error(JSON.stringify({ ok: false, reason: 'app_not_found', appPath: launchTarget.appPath || null }, null, 2));
    process.exit(1);
  }

  let live = { reachable: false };
  for (let i = 0; i < 30; i++) {
    sleepSync(500);
    const curEnv = await detectEnvironment(launchTarget.channel || channel);
    const targetChInfo = curEnv.channels?.[launchTarget.channel || 'stable'];
    if (targetChInfo && !targetChInfo.portFileExists) continue;
    if (fs.existsSync(daemonPath)) {
      spawnSync(process.execPath, ['--disable-warning=ExperimentalWarning', daemonPath, '--once'], {
        stdio: 'ignore'
      });
    }
    live = await inspectLiveWindow(curEnv);
    if (live.reachable && live.state?.hasStyle) break;
  }

  const ok = Boolean(live.reachable && live.state?.hasStyle);
  console.log(
    JSON.stringify(
      {
        ok,
        stoppedPids: procsToStop.map((p) => p.pid),
        version: live.state?.version || null,
        themeStyle: Boolean(live.state?.hasStyle),
        dictCount: live.state?.dictCount || 0,
        pillMounted: Boolean(live.state?.pillMounted),
        live
      },
      null,
      2
    )
  );
  if (!ok) process.exit(1);
}

async function runVerify() {
  const safeMode = hasFlag('--safe-mode');
  const channel = getArg('--channel', 'auto');
  const targetDir = path.resolve(getArg('--target-dir', resolveDefaultTargetDir()));
  const daemonPath = path.join(targetDir, 'core', 'daemon.mjs');

  const daemonArgs = ['--disable-warning=ExperimentalWarning', daemonPath, '--once'];
  if (safeMode) daemonArgs.push('--safe-mode');
  if (channel && channel !== 'auto') daemonArgs.push('--channel', channel);

  spawnSync(process.execPath, daemonArgs, { stdio: 'inherit' });
  const env = await detectEnvironment(channel);
  const live = await inspectLiveWindow(env);
  const ok = Boolean(live.reachable && (live.state?.hasStyle || live.pages === 0));
  console.log(
    JSON.stringify(
      {
        ok,
        version: live.state?.version || null,
        themeStyle: Boolean(live.state?.hasStyle),
        safeMode,
        channel,
        live
      },
      null,
      2
    )
  );
}

async function runRollback() {
  const defaultTarget = resolveGlobalInstallDir();
  const targetDir = path.resolve(getArg('--target-dir', resolveDefaultTargetDir()));
  const isCustomSandboxTarget =
    hasFlag('--target-dir') && !isSameTargetPath(targetDir, defaultTarget) && !hasFlag('--register-service');
  const targetCore = path.join(targetDir, 'core');
  const targetPrev = path.join(targetDir, 'core.prev');
  const backupsDir = path.join(targetDir, 'backups');

  const isValidCoreBackup = (dir) =>
    fs.existsSync(path.join(dir, 'daemon.mjs')) && fs.existsSync(path.join(dir, 'runtime.js'));

  let restoreSource = null;
  if (isValidCoreBackup(targetPrev)) {
    restoreSource = targetPrev;
  } else if (fs.existsSync(backupsDir)) {
    const stamps = fs
      .readdirSync(backupsDir)
      .filter((name) => !name.endsWith('-user') && isValidCoreBackup(path.join(backupsDir, name)))
      .sort()
      .reverse();
    if (stamps.length > 0) {
      restoreSource = path.join(backupsDir, stamps[0]);
    }
  }

  if (!restoreSource) {
    console.error(`[ERROR] No valid core backup found at ${targetPrev} or ${backupsDir}`);
    process.exit(1);
  }

  fs.rmSync(targetCore, { recursive: true, force: true });
  copyDirRecursive(restoreSource, targetCore);
  tightenPermissions(targetCore);

  // 重启守护进程并立即执行一次 --once 重新注入（沙箱 --target-dir 隔离模式下跳过全局服务干预）
  const realDaemon = path.join(targetCore, 'daemon.mjs');
  if (!isCustomSandboxTarget) {
    const uid = process.getuid ? process.getuid() : 501;
    try {
      execSync(`launchctl kickstart -k gui/${uid}/com.antigravity.customfont 2>/dev/null || launchctl kickstart -k gui/${uid}/com.antigravity.theme 2>/dev/null || true`);
    } catch {}
    spawnSync(process.execPath, ['--disable-warning=ExperimentalWarning', realDaemon, '--once'], {
      stdio: 'inherit'
    });
  }

  const env = await detectEnvironment('auto');
  const live = isCustomSandboxTarget ? { skipped: true, reason: 'custom-target-dir' } : await inspectLiveWindow(env);
  console.log(
    JSON.stringify(
      {
        ok: true,
        restoredFrom: restoreSource,
        restoredTo: targetCore,
        live
      },
      null,
      2
    )
  );
}

function runInstallFonts() {
  const fromDir = getArg('--from', null);
  if (!fromDir || !fs.existsSync(fromDir)) {
    console.error('Usage: node install.mjs install-fonts --from <font-folder-path>');
    process.exit(1);
  }
  const home = os.homedir();
  const destDir = path.join(home, 'Library', 'Fonts');

  fs.mkdirSync(destDir, { recursive: true });
  const installed = [];
  const skipped = [];

  const walkFonts = (dir) => {
    for (const entry of fs.readdirSync(dir)) {
      const full = path.join(dir, entry);
      const st = fs.statSync(full);
      if (st.isDirectory()) {
        walkFonts(full);
      } else if (/\.(ttf|otf|ttc)$/i.test(entry)) {
        const destPath = path.join(destDir, entry);
        if (isSameTargetPath(full, destPath)) {
          skipped.push(destPath);
        } else {
          fs.copyFileSync(full, destPath);
          installed.push(destPath);
        }
      }
    }
  };

  walkFonts(path.resolve(fromDir));
  console.log(
    JSON.stringify(
      {
        ok: true,
        platform: 'darwin',
        destDir,
        installedCount: installed.length,
        skippedCount: skipped.length,
        installed,
        skipped
      },
      null,
      2
    )
  );
}

async function runUninstall() {
  const home = os.homedir();
  const defaultTarget = resolveGlobalInstallDir();
  const targetDir = path.resolve(getArg('--target-dir', resolveDefaultTargetDir()));
  const isCustomSandboxTarget =
    hasFlag('--target-dir') && !isSameTargetPath(targetDir, defaultTarget) && !hasFlag('--register-service');
  const userConfigPath = path.join(targetDir, 'user', 'config.json');
  const realDaemon = path.join(targetDir, 'core', 'daemon.mjs');

  if (isCustomSandboxTarget) {
    const localCacheDir = path.join(targetDir, '.cache');
    try {
      if (fs.existsSync(localCacheDir)) fs.rmSync(localCacheDir, { recursive: true, force: true });
    } catch {}
    console.log(`[Uninstall] Cleaned custom sandbox target (${targetDir}); global daemon and services were left untouched.`);
    return;
  }

  // 1. 先移除 macOS LaunchAgent 开机自启服务（防止 KeepAlive 自动拉起），再彻底终止残留后台守护进程，消除与 --once 还原注入的并发竞态
  removeSystemService();
  stopRunningDaemonProcesses();
  removeCdpLaunchers();
  try {
    const cacheDir = path.join(targetDir, '.cache');
    if (fs.existsSync(cacheDir)) fs.rmSync(cacheDir, { recursive: true, force: true });
  } catch {}

  // 2. 在无后台守护进程干扰的纯净状态下，向打开的窗口发送一次禁用还原载荷，即时卸载样式并恢复英文原貌
  if (fs.existsSync(userConfigPath) && fs.existsSync(realDaemon)) {
    try {
      const origRaw = fs.readFileSync(userConfigPath, 'utf8');
      const cfg = JSON.parse(origRaw.replace(/^\uFEFF/, ''));
      cfg.enabled = false;
      writePrivateFileSync(userConfigPath, JSON.stringify(cfg, null, 2) + '\n', 'utf8', 0o600);
      spawnSync(process.execPath, ['--disable-warning=ExperimentalWarning', realDaemon, '--once'], {
        stdio: 'ignore'
      });
      writePrivateFileSync(userConfigPath, origRaw, 'utf8', 0o600);
    } catch {}
  }
  console.log('[Uninstall] Stopped daemon, removed LaunchAgent & CDP launchers, and unloaded live styles. User config in ~/.gemini/antigravity/theme-patch/user/ is preserved.');
}

function assertMacOS() {
  if (process.platform !== 'darwin') {
    console.error(`[ERROR] This project only supports macOS (darwin). Current platform: ${process.platform}`);
    process.exit(1);
  }
}

// ============================================================================
// 4. 路由分发
// ============================================================================
switch (subcommand) {
  case 'build-manifest': {
    const m = buildManifest(__dirname);
    console.log('Built core/manifest.json:', m.version, 'files:', Object.keys(m.files).length);
    break;
  }
  case 'pack': {
    const packed = buildDistZip(__dirname);
    console.log('Packed & verified dist archive:', packed.zipPath, `(verified ${packed.filesVerified} core files)`);
    break;
  }
  case 'doctor':
    assertMacOS();
    await runDoctor();
    break;
  case 'install':
    assertMacOS();
    await runInstall();
    break;
  case 'relaunch':
    assertMacOS();
    await runRelaunch();
    break;
  case 'install-fonts':
    assertMacOS();
    runInstallFonts();
    break;
  case 'verify':
    assertMacOS();
    await runVerify();
    break;
  case 'rollback':
    assertMacOS();
    await runRollback();
    break;
  case 'uninstall':
    assertMacOS();
    await runUninstall();
    break;
  default:
    console.log(`Usage (macOS only):
  node install.mjs install       [--channel auto|stable|insiders] [--preset high-contrast|claude-desktop-purewhite|vintage-deep] [--dark-preset onyx|claude-warm] [--sync-user] [--with-launcher] [--no-service]
  node install.mjs relaunch      [--channel auto|stable|insiders] [--force]
  node install.mjs install-fonts --from <font-folder-path>
  node install.mjs doctor        [--channel auto|stable|insiders]
  node install.mjs verify        [--safe-mode] [--channel auto|stable|insiders]
  node install.mjs rollback
  node install.mjs uninstall
  node install.mjs build-manifest
  node install.mjs pack`);
    break;
}
