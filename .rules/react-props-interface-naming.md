# React Component Props Interface Naming Convention

**CRITICAL RULE:** Always name React component props interfaces or types as `Props` - NEVER use fully qualified names like `MyComponentProps`, `ComponentNameProps`, or any other variant.

## Rationale

- **Consistency:** Using a simple `Props` name keeps the codebase consistent and predictable
- **Locality:** Props interfaces are typically defined right above the component they belong to, making the context clear
- **Readability:** Shorter names reduce visual clutter and improve code readability
- **Convention:** This follows established React/TypeScript community patterns
- **Maintainability:** Avoids the need to update interface names when component names change

## Rules

### ✅ ALWAYS DO THIS

```typescript
// ✅ CORRECT: Use simple "Props" interface name
interface Props {
  userId: number;
  title: string;
  onSave?: () => void;
}

export default function UserProfile({ userId, title, onSave }: Props) {
  // component implementation
}
```

```typescript
// ✅ CORRECT: Also acceptable with type alias
type Props = {
  userId: number;
  title: string;
  onSave?: () => void;
};

export default function UserProfile({ userId, title, onSave }: Props) {
  // component implementation
}
```

### ❌ NEVER DO THIS

```typescript
// ❌ WRONG: Do NOT use fully qualified names
interface UserProfileProps {
  // ❌ NO!
  userId: number;
  title: string;
  onSave?: () => void;
}

interface UserProfileComponentProps {
  // ❌ NO!
  userId: number;
  title: string;
}

interface IUserProfileProps {
  // ❌ NO!
  userId: number;
  title: string;
}

type UserProfilePropsType = {
  // ❌ NO!
  userId: number;
  title: string;
};
```

## Special Cases

### When you have multiple interfaces in the same file scope

If you absolutely need multiple prop interfaces in the same file (which should be rare), use descriptive but still simple names:

```typescript
// ✅ Acceptable for multiple interfaces in same scope
interface Props {
  // Main component props
}

interface ItemProps {
  // Sub-component props
}

interface HeaderProps {
  // Header component props
}
```

### Function components vs Class components

This rule applies to ALL React components, regardless of implementation:

```typescript
// ✅ Function component
interface Props {
  name: string;
}
export default function MyComponent({ name }: Props) {}

// ✅ Class component (if still used)
interface Props {
  name: string;
}
export default class MyComponent extends React.Component<Props> {}
```

## Enforcement

- **Code Reviews:** All code reviews must check for this naming convention
- **Linting:** Configure ESLint rules to enforce this pattern where possible
- **LLM Instructions:** Any AI assistant working on this codebase MUST follow this rule without exception

## Summary

**REMEMBER:** Props interfaces are ALWAYS named `Props` - never `ComponentNameProps` or any other fully qualified variant. This is a strict, non-negotiable rule for this codebase.

**For LLMs:** When creating React components, the props interface MUST be named exactly `Props` and nothing else. Do not add the component name as a prefix or suffix. Just `Props`.
