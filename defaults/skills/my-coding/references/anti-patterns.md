# Anti-Patterns (Never Do)

## PHP

| Anti-Pattern | Why | Do Instead |
|-------------|-----|------------|
| `@phpstan-ignore` / `@ts-ignore` | Hides real type issues | Fix the actual type error |
| `$guarded = []` on models | Opens all fields to mass-assignment | Use explicit `$fillable` |
| String constants for statuses | No type safety, typo-prone | Use backed enums |
| Fat controllers | Violates SRP, untestable | Extract to Service classes |
| Inline validation in controllers | Duplication, no reuse | Use Form Requests |
| `Route::resource()` | Implicit, hides routes | Use explicit route definitions |
| Empty catch blocks `catch(e) {}` | Swallows errors silently | Always `report()` or handle |
| Magic strings for config | Fragile, no autocomplete | Use `config()` helper |
| Inline namespaces `\App\Models\X` | Messy, hard to scan | Always `use` import at top |
| Untyped parameters or returns | No safety, no IDE support | Full type declarations |
| Missing docblocks on public methods | Undocumented API | Every public API gets a docblock |
| Pipe-delimited validation rules | Hard to read, no objects | Array format: `['required', 'string']` |
| Non-English names or comments | Inconsistency | English only, always |
| `declare(strict_types=1)` | Violates project conventions, causes runtime errors | Omit the declaration entirely |
| Custom DTO classes | Over-engineering, not Laravel way | `$request->validated()` arrays |
| N+1 queries | Performance degradation | Eager load with `->with()` |
| Catching `\Exception` globally | Swallows domain errors | Catch specific `Throwable` |

## Dart

| Anti-Pattern | Why | Do Instead |
|-------------|-----|------------|
| External state management packages | Unnecessary dependency | Flutter-native InheritedWidget + ChangeNotifier |
| Importing from `src/` directly | Breaks encapsulation | Always import barrel file |
| Widget inheritance | Tight coupling | Use composition |
| `pumpAndSettle()` with infinite anims | Test hangs forever | Use `pump(Duration(...))` |
| Multi-class files | Hard to find, violates SRP | One class per file |
| Bypassing WindParser for direct styling | Inconsistent styling | Always use `className` |
| Missing DartDoc on public APIs | Undocumented API | Every class, method, property documented |
| Untyped variables / missing returns | No safety | Explicit types everywhere |
| `dynamic` type | No compile-time safety | Explicit type annotations |
| `List<String>` for unique sets | Allows duplicates | `Set<String>` |
| Deep widget nesting (>5 levels) | Unreadable, unmaintainable | Extract sub-widgets as private methods |
| `setState` for complex state | Rebuilds entire tree | `ChangeNotifier` + provider pattern |
| Missing `const` on constructors | Unnecessary rebuilds | Add `const` wherever possible |
| `print()` for debugging | No structure, no prod control | Structured logger (WindLogger) |
| Mutable widget properties | Unpredictable behavior | `final` fields, `@immutable` annotation |
| Inline magic numbers | Unclear intent | Named constants or theme values |

## All Languages

| Anti-Pattern | Why | Do Instead |
|-------------|-----|------------|
| Non-English identifiers or comments | Inconsistency | English is the only language |
| Undocumented public APIs | Invisible contracts | If public, it has a docblock |
| Complex methods without step comments | Unreadable flow | Numbered step comments |
| Sloppy formatting | Code is artisanship | Clean, aligned, consistent |
| Lines exceeding 120 characters | Horizontal scroll, bad diffs | Break into multi-line form |
| Inline arrays/objects | Bad diffs, unreadable | Always multi-line |
| Missing trailing commas | Comma chasing in diffs | Always trail |
| Linter warnings left unresolved | Broken window theory | Zero tolerance, fix immediately |
| Writing code without tests | No safety net | TDD: test comes before code |
| "We'll add tests later" | Tests never come | There is no later |
| Type suppressions (`as any`, `@ts-ignore`) | Hides real issues | Fix the underlying type problem |
| Empty catch blocks | Silent failures | Handle or report every error |
