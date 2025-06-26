# Prefer `Array<T>` over `T[]` for TypeScript generics

In this project, always use the `Array<T>` syntax for defining array types in TypeScript. Avoid using the `T[]` shorthand.

## Rationale

- **Consistency and Readability:** Using `Array<T>` is more consistent with how other generic types are defined (e.g., `Promise<T>`, `Map<K, V>`). This consistency can make the code easier to read and understand, especially for complex type definitions.
- **Clarity with Complex Types:** When dealing with complex types, such as arrays of functions or promises, the `Array<T>` syntax can be clearer and less ambiguous than `T[]`.

## Examples

### Good ✅

```typescript
// Good: using Array<T>
const numbers: Array<number> = [1, 2, 3];
const users: Array<User> = [];
```

### Bad ❌

```typescript
// Bad: using T[]
const numbers: number[] = [1, 2, 3];
const users: User[] = [];
```
