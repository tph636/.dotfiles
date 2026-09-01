/**
 * File Edit Approval Extension
 *
 * Claude Code style approval gate for file edits/writes:
 *   - Every write/edit needs approval before it runs.
 *   - There is NO hardcoded or persisted allowlist. Approvals are session-specific
 *     in-memory only. They are forgotten when the session ends (or pi restarts).
 *   - When pi wants to edit a file it asks, and the user can pick:
 *       "Yes - allow this session"  -> remember the path for the rest of the session
 *       "Yes"                       -> allow only this one edit
 *       "No"                        -> block the edit
 *   - An "auto-accept" mode can be toggled on to skip prompts entirely for the
 *     rest of the session (like Claude Code's auto-accept mode).
 *
 * Paths are normalized to absolute paths and compared case-sensitively. Two
 * edits to the same normalized path only prompt once when "allow this session"
 * is chosen.
 *
 * This mirrors the command_approval extension, but for file mutations and with
 * session-only (not persisted) approvals.
 */

import { isToolCallEventType, type ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { isAbsolute, resolve } from "node:path";

const STATUS_KEY = "file-edit-approval";

export default function (pi: ExtensionAPI) {
	// In-memory, session-only allowlist. Cleared on every session_start.
	const sessionAllowed = new Set<string>();
	let autoAccept = false;

	const setStatus = (ctx: { ui: { setStatus: (key: string, value: string | undefined) => void } }) => {
		ctx.ui.setStatus(STATUS_KEY, autoAccept ? "auto-accept: ON" : undefined);
	};

	pi.on("session_start", async (_event, ctx) => {
		sessionAllowed.clear();
		autoAccept = false;
		setStatus(ctx);
	});

	pi.on("tool_call", async (event, ctx) => {
		// Only gate file-mutating tools: write and edit.
		if (!isToolCallEventType("write", event) && !isToolCallEventType("edit", event)) {
			return undefined;
		}

		const rawPath = event.input.path;
		if (typeof rawPath !== "string" || rawPath.length === 0) return undefined;

		const normalizedPath = normalizePath(rawPath, ctx.cwd);

		if (sessionAllowed.has(normalizedPath)) return undefined;
		if (autoAccept) return undefined;

		if (!ctx.hasUI) {
			return { block: true, reason: "File edit approval required (no UI available to confirm)" };
		}

		const choice = await ctx.ui.select(`Allow editing file?\n\n  ${rawPath}`, [
			"Yes - allow this session",
			"Yes",
			"No",
		]);

		switch (choice) {
			case "Yes - allow this session":
				sessionAllowed.add(normalizedPath);
				ctx.ui.notify(`Editing allowed for this session: ${rawPath}`, "info");
				return undefined;

			case "Yes":
				return undefined;

			default:
				return { block: true, reason: "Blocked by user" };
		}
	});

	pi.registerCommand("file-auto", {
		description: "Toggle auto-accept mode for file edit approval",
		handler: async (_args, ctx) => {
			autoAccept = !autoAccept;
			setStatus(ctx);
			ctx.ui.notify(`File edit auto-accept ${autoAccept ? "enabled" : "disabled"} for this session`, "info");
		},
	});

	pi.registerCommand("file-approve", {
		description: "Manage session file edit approval: list | add <path> | remove <path> | clear",
		getArgumentCompletions: (prefix) => {
			const subcommands = ["list", "add", "remove", "clear"];
			const items = subcommands.filter((s) => s.startsWith(prefix)).map((value) => ({ value, label: value }));
			return items.length > 0 ? items : null;
		},
		handler: async (args, ctx) => {
			const trimmed = args.trim();
			const [sub] = trimmed.split(/\s+/);
			const restArg = trimmed.slice(sub?.length ?? 0).trim();

			switch (sub) {
				case "add": {
					if (!restArg) {
						ctx.ui.notify("Usage: /file-approve add <path>", "warning");
						return;
					}
					sessionAllowed.add(normalizePath(restArg, ctx.cwd));
					ctx.ui.notify(`Allowed for this session: ${restArg}`, "info");
					return;
				}

				case "remove": {
					if (!restArg) {
						ctx.ui.notify("Usage: /file-approve remove <path>", "warning");
						return;
					}
					const before = sessionAllowed.size;
					sessionAllowed.delete(normalizePath(restArg, ctx.cwd));
					if (sessionAllowed.size !== before) {
						ctx.ui.notify(`Removed session approval: ${restArg}`, "info");
					} else {
						ctx.ui.notify(`Not approved this session: ${restArg}`, "warning");
					}
					return;
				}

				case "clear": {
					const before = sessionAllowed.size;
					sessionAllowed.clear();
					ctx.ui.notify(`Cleared ${before} session file approval${before === 1 ? "" : "s"}`, "info");
					return;
				}

				case "list":
				case "": {
					const lines = [
						`Auto-accept: ${autoAccept ? "ON" : "off"}`,
						sessionAllowed.size > 0 ? "Allowed for this session:" : "Allowed for this session: (none)",
						...[...sessionAllowed].map((p) => `  - ${p}`),
					];
					ctx.ui.notify(lines.join("\n"), "info");
					return;
				}

				default:
					ctx.ui.notify("Usage: /file-approve list | add <path> | remove <path> | clear", "warning");
			}
		},
	});
}

/**
 * Normalize a path to an absolute, resolved form so the same file is matched
 * regardless of how the model refers to it (relative, absolute, with `.`/`..`).
 */
function normalizePath(path: string, cwd: string): string {
	const absolute = isAbsolute(path) ? path : resolve(cwd, path);
	// resolve() collapses "."/".." and symlinks' textual ".." segments.
	return resolve(absolute);
}
