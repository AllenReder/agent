/**
 * bark-notify — 让 Pi 在本机的 Claude Code / Codex hook 一样通过 Bark 推送通知。
 *
 * 对应关系（Claude Code / Codex -> Pi）：
 *   PermissionRequest / 需要审批  -> ui_prompt_start   需要你交互（timeSensitive，打扰免打扰）
 *   Stop（本轮结束）              -> agent_settled     本轮回复已结束，等待你输入（active）
 *
 * 只在交互模式生效，避免 `pi -p`、subagent 子进程、后台任务疯狂推送。两道独立的闸门：
 *   1. ctx.mode 必须在 MODES 里（默认只有 tui）—— 子会话 bindExtensions 时 mode 固定是 "print"，
 *      所以前台/进程内子代理、后台 runner、`pi -p`、`--mode rpc|json` 全部落在闸门外。
 *   2. IS_SUBAGENT_CHILD（PI_SUBAGENT_CHILD=1）—— pi-subagents 的子进程会带这个变量。
 *      进程内子会话不带它，但已被闸门 1 挡住；它保证把 PI_BARK_MODES 放宽到 rpc/print 时
 *      子代理依然不会推。
 * "需要交互" 只在 agent 正在跑的时候推送 —— 也就是模型/工具主动弹窗（ask_user_question、
 * 权限确认、plan 选择等都会走 ctx.ui），而你自己敲命令弹出的选择框不会推送。
 *
 * 环境变量：
 *   PI_BARK_NOTIFY=0            完全关闭
 *   PI_BARK_BIN=/path/to/bark   默认从 PATH 找 `bark`
 *   PI_BARK_GROUP=pi            推送分组
 *   PI_BARK_TITLE=Pi            标题前缀（标题为 "<前缀> @ <主机名>"）
 *   PI_BARK_ICON=https://…png   自定义图标，设为空串则用 Bark 默认图标。默认是官方 logo 转的
 *                              512×512 透明底 PNG（Bark 只认 JPG/PNG，SVG 不显示）：
 *                              https://cdn.jsdelivr.net/gh/AllenReder/AllenReder/assets/pi-icon.png
 *                              备选： https://raw.githubusercontent.com/AllenReder/AllenReder/main/assets/pi-icon.png
 *                              本地源文件：~/.pi/agent/pi-icon-transparent-512.png
 *   PI_BARK_MODES=tui,rpc       允许推送的运行模式（默认仅 tui）
 *
 * 依赖 `bark` 脚本自身的 BARK_SERVER / BARK_DEVICE_KEYS 环境变量，随 Pi 进程继承。
 * 自检：/bark-test
 */

import { execFile } from "node:child_process";
import { hostname } from "node:os";
import { basename } from "node:path";
import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";

type Level = "active" | "timeSensitive" | "critical" | "passive";

const ENABLED = process.env.PI_BARK_NOTIFY !== "0";
const BARK_BIN = process.env.PI_BARK_BIN ?? "bark";
const GROUP = process.env.PI_BARK_GROUP ?? "pi";
const ICON =
	process.env.PI_BARK_ICON ??
	"https://cdn.jsdelivr.net/gh/AllenReder/AllenReder/assets/pi-icon.png";
const TITLE = process.env.PI_BARK_TITLE ?? "Pi";
const MODES = new Set(
	(process.env.PI_BARK_MODES ?? "tui")
		.split(",")
		.map((mode) => mode.trim())
		.filter(Boolean),
);
const HOST = hostname().replace(/\.local$/, "");
/** pi-subagents 的子进程环境标记（见 pi-subagents/src/runs/background/subagent-runner.js）。 */
const IS_SUBAGENT_CHILD = process.env.PI_SUBAGENT_CHILD === "1";

/** 异步、fire-and-forget，绝不阻塞 agent，也绝不因为推送失败影响会话。 */
function push(body: string, level: Level, subtitle?: string): void {
	if (!ENABLED) return;
	const args = ["-t", `${TITLE} @ ${HOST}`, "-b", body, "-g", GROUP, "-l", level];
	if (subtitle) args.push("-s", subtitle);
	if (ICON) args.push("-i", ICON);
	try {
		const child = execFile(BARK_BIN, args, { stdio: "ignore", detached: true, timeout: 15_000 }, () => {});
		child.on("error", () => {});
		child.unref();
	} catch {
		// 通知失败不打扰会话
	}
}

export default function (pi: ExtensionAPI) {
	/** 正在执行的工具名，用来把弹窗归因到 ask_user_question 之类的工具。 */
	const runningTools = new Set<string>();
	/** 是否处于一次 agent run 中（agent_start -> agent_settled）。 */
	let runActive = false;
	/** 同一内容 2 秒内只推一次，避免嵌套弹窗/重复 settle 造成轰炸。 */
	let lastPush = { key: "", at: 0 };

	const allow = (ctx: ExtensionContext) =>
		ENABLED && !IS_SUBAGENT_CHILD && MODES.has(ctx.mode);

	const send = (ctx: ExtensionContext, body: string, level: Level) => {
		if (!allow(ctx)) return;
		const key = `${level}:${body}`;
		const now = Date.now();
		if (key === lastPush.key && now - lastPush.at < 2_000) return;
		lastPush = { key, at: now };
		push(body, level, basename(ctx.cwd) || undefined);
	};

	/** 会话分支里最后一条 assistant 消息的停止原因，用来过滤用户主动中断（Esc/Ctrl+C）。 */
	const lastStopReason = (ctx: ExtensionContext): string | undefined => {
		const branch = ctx.sessionManager.getBranch();
		for (let i = branch.length - 1; i >= 0; i--) {
			const entry = branch[i];
			if (entry.type !== "message") continue;
			const message = entry.message;
			if (message.role === "assistant") return message.stopReason;
		}
		return undefined;
	};

	pi.on("agent_start", () => {
		runActive = true;
	});

	pi.on("tool_execution_start", (event) => {
		runningTools.add(event.toolName);
	});

	pi.on("tool_execution_end", (event) => {
		runningTools.delete(event.toolName);
	});

	// 模型正在等着你点选/确认/回答：等价于 Claude Code 的 PermissionRequest
	pi.on("ui_prompt_start", (event, ctx) => {
		if (!runActive) return;
		const tool = [...runningTools].pop();
		const what = event.title || tool || event.kind;
		send(ctx, `需要你交互：${what}（${event.kind}）`, "timeSensitive");
	});

	// 一次 run 彻底结束、不会再自动继续：等价于 Claude Code 的 Stop
	pi.on("agent_settled", (_event, ctx) => {
		runActive = false;
		runningTools.clear();
		if (lastStopReason(ctx) === "aborted") return; // 你自己打断的，人就在终端前
		send(ctx, "本轮回复已结束，等待你的输入", "active");
	});

	// 刻意绕过 allow()：/bark-test 是链路自检，应该在什么模式下都能发。
	pi.registerCommand("bark-test", {
		description: "发送一条 Bark 测试通知，验证推送链路",
		handler: async (_args, ctx) => {
			push("Bark 推送测试：Pi 扩展已生效", "active", basename(ctx.cwd) || undefined);
			ctx.ui.notify("已尝试发送 Bark 测试通知", "info");
		},
	});
}
