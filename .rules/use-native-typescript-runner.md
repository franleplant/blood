# Use Node.js native TypeScript execution

This project uses Node.js's native support for running TypeScript files. Do not suggest or use `ts-node` or a separate `tsc` compilation step to run TypeScript code.

## Rationale

- **Simplicity:** Using the native TypeScript runner in Node.js simplifies the development workflow by removing the need for additional tooling like `ts-node` or manual compilation.
- **Performance:** Running TypeScript directly with Node.js can be faster than using `ts-node`, as it avoids an extra layer of abstraction.
- **Consistency:** Sticking to a single execution method ensures consistency across the project and with the scripts defined in `package.json`.

## How to run TypeScript files

To run a TypeScript file, use the `node` command directly:

```bash
node path/to/your/file.ts
```

Make sure you are using a version of Node.js that supports this feature (v24.0.0 or higher, as specified in `package.json`).

## Examples

### Good ✅

```bash
node scripts/plot_homa_ir.ts
```

### Bad ❌

```bash
# Bad: using ts-node
ts-node scripts/plot_homa_ir.ts

# Bad: compiling with tsc first
tsc scripts/plot_homa_ir.ts && node scripts/plot_homa_ir.js
```
