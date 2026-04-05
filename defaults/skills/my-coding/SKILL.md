---
name: my-coding
description: Enforce Anilcan's coding style, conventions, and architectural philosophy when writing code in ANY language. Code must look like artisanship — clean, typed, documented, tested, linter-clean. Use for ALL code generation, implementation, refactoring, and code review tasks. Triggers on any request to write, modify, review, or generate code. Core tenets — (1) Laravel-inspired OOP even outside PHP, (2) 120-char max width, (3) multi-line everything, (4) trailing commas, (5) full type hints + docblocks, (6) TDD red-green-refactor, (7) English only, (8) zero linter violations. Load language-specific references (php-laravel.md, dart-flutter.md) when working in those languages.
---

# Anilcan Coding Style

Code is artisanship. Every class, method, and docblock is intentional. If it doesn't look clean enough to frame on a wall, it's not done.

## North Star: Laravel's Elegance

Laravel's API design — expressive method names, fluent interfaces, clean separation of concerns — is the gold standard for ALL code, not just PHP. Apply these principles universally:

- **Naming tells a story** — `findOrCreate`, `syncBarcodes`, `bootSkillsIfNeeded`
- **Structure mirrors intent** — Service orchestrates. Repository queries. Controller delegates.
- **OOP done right** — Interfaces for contracts. Abstract classes for shared behavior. Enums for magic values. Value objects for immutability.

## CRITICAL: Adapt to Project's Language Version

**BEFORE writing any code**, detect the project's language version from config files (`composer.json` → `require.php`, `pubspec.yaml` → `environment.sdk`, `tsconfig.json` → `target`, etc.). Use ONLY features available in that version.

**PHP version feature gates:**

| Feature | Minimum PHP | Fallback |
|---------|-------------|----------|
| Constructor property promotion | 8.0 | Traditional `$this->prop = $prop` in constructor body |
| Union types (`string\|int`) | 8.0 | PHPDoc `@param string\|int` + runtime checks |
| Named arguments | 8.0 | Positional arguments with inline comments for clarity |
| `match` expression | 8.0 | `switch` with strict comparison |
| Nullsafe operator `?->` | 8.0 | Explicit null checks |
| Backed enums | 8.1 | Class constants + validation methods |
| `readonly` properties | 8.1 | `@readonly` doc + private setter discipline |
| Intersection types (`A&B`) | 8.1 | PHPDoc `@param A&B` |
| `readonly class` | 8.2 | Individual `readonly` properties (8.1) or immutable by convention |
| `true`/`false`/`null` standalone types | 8.2 | `bool` with doc annotation |
| `#[Override]` attribute | 8.3 | `@override` in PHPDoc |

**Dart version feature gates:**

| Feature | Minimum Dart | Fallback |
|---------|-------------|----------|
| Records `(String, int)` | 3.0 | Custom class / tuple pattern |
| Patterns / pattern matching | 3.0 | Traditional `if`/`switch` |
| `sealed class` | 3.0 | Abstract class + factory constructors |
| Class modifiers (`final`, `interface`, `base`, `mixin`) | 3.0 | Convention + documentation |

The style principles (clean imports, docblocks, multi-line formatting, TDD) apply regardless of version. Only syntax features adapt.

## Non-Negotiable Rules

### 1. English Only

ALL identifiers, comments, docblocks, commit messages, error messages, DB columns — English. No exceptions, regardless of project audience.

### 2. Type Everything

Every parameter, return type, and property has an explicit type declaration. No untyped code ships.

```php
// CORRECT
public function findOrCreate(Team $team, User $user, array $data): GlobalProduct

// WRONG — missing return type
public function handle($request) { ... }
```

```dart
// CORRECT
WindStyle parse(WindStyle styles, List<String>? classes, WindContext context)

// WRONG — missing types, using dynamic
parse(styles, classes, context)
```

### 3. Document Everything

| Scope | Requirement |
|-------|-------------|
| Every class | Docblock explaining purpose |
| Every public method | Docblock with `@param`, `@return`, `@throws` |
| Every property | Type declaration + doc comment |
| Complex logic | Numbered step comments (WHY, not WHAT) |

If a method needs a paragraph of comments, extract it into a named method.

```php
/**
 * Find an existing translated product or create a new one.
 *
 * @param  Team  $team  The team requesting the product.
 * @param  User  $user  The user making the request.
 * @param  array  $data  The attributes for the product lookup/creation.
 * @return GlobalProduct
 *
 * @throws RuntimeException
 */
public function findOrCreate(Team $team, User $user, array $data): GlobalProduct
```

### 4. 120-Character Line Width

No line exceeds 120 characters. Break method signatures, chains, conditionals — everything.

```php
// CORRECT — broken cleanly
public function findOrCreate(
    Team $team,
    User $user,
    array $data,
): GlobalProduct {
    // ...
}

// WRONG — exceeds 120 chars
public function findOrCreate(Team $team, User $user, array $data, string $locale, bool $force = false): GlobalProduct
```

### 5. Multi-Line Collections — ALWAYS

Arrays, objects, parameter lists, maps — ALWAYS multi-line. Even with 2 elements. Trailing commas mandatory.

```php
// CORRECT
$config = [
    'key' => 'value',
    'timeout' => 30,
];

// WRONG — never inline
$config = ['key' => 'value', 'timeout' => 30];
```

```dart
// CORRECT
final colors = [
  Colors.red,
  Colors.blue,
  Colors.green,
];

// WRONG
final colors = [Colors.red, Colors.blue, Colors.green];
```

**Why:** Single-line diffs, clean reordering, vertical scannability.

### 6. Clean Imports

Import at the top of the file. NEVER reference classes by full namespace inline.

```php
// CORRECT
use RuntimeException;
use Throwable;
throw new RuntimeException('Failed.');

// WRONG — inline namespace
throw new \RuntimeException('Failed.');
```

### 7. TDD — Red, Green, Refactor

Write the failing test FIRST. Then implement. Then refactor. Applies to features, bugfixes, and refactors.

- New feature → test describes the contract before implementation
- Bug fix → test reproduces the bug first
- Refactor → existing tests are the safety net

There is no "we'll add tests later." The test comes before the code.

### 8. Linter is Law

Code MUST pass the linter with zero warnings, zero errors. No suppressions (`@ts-ignore`, `@phpstan-ignore`, `// ignore:`). Fix the actual issue.

### 9. Numbered Step Comments

Methods with 3+ logical phases get numbered steps:

```php
public function findOrCreate(Team $team, User $user, array $data): GlobalProduct
{
    // 1. Check if already exists — avoid duplicate translations.
    if ($existing = $this->findProductByLocale(...)) {
        return $existing;
    }

    // 2. Find base product in any language as translation source.
    $base = $this->findBaseProduct(...);

    // 3. Translate via AI service.
    $translated = $this->translateViaAI($base, $data['locale']);

    // 4. Create product and sync related data in a transaction.
    return DB::transaction(function () use ($translated, $team) {
        $product = GlobalProduct::create([...$translated, 'team_id' => $team->id]);
        $this->syncBarcodes($product, collect($translated['barcodes']));
        return $product;
    });
}
```

### 10. Enum Everything

Status values, types, categories — ALWAYS backed enums. Never string constants or magic values.

```php
enum SubscriptionStatus: string
{
    case ACTIVE = 'active';
    case INACTIVE = 'inactive';
    case CANCELED = 'canceled';
}
```

### 11. Thin Controllers + Form Requests

Controllers validate via Form Request, delegate to Service, return Resource. No business logic. No inline validation.

```php
// CORRECT — Form Request + Service + Resource
public function store(StoreRequest $request): JsonResponse
{
    $pool = $this->poolService->create($request->validated());

    return response()->json(PoolResource::make($pool), 201);
}

// WRONG — business logic in controller, inline validation
public function store(Request $request): JsonResponse
{
    $validated = $request->validate(['name' => 'required']);
    $pool = Pool::create([...$validated, 'team_id' => auth()->user()->team_id]);
    event(new PoolCreated($pool));

    return response()->json($pool, 201);
}
```

### 12. Constructor Dependency Injection

Inject dependencies via constructor. Never use facades or service location in class methods.

```php
// CORRECT
public function __construct(
    protected PoolService $poolService,
) {}

// WRONG — facade usage inside method
public function create(array $data): Pool
{
    Event::dispatch(new PoolCreated($pool));
}
```

### 13. Guard Clauses Over Nesting

Use early returns. Never nest conditionals beyond 2 levels.

```php
// CORRECT
public function activate(Pool $pool): void
{
    if ($pool->isActive()) {
        return;
    }

    if (! $pool->hasMinimumStake()) {
        throw new InsufficientStakeException($pool);
    }

    $pool->update(['status' => PoolStatus::Active]);
}

// WRONG — deeply nested
public function activate(Pool $pool): void
{
    if (! $pool->isActive()) {
        if ($pool->hasMinimumStake()) {
            $pool->update(['status' => PoolStatus::Active]);
        }
    }
}
```

## Architecture Principles

| Principle | Rule |
|-----------|------|
| Thin Controllers, Fat Services | Controllers validate + return. Business logic in Services. |
| Composition Over Inheritance | Prefer traits/mixins over deep hierarchies. |
| Immutable Value Objects | `readonly` (PHP) / `@immutable` (Dart). Mutate via `copyWith`. |
| Lazy Loading | Load on-demand, not eagerly. |
| Defensive Config | Always validate inputs. Always provide fallbacks. |
| Domain Directories | Complex domains get their own top-level directory. |
| Named Arguments | Use named params for clarity at call sites. |
| Event-Driven Side Effects | Cross-cutting concerns (notifications, cache, audit) in Listeners. |

## Error Handling

```php
// PATTERN: catch Throwable → report → throw user-friendly
try {
    // business logic
} catch (Throwable $exception) {
    report($exception);
    throw new RuntimeException('User-friendly error message.');
}
```

Never: empty catch blocks, swallowed exceptions, untyped catch.

## Formatting Quick Reference

| Setting | Value |
|---------|-------|
| Indent | 4 spaces (all languages) |
| Max width | 120 characters |
| Line endings | LF |
| Charset | UTF-8 |
| Trailing commas | Always |
| Collections | Always multi-line |
| Linter | Always passing, zero tolerance |

## Language-Specific References

Load these when working in the respective language:

- **PHP / Laravel**: See [references/php-laravel.md](references/php-laravel.md) for controller, model, service, resource, route, and package patterns.
- **Dart / Flutter**: See [references/dart-flutter.md](references/dart-flutter.md) for widget, parser, state management, and SDK/package patterns.
- **Anti-Patterns**: See [references/anti-patterns.md](references/anti-patterns.md) for the comprehensive "never do" list across all languages.
