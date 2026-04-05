# Voice Guide

## Tone Spectrum

```
Blog/Article ←――――――――――――――――――→ API Reference
     ↑                                    ↑
 Personal,                          Dry, formal,
 narrative                          no personality

     Article Mode              Doc Mode
         ↓                        ↓
  Conversational +         Professional +
  encouraging              approachable
  (sits left)              (sits middle-right)
```

---

## Documentation Mode

### Section Introductions

```markdown
<!-- Direct statement + context -->
Middleware provides a mechanism for filtering HTTP requests.

<!-- Problem → Solution framing -->
Managing routes can become complex. Route groups help organize related routes.

<!-- Brief scope -->
This section covers authentication configuration.
```

### Transitions

```markdown
<!-- Good -->
Let's look at the configuration:
Now, let's move to validation:
Here's the complete example:
Consider this approach:

<!-- Bad — too casual for docs -->
Alright, now we're going to...
So, what I usually do is...
```

### Code Introductions

```markdown
<!-- Before code -->
Let's start with a basic example:
Here's how to define a route:
The following example demonstrates:

<!-- After code -->
This creates a... / This returns... / The result is...
```

### Comparisons

```markdown
### Traditional Approach
[code]

### With Wind
[code]

See the difference? The widget tree is flattened.
```

### Closing

```markdown
<!-- End naturally — no closing phrase. Ever. -->
[Documentation ends after last technical content]
```

### Callouts

```markdown
> [!NOTE]
> Helpful additional information.

> [!WARNING]
> Important caveat or potential issue.
```

---

## Article Mode

### Openings

```markdown
<!-- Series introduction -->
Today, I'm starting a story series about [topic] after a long time break.

<!-- Tutorial introduction -->
Today, I'll give some examples for [topic].

<!-- Problem-driven -->
Sometimes, we should use [technique] for [reason].
```

Include prerequisite redirect: "If you don't know Flutter, you can start in here."

### Body Flow

1. Brief explanation (1-2 sentences)
2. Code block
3. "Let's give it a shot." + screenshot/result
4. Quick observation: "It's cool." / "That's good."

### Transitions

- "Next, [action]"
- "Now, we can start to..."
- "Yes, we have [X] now. So, [next step]"
- "Time to start!"

### Closings

- "That's all."
- "Have a nice day."
- "Don't forget to follow me for the next stories!"

---

## Sentence Structure

- Prefer active voice
- Keep sentences concise
- Lead with action: "Use `php artisan` to generate..." not "You can use..."
- Second person "you" is fine, don't overuse
- First person "I" freely in articles, sparingly in docs

---

## Commit Messages

Conventional Commits format:

```
<type>(<scope>): <description>

feat(pool): add creation endpoint with validation
fix(auth): resolve token expiry on refresh
refactor(barcode): extract validation to service
docs(api): update product reference
chore(deps): upgrade Laravel to v12
```

- Imperative mood in description
- Lowercase after colon
- No period at end
- Scope optional but preferred

---

## PR Descriptions

```markdown
## What
- Brief description of changes

## Why
- Motivation and context

## Testing
- How to verify the changes
```

---

## Reference Style (Laravel Docs)

```markdown
Laravel's database query builder provides a convenient, fluent interface
for creating and running database queries.

The `where` method accepts three arguments: the column name, an operator,
and the value to compare against.
```
