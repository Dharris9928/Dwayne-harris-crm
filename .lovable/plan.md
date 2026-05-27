# Zero-Consequence Cleanup

Only the changes with **no functional impact** — purely cosmetic / hygiene.

## What gets done

### 1. ESLint auto-fix
Run `eslint . --fix` for mechanical rules only:
- Import ordering
- Unused imports removal
- Missing semicolons / trailing commas
- `prefer-const`

### 2. Add `void` to fire-and-forget promises
~20 spots like `queryClient.invalidateQueries(...)` and unawaited `mutation.mutate()` calls — prefix with `void` to make intent explicit.

### 3. Remove stray `console.log` (17 calls)
Delete debug `console.log` statements. Keep all `console.error` and `console.warn` (those are intentional error paths).

## What gets skipped

- ❌ `any → unknown` swaps (would break the build)
- ❌ Removing `?.` optional chaining (would cause crashes)
- ❌ Wrapping arrow callbacks in braces (cosmetic noise, hundreds of lines)
- ❌ Any DB / RLS / auth / business logic changes

## Consequences

**None.** Runtime behavior is byte-identical. Only diff is cleaner code and a quieter console.

## Verification

After the pass: confirm the build still passes and the app loads on `/auth` — no other testing needed since nothing functional changed.