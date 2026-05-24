# NousResearch Hermes-Agent Specifications

Hermes Agent is an autonomous AI agent framework focusing on **experience-driven evolution**. Unlike stateless session setups, it records historical traces, parses failure nodes using DSPy, and updates its core system instructions dynamically.

## 1. Three-Layer Memory Persistence

- **Session Context:** Auto-compresses tokens when context window boundaries are met.
- **SQLite/FTS5 Database:** Virtual key-text matching indices across full conversation histories, retrieving files/traces in sub-10ms intervals.
- **Plain Markdown Profiles:** Persists state using readable markdown files (`USER.md` & `MEMORY.md`).

## 2. Dynamic Skill Curation Standard

Successful workflows are packaged into reusable skills conforming to the `agentskills.io` specification. Injected on-the-fly, avoiding repetitious context discovery.

## 3. GEPA evolutionary pipelines

Genetic-Pareto Prompt Evolution utilizes trace evaluation sets, runs mutations, filters signature changes based on Pareto cost constraints, and patches the system configurations to boost overall accuracy.

## 4. Command-Line Core CLI

| Command | Description |
|---|---|
| `hermes chat` | Launch TUI/CLI chat |
| `hermes model` | Interactive setup |
| `hermes skills` | Manage curation list |
| `hermes doctor` | Run diagnostic check |
