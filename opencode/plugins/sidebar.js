// src/components/context-progress.tsx
import {
  createContext,
  createMemo as createMemo2,
  createSignal as createSignal2,
  onCleanup as onCleanup2,
  onMount as onMount2,
  useContext,
  Show as Show3
} from "solid-js";

// src/components/progress-bar.tsx
import { Show } from "solid-js";

// src/util/theme.ts
function pickProgressColor(ratio, theme) {
  if (ratio >= 0.9)
    return theme.error;
  if (ratio >= 0.8)
    return theme.warning;
  return theme.primary;
}
var FIXED_CACHE_COLORS = {
  blue: "#38bdf8",
  purple: "#c084fc",
  green: "#4ade80",
  yellow: "#facc15",
  orange: "#fb923c",
  gray: "#9ca3af"
};
function pickCacheColor(pct) {
  if (pct >= 100)
    return FIXED_CACHE_COLORS.blue;
  if (pct >= 95)
    return FIXED_CACHE_COLORS.purple;
  if (pct >= 90)
    return FIXED_CACHE_COLORS.green;
  if (pct >= 85)
    return FIXED_CACHE_COLORS.yellow;
  if (pct >= 50)
    return FIXED_CACHE_COLORS.orange;
  return FIXED_CACHE_COLORS.gray;
}

// src/components/progress-bar.tsx
import { jsxDEV } from "@opentui/solid/jsx-dev-runtime";
function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}
function hex(color) {
  const r = clamp(Math.round(color.r * 255), 0, 255);
  const g = clamp(Math.round(color.g * 255), 0, 255);
  const b = clamp(Math.round(color.b * 255), 0, 255);
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}
function ProgressBar(props) {
  const ratio = () => clamp(props.ratio, 0, 1);
  const trackColor = () => hex(props.palette.borderSubtle);
  const barColor = () => hex(props.color ?? pickProgressColor(ratio(), props.palette));
  const filledPct = () => clamp(Math.round(ratio() * 100), 0, 100);
  const emptyPct = () => Math.max(0, 100 - filledPct());
  return /* @__PURE__ */ jsxDEV("box", {
    flexDirection: "row",
    width: "100%",
    height: 1,
    overflow: "hidden",
    children: [
      /* @__PURE__ */ jsxDEV(Show, {
        when: filledPct() > 0,
        children: /* @__PURE__ */ jsxDEV("box", {
          width: `${filledPct()}%`,
          height: 1,
          backgroundColor: barColor()
        }, undefined, false, undefined, this)
      }, undefined, false, undefined, this),
      /* @__PURE__ */ jsxDEV(Show, {
        when: emptyPct() > 0,
        children: /* @__PURE__ */ jsxDEV("box", {
          flexGrow: 1,
          height: 1,
          overflow: "hidden",
          children: /* @__PURE__ */ jsxDEV("text", {
            style: { fg: trackColor() },
            children: "─".repeat(120)
          }, undefined, false, undefined, this)
        }, undefined, false, undefined, this)
      }, undefined, false, undefined, this)
    ]
  }, undefined, true, undefined, this);
}

// src/components/git-status.tsx
import { createSignal, onCleanup, onMount, Show as Show2 } from "solid-js";

// src/util/git.ts
import { spawnSync } from "node:child_process";
function getGitStatus(cwd) {
  const workdir = cwd || process.cwd();
  try {
    const statusProc = spawnSync("git", ["status", "--porcelain=v2", "--branch", "-uall"], {
      cwd: workdir,
      encoding: "utf8",
      timeout: 3000,
      windowsHide: true,
      maxBuffer: 1024 * 1024 * 2
    });
    if (statusProc.status !== 0 || typeof statusProc.stdout !== "string") {
      return null;
    }
    const result = {
      ahead: 0,
      behind: 0,
      modified: 0,
      untracked: 0,
      staged: 0
    };
    const lines = statusProc.stdout.split(`
`);
    for (const line of lines) {
      if (!line)
        continue;
      if (line.startsWith("# branch.head ")) {
        const rawBranch = line.slice("# branch.head ".length).trim();
        result.branch = rawBranch === "(detached)" ? "detached" : rawBranch;
      } else if (line.startsWith("# branch.ab ")) {
        const parts = line.slice("# branch.ab ".length).trim().split(" ");
        for (const p of parts) {
          if (p.startsWith("+"))
            result.ahead = parseInt(p.slice(1), 10) || 0;
          if (p.startsWith("-"))
            result.behind = parseInt(p.slice(1), 10) || 0;
        }
      } else if (line.startsWith("1 ") || line.startsWith("2 ")) {
        const xy = line.slice(2, 4);
        if (xy[0] !== ".")
          result.staged++;
        if (xy[1] !== ".")
          result.modified++;
      } else if (line.startsWith("? ") || line.startsWith("?")) {
        result.untracked++;
      } else if (line.startsWith("u ")) {
        result.modified++;
      }
    }
    return result;
  } catch {
    return null;
  }
}

// src/components/git-status.tsx
import { jsxDEV as jsxDEV2 } from "@opentui/solid/jsx-dev-runtime";
function GitStatusBadge(props) {
  const getCwd = () => props.api.state.path.directory || props.api.state.path.worktree || process.cwd();
  const initialBranch = props.api.state.vcs?.branch;
  const [status, setStatus] = createSignal({
    branch: initialBranch,
    ahead: 0,
    behind: 0,
    modified: 0,
    untracked: 0,
    staged: 0
  });
  const refresh = () => {
    const cwd = getCwd();
    const s = getGitStatus(cwd);
    if (s) {
      setStatus({
        ...s,
        branch: s.branch || props.api.state.vcs?.branch || status().branch
      });
    }
  };
  onMount(() => {
    refresh();
    const id = setInterval(refresh, 3000);
    onCleanup(() => clearInterval(id));
  });
  const off1 = props.api.event.on("message.updated", refresh);
  const off2 = props.api.event.on("message.part.updated", refresh);
  const off3 = props.api.event.on("session.status", refresh);
  onCleanup(() => {
    off1();
    off2();
    off3();
  });
  const theme = () => props.api.theme.current;
  const muted = () => hex(theme().textMuted);
  return /* @__PURE__ */ jsxDEV2(Show2, {
    when: status().branch,
    children: /* @__PURE__ */ jsxDEV2("box", {
      flexDirection: "row",
      justifyContent: "space-between",
      children: [
        /* @__PURE__ */ jsxDEV2("text", {
          children: [
            /* @__PURE__ */ jsxDEV2("span", {
              style: { fg: hex(theme().primary) },
              children: " "
            }, undefined, false, undefined, this),
            /* @__PURE__ */ jsxDEV2("span", {
              style: { fg: hex(theme().text) },
              children: status().branch
            }, undefined, false, undefined, this)
          ]
        }, undefined, true, undefined, this),
        /* @__PURE__ */ jsxDEV2("text", {
          children: [
            /* @__PURE__ */ jsxDEV2(Show2, {
              when: status().ahead > 0,
              children: [
                /* @__PURE__ */ jsxDEV2("span", {
                  style: { fg: "#38bdf8" },
                  children: [
                    "↑",
                    status().ahead
                  ]
                }, undefined, true, undefined, this),
                " "
              ]
            }, undefined, true, undefined, this),
            /* @__PURE__ */ jsxDEV2(Show2, {
              when: status().behind > 0,
              children: [
                /* @__PURE__ */ jsxDEV2("span", {
                  style: { fg: "#fb923c" },
                  children: [
                    "↓",
                    status().behind
                  ]
                }, undefined, true, undefined, this),
                " "
              ]
            }, undefined, true, undefined, this),
            /* @__PURE__ */ jsxDEV2(Show2, {
              when: status().modified + status().staged + status().untracked > 0,
              children: /* @__PURE__ */ jsxDEV2("span", {
                style: { fg: hex(theme().warning) },
                children: [
                  "● ",
                  status().modified + status().staged + status().untracked
                ]
              }, undefined, true, undefined, this)
            }, undefined, false, undefined, this)
          ]
        }, undefined, true, undefined, this)
      ]
    }, undefined, true, undefined, this)
  }, undefined, false, undefined, this);
}

// src/components/divider.tsx
import { jsxDEV as jsxDEV3 } from "@opentui/solid/jsx-dev-runtime";
function SidebarDivider() {
  return /* @__PURE__ */ jsxDEV3("box", {
    height: 1
  }, undefined, false, undefined, this);
}

// src/util/tokens.ts
function isAssistantMessage(msg) {
  return msg.role === "assistant" && "tokens" in msg;
}
function lastTurnTokens(messages) {
  for (let i = messages.length - 1;i >= 0; i--) {
    const msg = messages[i];
    if (!msg || !isAssistantMessage(msg))
      continue;
    const tokens = msg.tokens;
    const input = tokens.input ?? 0;
    const cacheRead = tokens.cache?.read ?? 0;
    const cacheWrite = tokens.cache?.write ?? 0;
    const used = input + cacheRead + cacheWrite;
    if (used > 0) {
      const output = tokens.output ?? 0;
      const reasoning = tokens.reasoning ?? 0;
      const cost = typeof msg.cost === "number" ? msg.cost : 0;
      const model = typeof msg.providerID === "string" && typeof msg.modelID === "string" ? { providerID: msg.providerID, modelID: msg.modelID } : undefined;
      return {
        tokens: {
          used,
          input,
          output,
          reasoning,
          cacheRead,
          cacheWrite,
          totalCost: cost
        },
        model
      };
    }
  }
  for (let i = messages.length - 1;i >= 0; i--) {
    const msg = messages[i];
    if (!msg || !isAssistantMessage(msg))
      continue;
    const model = typeof msg.providerID === "string" && typeof msg.modelID === "string" ? { providerID: msg.providerID, modelID: msg.modelID } : undefined;
    return {
      tokens: {
        used: 0,
        input: 0,
        output: 0,
        reasoning: 0,
        cacheRead: 0,
        cacheWrite: 0,
        totalCost: 0
      },
      model
    };
  }
  return null;
}
function formatTokens(n) {
  if (n < 1000)
    return String(n);
  if (n < 1e6)
    return `${(n / 1000).toFixed(n < 1e4 ? 1 : 0)}k`;
  return `${(n / 1e6).toFixed(1)}M`;
}

// src/components/context-progress.tsx
import { jsxDEV as jsxDEV4 } from "@opentui/solid/jsx-dev-runtime";
var DEFAULT_CONTEXT = 200000;
var SPINNER_FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
var SPINNER_INTERVAL_MS = 80;
function lookupLimit(api, ref) {
  if (!ref)
    return;
  const provider = api.state.provider.find((p) => p.id === ref.providerID);
  const limit = provider?.models[ref.modelID]?.limit.context;
  return typeof limit === "number" ? limit : undefined;
}
function resolveContextLimit(api, fallback, model) {
  const fromTurn = lookupLimit(api, model);
  if (fromTurn)
    return fromTurn;
  const cfg = api.state.config;
  const configured = typeof cfg.model === "string" ? cfg.model : undefined;
  if (configured) {
    const slash = configured.indexOf("/");
    if (slash > 0 && slash < configured.length - 1) {
      const ref = { providerID: configured.slice(0, slash), modelID: configured.slice(slash + 1) };
      const fromConfig = lookupLimit(api, ref);
      if (fromConfig)
        return fromConfig;
    }
  }
  return fallback;
}
var ApiContext = createContext();
function ApiProvider(props) {
  return /* @__PURE__ */ jsxDEV4(ApiContext.Provider, {
    value: props.api,
    children: props.children
  }, undefined, false, undefined, this);
}
function paletteFromTheme(api) {
  const t = api.theme.current;
  return {
    primary: t.primary,
    secondary: t.secondary,
    accent: t.accent,
    success: t.success,
    warning: t.warning,
    error: t.error,
    info: t.info,
    text: t.text,
    textMuted: t.textMuted,
    background: t.background,
    backgroundPanel: t.backgroundPanel,
    borderSubtle: t.borderSubtle
  };
}
function ContextProgress(props) {
  const api = useContext(ApiContext);
  if (!api)
    throw new Error("ContextProgress must be used inside <ApiProvider>");
  const fallback = DEFAULT_CONTEXT;
  const [tick, setTick] = createSignal2(0);
  const [spinnerIdx, setSpinnerIdx] = createSignal2(0);
  const bump = () => setTick((n) => n + 1);
  const off1 = api.event.on("message.updated", bump);
  const off2 = api.event.on("message.part.updated", bump);
  const off3 = api.event.on("session.status", bump);
  onCleanup2(() => {
    off1();
    off2();
    off3();
  });
  onMount2(() => {
    const id = setInterval(() => setSpinnerIdx((i) => (i + 1) % SPINNER_FRAMES.length), SPINNER_INTERVAL_MS);
    onCleanup2(() => clearInterval(id));
  });
  const turn = createMemo2(() => {
    tick();
    const msgs = api.state.session.messages(props.session_id);
    return lastTurnTokens(msgs);
  });
  const limit = createMemo2(() => {
    tick();
    return resolveContextLimit(api, fallback, turn()?.model);
  });
  const ratio = createMemo2(() => {
    const t = turn();
    const l = limit();
    if (!t || t.tokens.used <= 0 || !l)
      return 0;
    return t.tokens.used / l;
  });
  const busy = createMemo2(() => {
    tick();
    return api.state.session.status(props.session_id)?.type === "busy";
  });
  const activeStatus = createMemo2(() => {
    if (!busy())
      return;
    tick();
    const msgs = api.state.session.messages(props.session_id);
    const latest = msgs[msgs.length - 1];
    if (!latest)
      return;
    const parts = api.state.part(latest.id);
    if (!parts || parts.length === 0)
      return;
    for (let i = parts.length - 1;i >= 0; i--) {
      const p = parts[i];
      if (!p)
        continue;
      if (p.type === "tool") {
        const toolPart = p;
        if (toolPart.state.status === "running" || toolPart.state.status === "pending") {
          return toolPart.tool;
        }
      }
      if (p.type === "reasoning" && !p.time?.end) {
        return "thinking";
      }
    }
    return;
  });
  const muted = () => api.theme.current.textMuted;
  const pct = () => `${Math.round(ratio() * 100)}%`;
  return /* @__PURE__ */ jsxDEV4(Show3, {
    when: turn(),
    children: (() => {
      const tokens = turn().tokens;
      const used = tokens.used;
      const totalCache = tokens.cacheRead + tokens.cacheWrite;
      const cachePct = used > 0 ? Math.round(totalCache / used * 100) : 0;
      return /* @__PURE__ */ jsxDEV4("box", {
        flexDirection: "column",
        children: [
          /* @__PURE__ */ jsxDEV4(GitStatusBadge, {
            api
          }, undefined, false, undefined, this),
          /* @__PURE__ */ jsxDEV4(SidebarDivider, {}, undefined, false, undefined, this),
          /* @__PURE__ */ jsxDEV4("box", {
            flexDirection: "row",
            justifyContent: "space-between",
            children: [
              /* @__PURE__ */ jsxDEV4("text", {
                children: [
                  used > 0 ? formatTokens(used) : "—",
                  /* @__PURE__ */ jsxDEV4("span", {
                    style: { fg: muted() },
                    children: " / "
                  }, undefined, false, undefined, this),
                  formatTokens(limit())
                ]
              }, undefined, true, undefined, this),
              /* @__PURE__ */ jsxDEV4("text", {
                children: [
                  used > 0 ? pct() : "0%",
                  /* @__PURE__ */ jsxDEV4(Show3, {
                    when: busy(),
                    children: [
                      " ",
                      /* @__PURE__ */ jsxDEV4(Show3, {
                        when: activeStatus(),
                        children: /* @__PURE__ */ jsxDEV4("span", {
                          style: { fg: muted() },
                          children: [
                            activeStatus(),
                            " "
                          ]
                        }, undefined, true, undefined, this)
                      }, undefined, false, undefined, this),
                      /* @__PURE__ */ jsxDEV4("span", {
                        style: { fg: hex(api.theme.current.primary) },
                        children: SPINNER_FRAMES[spinnerIdx()]
                      }, undefined, false, undefined, this)
                    ]
                  }, undefined, true, undefined, this)
                ]
              }, undefined, true, undefined, this)
            ]
          }, undefined, true, undefined, this),
          /* @__PURE__ */ jsxDEV4("box", {
            flexDirection: "row",
            children: /* @__PURE__ */ jsxDEV4(ProgressBar, {
              ratio: ratio(),
              palette: paletteFromTheme(api)
            }, undefined, false, undefined, this)
          }, undefined, false, undefined, this),
          /* @__PURE__ */ jsxDEV4(Show3, {
            when: used > 0,
            children: /* @__PURE__ */ jsxDEV4("box", {
              flexDirection: "row",
              justifyContent: "space-between",
              children: [
                /* @__PURE__ */ jsxDEV4("text", {
                  children: [
                    /* @__PURE__ */ jsxDEV4("span", {
                      style: { fg: muted() },
                      children: "cached "
                    }, undefined, false, undefined, this),
                    /* @__PURE__ */ jsxDEV4("span", {
                      style: { fg: pickCacheColor(cachePct) },
                      children: [
                        cachePct,
                        "%"
                      ]
                    }, undefined, true, undefined, this)
                  ]
                }, undefined, true, undefined, this),
                /* @__PURE__ */ jsxDEV4("text", {
                  children: [
                    /* @__PURE__ */ jsxDEV4("span", {
                      style: { fg: muted() },
                      children: "delta "
                    }, undefined, false, undefined, this),
                    /* @__PURE__ */ jsxDEV4("span", {
                      children: formatTokens(tokens.input)
                    }, undefined, false, undefined, this)
                  ]
                }, undefined, true, undefined, this)
              ]
            }, undefined, true, undefined, this)
          }, undefined, false, undefined, this)
        ]
      }, undefined, true, undefined, this);
    })()
  }, undefined, false, undefined, this);
}

// src/extensions/context-progress.tsx
import { jsxDEV as jsxDEV5 } from "@opentui/solid/jsx-dev-runtime";
function registerContextProgress(api) {
  return api.slots.register({
    slots: {
      sidebar_footer: (_ctx, props) => /* @__PURE__ */ jsxDEV5(ApiProvider, {
        api,
        children: /* @__PURE__ */ jsxDEV5(ContextProgress, {
          session_id: props.session_id
        }, undefined, false, undefined, this)
      }, undefined, false, undefined, this)
    }
  });
}

// src/index.ts
var SidebarPlugin = async (api, _options, _meta) => {
  registerContextProgress(api);
  api.lifecycle.onDispose(() => {});
};
var SidebarPluginModule = {
  id: "opencode-plugin-sidebar",
  tui: SidebarPlugin
};
var src_default = SidebarPluginModule;
export {
  SidebarPluginModule,
  src_default as default
};
