# GraphQL Code Generator

GraphQL Code Generator is a TypeScript monorepo that generates strongly-typed code from GraphQL schemas and operations. It parses GraphQL documents and emits TypeScript types, resolver stubs, typed document nodes, and more via a plugin/preset system. See `package.json` for the Node.js version requirement and `packages/graphql-codegen-cli/package.json` for the CLI package version.

## Setup & Commands

```bash
# Install dependencies (Yarn 1 workspaces)
yarn

# Build all packages (ESM + CJS dual output via bob-the-bundler)
yarn build

# Incremental rebuild
yarn rebuild

# Run all unit tests
yarn test

# Run tests for a single package (example)
cd packages/graphql-codegen-core && yarn test

# Lint (ESLint)
yarn lint

# Prettier check
yarn prettier:check

# Prettier fix
yarn prettier

# Type check (no emit)
yarn types:check

# Generate dev-test fixtures (requires a prior build)
yarn generate:examples

# Release (requires build first)
yarn release
```

## Monorepo Structure

See `ARCHITECTURE.md` for the full directory map. Workspaces are declared in the root `package.json`.

- `packages/graphql-codegen-cli/` — CLI entry point and orchestration
- `packages/graphql-codegen-core/` — Core codegen engine (schema merge, plugin dispatch, document transform)
- `packages/plugins/typescript/` — TypeScript output plugins (typescript, operations, resolvers, etc.)
- `packages/plugins/other/` — Language-neutral plugins (add, introspection, schema-ast, visitor-plugin-common)
- `packages/presets/` — High-level presets: `client`, `graphql-modules`, `swc-plugin`
- `packages/utils/plugins-helpers/` — Shared `Types` namespace, `CodegenPlugin` interface, profiler
- `packages/utils/graphql-codegen-testing/` — Shared test helpers
- `dev-test/` — Integration fixtures; **never edit generated files here directly** — run `yarn generate:examples` and commit the diff
- `examples/` — End-to-end example projects; generated output tracked in git

## Code Conventions

- TypeScript throughout; target `es2021`, module output `esnext`
- All packages publish **dual ESM + CJS** output via `bob-the-bundler`; use `.js` extensions in import paths within `src/` (not `.ts`)
- `Types` namespace lives in `@graphql-codegen/plugin-helpers` — use it for shared interfaces (`Types.Config`, `Types.FileOutput`, `Types.GenerateOptions`, etc.)
- Plugin interface: export `plugin(schema, documents, config)` and optionally `validate`, `addToSchema`, `onBefore`, `onAfter`
- Preset interface: export `buildGeneratesSection(options)` returning `Types.GenerateOptions[]`
- Profiler: wrap expensive operations with `await profiler.run(() => fn(), 'descriptive label')` — always instrument new bottlenecks
- Configuration loaded via cosmiconfig; supports `.yml`, `.yaml`, `.json`, `.js`, `.ts` config files named `codegen.*`
- ESLint uses `@theguild` shared config; `prettier` formats all TS/JS/GraphQL/JSON/YAML/MD files

## Testing

- Framework: Jest (`jest.project.js` drives shared config; `babel-jest` transforms TS)
- Test files: `packages/**/tests/*.test.ts` or `packages/**/tests/*.spec.ts`
- Each package runs tests against the root `jest.config.js` (or its own if present)
- `dev-test/setup.js` is loaded as a global setup file for all tests
- Snapshots use `escapeString: false` — regenerate with `jest --updateSnapshot`
- After changing codegen output, run `yarn generate:examples` and check `git diff dev-test/` and `git diff examples/`; CI enforces zero diff
- Test timeout: 20 seconds per test

## Do

- Use `await profiler.run(...)` for any new schema-processing or plugin-execution paths
- Export named exports from `src/index.ts`; bob-the-bundler derives CJS/ESM from these
- Use `@graphql-tools/*` loaders for schema and document loading — do not re-implement loading logic
- Follow the existing caching pattern (`createCache()` in `codegen.ts`) when results can be reused across output files
- Add a changeset (`yarn changeset`) for any user-visible change before opening a PR
- Keep plugin config validated using the `validate` export of `CodegenPlugin`
- Write tests in `tests/` relative to the package being changed

## Don't

- Don't import from `dist/` inside source — use the TypeScript path aliases in `tsconfig.json` instead
- Don't use `require()` for dynamic loading in ESM paths — use `import()`
- Don't add high-level dependencies to individual plugin packages that belong in `plugin-helpers`
- Don't commit generated `dev-test/` or `examples/` changes directly — they must result from running `yarn generate:examples`
- Don't skip the `validate` step when a plugin receives config — validate early and throw with a helpful message
- Don't add a new top-level package without updating the root `tsconfig.json` paths

## Architecture

See `ARCHITECTURE.md` for system architecture, component relationships, data flow, and design decisions.

## Security

See `SECURITY.md` for mandatory security requirements, prohibited patterns, and escalation triggers.

## Safety & Permissions

Allowed without approval:
- Read/list files
- Run single-package tests and linters
- Run type checker on specific files

Ask before:
- Installing or removing packages
- Deleting files or directories
- Running the full test suite or build
- Modifying CI/CD configuration
- Pushing to remote branches

## PR & Commit Guidelines

- Conventional commit format: `type(scope): description` — types: `feat`, `fix`, `chore`, `docs`, `deps`, `refactor`, `perf`, `test`
- Scope is optional (e.g., `chore(deps):`, `feat(client-preset):`)
- Add a changeset for user-facing changes: `yarn changeset`
- Do not use `Fixes #NNN` in PR descriptions (per PR template); use `Related #NNN`
- PRs targeting `master` branch

## References

- Architecture: `ARCHITECTURE.md`
- Security: `SECURITY.md`
- Changeset workflow: `.changeset/README.md`
- Website docs: `website/`
- Contributing guide: https://the-guild.dev/graphql/codegen/docs/custom-codegen/contributing
