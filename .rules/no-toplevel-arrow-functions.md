# Use `function` for top-level functions

In this project, always prefer using the `function` keyword for declaring functions at the top level of a module. Avoid using arrow function expressions assigned to a variable for this purpose.

## Rationale

- **Consistency:** Using a single, consistent way to declare top-level functions improves code readability and maintainability.
- **Hoisting:** `function` declarations are hoisted, which means they can be called before they are defined in the code. This can help with organizing code by placing the most important logic at the top of the file.
- **Debugging:** Named functions provide more descriptive names in call stacks, which can make debugging easier.

Arrow functions are still appropriate for inline callbacks or when you specifically need to preserve the lexical `this` context.

## Examples

### Good ✅

```typescript
// Good: using a function declaration
async function fetchData(url: string): Promise<Data> {
  // ... implementation
}
```

### Bad ❌

```typescript
// Bad: using an arrow function for a top-level function
const fetchData = async (url: string): Promise<Data> => {
  // ... implementation
};
```
