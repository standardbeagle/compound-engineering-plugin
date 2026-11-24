# Agent Instructions

此庫主藏 `compound-engineering` coding-agent plugin，及 Claude Code marketplace/catalog metadata 以布之。亦有：
- Bun/TypeScript CLI：轉 Claude Code plugins 為他 agent platform formats
- `plugins/` 下諸 plugin，如 `coding-tutor`
- CLI、marketplace、plugins 共用 release/metadata 基建

`AGENTS.md` 為正典；根 `CLAUDE.md` 唯 compatibility shim，供舊工具/轉換覓之。

## Quick Start

```bash
bun install
bun test                  # full test suite
bun run release:validate  # check plugin/marketplace consistency
```

## Working Agreement

- **Branching:** 凡非瑣改，立 feature branch。若已在本務正 branch，沿用；非明請，勿另創 branch/worktree。
- **Safety:** 勿刪覆 user data；避 destructive commands。
- **Testing:** 若改 parsing/conversion/output，後行 `bun test`。
- **Release versioning:** release 由 automation 備，非普通 feature PR。今有多 release components（`cli`, `compound-engineering`, `coding-tutor`, `marketplace`）。新 release notes 以 GitHub release PRs/GitHub Releases 為正；根 `CHANGELOG.md` 唯指其史。標題用 conventional 如 `feat:`、`fix:` 俾 automation 判 intent；勿手 bump release-owned versions，勿於 routine PR 手撰 release notes。
- **Linked versions (cli + compound-engineering):** `linked-versions` release-please plugin 令 `cli` 與 `compound-engineering` 同版；此為有意，以簡化 CLI 與所載 plugin 版本追蹤。故僅 plugin 改亦 bump CLI，反之亦然。CLI changelog 亦可含本由 `exclude-paths` 濾去之 commits，因 `linked-versions` 強制 synced bump 時覆 exclusion logic。此乃 upstream release-please known limitation，非 misconfiguration；勿報 linked-version bumps 為 unnecessary。
- **Output Paths:** OpenCode output 固於 `opencode.json` 與 `.opencode/{agents,skills,plugins}`。OpenCode command 入 `~/.config/opencode/commands/<name>.md`；`opencode.json` deep-merged，勿 whole overwrite。
- **Scratch Space:** 預設 OS temp；惟下規明證時用 `.context/`。
  - **Default: OS temp**：凡多數 scratch 皆是，含 per-run throwaway 及 cross-invocation reusable，不問有 repo、他 skill 可讀否。穩定 OS-temp prefix 足以跨 skill/ invocation 協調；repo-adjacency 罕為要義。
    - **Per-run throwaway**: `mktemp -d -t <prefix>-XXXXXX`（OS cleanup）。供一次用而棄：captured screenshots、stitched GIFs、intermediate build outputs、recordings、delegation prompts/results、single-run checkpoints。
    - **Cross-invocation reusable**: stable path 如 `"${TMPDIR:-/tmp}/compound-engineering/<skill-name>/<run-id>/"`，**非** `mktemp -d`，俾後同 skill invocation 覓 sibling run-ids。供 session-keyed caches、欲過 context compaction 之 checkpoints、或後 run 須定位 prior outputs 之 state。
  - **Exception: `.context/`**：唯 artifact 實繫 CWD repo，且至少一者：
    - (a) **User-curated**: user 需於 skill 外 inspect/manipulate/manually curate artifact（如 per-repo TODO database、per-spec optimization log，可跨同 checkout sessions）。
    - (b) **Repo+branch-inseparable**: artifact 意義不可離此 repo/branch（如 branch-specific resume state，user 期於同 checkout 復取）。
    - (c) **Path is core UX**: 回示 artifact path 乃 skill output 核心，且 repo-relative 較 OS-temp 易告。
    Namespace 置 `.context/compound-engineering/<workflow-or-skill-name>/`；並行可期則加 per-run subdirectory；按 lifecycle 定 cleanup（per-run scratch 成功後清；user-curated state 留）。"Shared between skills" 獨不足，OS temp 亦能。
  - **Durable outputs**（plans, specs, learnings, docs, final deliverables）歸 `docs/` 或他 repo-tracked location，非二 scratch tier。
  - **Cross-platform note:** `"${TMPDIR:-/tmp}"` 為 portable prefix；`$TMPDIR` 於 macOS 解至 per-user `/var/folders/`，Linux 可設；`/tmp` fallback 補 unset。`mktemp -d -t <prefix>-XXXXXX` 適 macOS/Linux/WSL。此處 skills 假 Unix-like shells；native Windows 非今 target。
- **Character encoding:**
  - **Identifiers**（file names, agent names, command names）：ASCII only，converters/regex patterns 賴之。
  - **Markdown tables:** 用 pipe-delimited（`| col | col |`），勿 box-drawing characters。
  - **Prose and skill content:** Unicode 可（emoji、punctuation 等）。code blocks/terminal examples 中 prefer ASCII arrows（`->`, `<-`）over Unicode arrows。

## Directory Layout

```
src/              CLI entry point, parsers, converters, target writers
plugins/          Plugin workspaces (compound-engineering, coding-tutor)
.claude-plugin/   Claude marketplace catalog metadata
tests/            Converter, writer, and CLI tests + fixtures
docs/             Requirements, plans, solutions, and target specs
```

## Repo Surfaces

庫改或及一/多 surface：
- `compound-engineering` under `plugins/compound-engineering/`
- the Claude marketplace catalog under `.claude-plugin/`
- the converter/install CLI in `src/` and `package.json`
- secondary plugins such as `plugins/coding-tutor/`

未審 affected files 所屬 surface，勿謂改「just CLI」或「just plugin」。

## Plugin Maintenance

改 `plugins/compound-engineering/` content 時：
- plugin behavior/inventory/usage 變，更新實質 docs，如 `plugins/compound-engineering/README.md`。
- 勿手 bump plugin/marketplace manifests 中 release-owned versions。
- 勿手加 release entries 至 `CHANGELOG.md`，亦勿視為 new releases 正典。
- 若 agents、commands、skills、MCP servers、release-owned descriptions/counts 或變，行 `bun run release:validate`。

Useful validation commands:

```bash
bun run release:validate
cat .claude-plugin/marketplace.json | jq .
cat plugins/compound-engineering/.claude-plugin/plugin.json | jq .
```

## Coding Conventions

- 跨 platform conversion，取 explicit mappings，勿 implicit magic。
- target-specific behavior 居 dedicated converters/writers，勿散 conditionals 於無關 files。
- 守 installed targets 穩定 output paths 與 merge semantics；勿輕改 generated file locations。
- 加/改 target，implementation 同步 fixtures/tests；docs/examples 非足證。

## Commit Conventions

- **Prefix is based on intent, not file type.** 用 conventional prefixes（`feat:`, `fix:`, `docs:`, `refactor:` 等），按 change does 分類，非 file extension。`plugins/*/skills/`、`plugins/*/agents/`、`.claude-plugin/` 下雖 Markdown/JSON，仍 product code。`docs:` 只予純 documentation files（`README.md`, `docs/`, `CHANGELOG.md`）。
- **Include a component scope.** scope 原文入 changelog。取最窄有用 label：skill/agent name（`document-review`, `learnings-researcher`）、plugin/CLI area（`coding-tutor`, `cli`）、或 cross-cutting shared area（`review`, `research`, `converters`）。勿用 `compound-engineering`，其為全 plugin 無信息。若無單一 label 增 clarity，可省 scope。
- Breaking changes 必以 `!` 或 breaking-change footer 明示，俾 release automation 正判。

## Adding a New Target Provider

唯 target format stable、documented、且 tools/permissions/hooks 映射明，方加 provider。Checklist：

1. **Define the target entry**
   - Add a new handler in `src/targets/index.ts` with `implemented: false` until complete.
   - Use a dedicated writer module (e.g., `src/targets/codex.ts`).

2. **Define types and mapping**
   - Add provider-specific types under `src/types/`.
   - Implement conversion logic in `src/converters/` (from Claude → provider).
   - Keep mappings explicit: tools, permissions, hooks/events, model naming.

3. **Wire the CLI**
   - Ensure `convert` and `install` support `--to <provider>` and `--also`.
   - Keep behavior consistent with OpenCode (write to a clean provider root).

4. **Tests (required)**
   - Extend fixtures in `tests/fixtures/sample-plugin`.
   - Add spec coverage for mappings in `tests/converter.test.ts`.
   - Add a writer test for the new provider output tree.
   - Add a CLI test for the provider (similar to `tests/cli.test.ts`).

5. **Docs**
   - Update README with the new `--to` option and output locations.

## Agent References in Skills

於 skill SKILL.md 中 refer agents（如 via `Agent` 或 `Task` tool），必用 **category-qualified namespace** 且 `ce-` prefix：`<category>:ce-<agent-name>`。勿裸用 agent name。

Example:
- `research:ce-learnings-researcher` (correct)
- `learnings-researcher` (wrong - will fail to resolve at runtime)

此防 plugin 與他 plugins 同裝且短名相同時 resolution failures。

## File References in Skills

每 skill directory 自為 unit。SKILL.md 只可用 skill root 相對路徑 reference 其 directory tree 內 files（如 `references/`, `assets/`, `scripts/`）。勿 reference skill directory 外 files，不論 relative traversal 或 absolute path。

Broken patterns:

- `../other-skill/references/schema.yaml` — relative traversal into a sibling skill
- `/home/user/plugins/compound-engineering/skills/other-skill/file.md` — absolute path to another skill
- `~/.claude/plugins/cache/marketplace/compound-engineering/1.0.0/skills/other-skill/file.md` — absolute path to an installed plugin location

所由：
- **Runtime resolution:** Skills 自 user's working directory 執行，非 skill directory。Cross-directory paths/absolute paths 不如期 resolve。
- **Unpredictable install paths:** Marketplace 安裝 plugins cached at versioned paths。source repo 可行 absolute paths 不符 installed layout，且 version segment 每 release 變。
- **Converter portability:** CLI 轉他 agent platforms 時 each skill directory isolated copy。Cross-directory references 斷，因 sibling directories 未納入 copy。

若二 skills 需同 supporting file，複製入各 skill directory。Prefer small self-contained reference files over shared dependencies。

> **Note (March 2026):** 此 constraint 反映 current Claude Code skill resolution behavior 與 known path-resolution bugs（[#11011](https://github.com/anthropics/claude-code/issues/11011), [#17741](https://github.com/anthropics/claude-code/issues/17741), [#12541](https://github.com/anthropics/claude-code/issues/12541)）。若 Anthropic 日後有 shared-files mechanism 或 cross-skill imports，須以 supporting documentation 重審此 guidance。

## Platform-Specific Variables in Skills

此 plugin 一次 author，轉多 agent platforms（Claude Code, Codex, Gemini CLI, etc.）。skill content 中勿用 platform-specific environment variables 或 string substitutions（如 `${CLAUDE_PLUGIN_ROOT}`, `${CLAUDE_SKILL_DIR}`, `${CLAUDE_SESSION_ID}`, `CODEX_SANDBOX`, `CODEX_SESSION_ID`），除非有 graceful fallback，當 variable unavailable/unresolved 亦可。

**Preferred approach — relative paths:** 以 skill directory 相對路徑 reference co-located scripts/files（如 `bash scripts/my-script.sh ARG`）。All major platforms 皆相對 skill directory resolve。無需 variable prefix。

**When a platform variable is unavoidable:** 用 pre-resolution pattern（`!` backtick syntax），並於 skill content 明列 fallback instructions，使 agent 知 value 為 empty/literal/error 時何為：

```
**Plugin version (pre-resolved):** !`jq -r .version "${CLAUDE_PLUGIN_ROOT}/.claude-plugin/plugin.json"`

If the line above resolved to a semantic version (e.g., `2.42.0`), use it.
Otherwise (empty, a literal command string, or an error), use the versionless fallback.
Do not attempt to resolve the version at runtime.
```

此亦施於任何 platform variables；由 Codex、Gemini 或他 platform 轉來之 skill，若假 platform-only variables 存且無 fallback，同患。

## Repository Docs Convention

- **Requirements** live in `docs/brainstorms/` — requirements exploration and ideation.
- **Plans** live in `docs/plans/` — implementation plans and progress tracking.
- **Solutions** live in `docs/solutions/` — documented decisions and patterns.
- **Specs** live in `docs/specs/` — target platform format specifications.

### Solution categories (`docs/solutions/`)

此庫造 plugin *for* developers。solutions 依 end user（developer using plugin）視角分類，非 contributor to this repo。

- **`developer-experience/`** — Issues with contributing to *this repo*: local dev setup, shell aliases, test ergonomics, CI friction. 若 fix 只關有此 checkout 者，歸此。
- **`integrations/`** — Issues where plugin output doesn't work correctly on a target platform or OS. Cross-platform bugs, target writer output problems, converter compatibility issues 歸此。
- **`workflow/`**, **`skill-design/`** — Plugin skill and agent design patterns, workflow improvements.

疑則：若 bug 影響運行 `bun install compound-engineering` 或 `bun convert` 之人，乃 integration/product issue，非 developer-experience。