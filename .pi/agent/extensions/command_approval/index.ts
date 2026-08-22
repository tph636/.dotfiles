/**
 * Command Approval Extension
 *
 * Claude Code style approval gate for bash commands:
 *   - Every bash command needs approval before it runs.
 *   - Approving a command can also add it to a persisted allowlist so it
 *     never has to be approved again.
 *   - An "auto-accept" mode can be toggled on to skip prompts entirely
 *     for the rest of the session (like Claude Code's auto-accept mode).
 *
 * Allowlist entries are JavaScript regular expressions matched against the
 * full command string. A "^" is implied at the start if not already present,
 * so entries read as prefix matches by default (e.g. "git status" allows
 * any "git status ..." invocation); write "^...$" for a full-string match.
 *
 * State is stored globally in the pi agent config dir so it applies across
 * all projects: <agentDir>/command-approval.json
 */

import { getAgentDir, isToolCallEventType, type ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

const STATUS_KEY = "command-approval";
const STORE_PATH = join(getAgentDir(), "command-approval.json");

interface Store {
	allow: string[];
}

const regexCache = new Map<string, RegExp | null>();

function compilePattern(pattern: string): RegExp | null {
	if (regexCache.has(pattern)) return regexCache.get(pattern)!;
	const source = pattern.startsWith("^") ? pattern : `^${pattern}`;
	let regex: RegExp | null;
	try {
		regex = new RegExp(source);
	} catch {
		regex = null;
	}
	regexCache.set(pattern, regex);
	return regex;
}

function matchesAllowlist(command: string, allow: string[]): boolean {
	return allow.some((pattern) => compilePattern(pattern)?.test(command) ?? false);
}

async function loadStore(): Promise<Store> {
	try {
		const raw = await readFile(STORE_PATH, "utf8");
		const parsed = JSON.parse(raw) as Partial<Store>;
		return { allow: Array.isArray(parsed.allow) ? parsed.allow.filter((v) => typeof v === "string") : [] };
	} catch {
		return { allow: [] };
	}
}

async function saveStore(store: Store): Promise<void> {
	await mkdir(dirname(STORE_PATH), { recursive: true });
	await writeFile(STORE_PATH, JSON.stringify(store, null, 2), "utf8");
}

export default function (pi: ExtensionAPI) {
	let store: Store = { allow: [] };
	let autoAccept = false;

	const setStatus = (ctx: { ui: { setStatus: (key: string, value: string | undefined) => void } }) => {
		ctx.ui.setStatus(STATUS_KEY, autoAccept ? "auto-accept: ON" : undefined);
	};

	pi.on("session_start", async (_event, ctx) => {
		store = await loadStore();
		autoAccept = false;
		setStatus(ctx);
	});

	pi.on("tool_call", async (event, ctx) => {
		if (!isToolCallEventType("bash", event)) return undefined;

		const command = event.input.command.trim();
		if (!command) return undefined;

		if (matchesAllowlist(command, store.allow)) return undefined;
		if (autoAccept) return undefined;

		if (!ctx.hasUI) {
			return { block: true, reason: "Command approval required (no UI available to confirm)" };
		}

		const choice = await ctx.ui.select(`Run command?\n\n  ${command}`, [
			"Yes",
			"Yes, always allow this command",
			"Yes, auto-accept all commands for this session",
			"No",
		]);

		switch (choice) {
			case "Yes":
				return undefined;

			case "Yes, always allow this command":
				store.allow.push(command);
				await saveStore(store);
				ctx.ui.notify(`Added to allowlist: ${command}`, "info");
				return undefined;

			case "Yes, auto-accept all commands for this session":
				autoAccept = true;
				setStatus(ctx);
				ctx.ui.notify("Auto-accept enabled for this session", "warning");
				return undefined;

			default:
				return { block: true, reason: "Blocked by user" };
		}
	});

	// Add keybinding handler for Shift+Tab
pi.on("keypress", async (event, ctx) => {
	if (event.key !== "Tab" || !event.shiftKey) return;
	
	// Get the current command from the UI
	const currentCommand = ctx.ui.getCurrentCommand?.();
	if (!currentCommand) return;
	
	// Define approval options
	const options = [
		"Yes",
		"Yes, always allow this command",
		"Yes, auto-accept all commands for this session",
		"No"
	];
	
	// Cycle through options
	const currentOption = ctx.ui.getStatus(STATUS_KEY) || "";
	const currentIndex = options.indexOf(currentOption);
	const nextIndex = (currentIndex + 1) % options.length;
	const nextOption = options[nextIndex];
	
	// Update status and notify user
	ctx.ui.setStatus(STATUS_KEY, nextOption);
	ctx.ui.notify(`Approval option: ${nextOption}`, "info");
	
	// If user selects an option, handle it
	if (nextOption !== "") {
		switch (nextOption) {
			case "Yes":
				// Command will be executed
				break;
			case "Yes, always allow this command":
				store.allow.push(currentCommand);
				await saveStore(store);
				ctx.ui.notify(`Added to allowlist: ${currentCommand}`, "info");
				break;
			case "Yes, auto-accept all commands for this session":
				autoAccept = true;
				setStatus(ctx);
				ctx.ui.notify("Auto-accept enabled for this session", "warning");
				break;
			case "No":
				return { block: true, reason: "Blocked by user" };
		}
	}
});

pi.registerCommand("approve", {
		description: "Manage command approval: list | add <cmd> | remove <cmd> | auto <on|off>",
		getArgumentCompletions: (prefix) => {
			const subcommands = ["list", "add", "remove", "auto"];
			const items = subcommands.filter((s) => s.startsWith(prefix)).map((value) => ({ value, label: value }));
			return items.length > 0 ? items : null;
		},
		handler: async (args, ctx) => {
			const trimmed = args.trim();
			const [sub, ...rest] = trimmed.split(/\s+/);
			const restArg = trimmed.slice(sub?.length ?? 0).trim();

			switch (sub) {
				case "add": {
					if (!restArg) {
						ctx.ui.notify("Usage: /approve add <command>", "warning");
						return;
					}
					if (!store.allow.includes(restArg)) {
						store.allow.push(restArg);
						await saveStore(store);
					}
					ctx.ui.notify(`Added to allowlist: ${restArg}`, "info");
					return;
				}

				case "remove": {
					if (!restArg) {
						ctx.ui.notify("Usage: /approve remove <command>", "warning");
						return;
					}
					const before = store.allow.length;
					store.allow = store.allow.filter((c) => c !== restArg);
					if (store.allow.length !== before) {
						await saveStore(store);
						ctx.ui.notify(`Removed from allowlist: ${restArg}`, "info");
					} else {
						ctx.ui.notify(`Not found in allowlist: ${restArg}`, "warning");
					}
					return;
				}

				case "auto": {
					const arg = rest.join(" ").trim().toLowerCase();
					if (arg !== "on" && arg !== "off") {
						ctx.ui.notify("Usage: /approve auto <on|off>", "warning");
						return;
					}
					autoAccept = arg === "on";
					setStatus(ctx);
					ctx.ui.notify(`Auto-accept ${autoAccept ? "enabled" : "disabled"} for this session`, "info");
					return;
				}

				case "list":
				case "": {
					const lines = [
						`Auto-accept: ${autoAccept ? "ON" : "off"}`,
						store.allow.length > 0 ? "Allowed commands:" : "Allowed commands: (none)",
						...store.allow.map((c) => `  - ${c}`),
					];
					ctx.ui.notify(lines.join("\n"), "info");
					return;
				}

				default:
					ctx.ui.notify("Usage: /approve list | add <cmd> | remove <cmd> | auto <on|off>", "warning");
			}
		},
	});
	
	// Rest of the keypress handler code...
}
