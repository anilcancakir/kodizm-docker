# PHP / Laravel Conventions

## Version Adaptability

Check `composer.json` → `require.php` to detect PHP version. Examples target PHP 8.2+. Apply fallbacks for older versions:

**PHP 7.4** — No promoted props, no enums, no match, no union types:

```php
class ProductService
{
    /** @var SkillDiscovery */
    protected $discovery;

    public function __construct(SkillDiscovery $discovery)
    {
        $this->discovery = $discovery;
    }
}

// Enums → class constants + validation
class SubscriptionStatus
{
    public const ACTIVE = 'active';
    public const INACTIVE = 'inactive';

    /** @var string[] */
    public const ALL = [
        self::ACTIVE,
        self::INACTIVE,
    ];

    public static function isValid(string $value): bool
    {
        return in_array($value, self::ALL, true);
    }
}

// Union types → PHPDoc
/**
 * @param string|int $identifier
 * @return Product|null
 */
public function find($identifier) { ... }
```

**PHP 8.0** — Promoted props, match, union types, named args. NO enums, NO readonly:

```php
public function __construct(
    protected SkillDiscovery $discovery,
    protected bool $cacheEnabled = true,
) {}

return match ($status) {
    'active' => 'Active',
    default => 'Unknown',
};

public function find(string|int $identifier): ?Product
```

**PHP 8.1+** — Backed enums, readonly properties, intersection types.

**PHP 8.2+** — readonly class, standalone null/true/false types, DNF types.

Style principles (docblocks, multi-line, clean imports, TDD) are version-independent. Only syntax features adapt.

---

## Naming Conventions

| Element | Convention | Example |
|---------|-----------|---------|
| Class | PascalCase | `ProductTranslationService` |
| Method | camelCase | `findOrCreate`, `bootSkillsIfNeeded` |
| Variable / Property | camelCase | `$targetLocale`, `protected array $loaded = []` |
| Constant / Enum Case | UPPER_SNAKE | `case ACTIVE = 'active'` |
| Config Key | snake_case | `services.stripe.secret_key` |
| DB Column | snake_case | `current_team_id`, `image_path` |
| Route Name | kebab-case dotted | `ai-product-creator.translate-product` |
| Route URL Prefix | camelCase | `productTypes`, `aiProductCreator` |
| Form Request | `StoreRequest`, `UpdateRequest` | Grouped by entity folder |
| Resource | `{Model}Resource` | `ProductResource` |
| Service | `{Domain}Service` | `ProductTranslationService` |
| Contract | `{Domain}ServiceContract` | `BarcodeScannerServiceContract` |
| Support | `{Domain}Support` | `ImageSupport`, `StringSupport` |
| Scope | `{Name}Scope` | `TeamScope` |

---

## Directory Structure (Application)

```
app/
├── Console/              # Artisan commands
├── Contracts/            # Interfaces
├── Enums/                # String-backed enums
├── Events/
├── Exceptions/
├── Http/
│   ├── Controllers/
│   │   └── API/          # API controllers (own namespace)
│   ├── Middleware/
│   ├── Requests/         # Grouped: Requests/Product/StoreRequest.php
│   └── Resources/        # JsonResource classes
├── Jobs/
├── Listeners/
├── Models/
│   ├── Concerns/         # Shared model logic
│   ├── Scopes/           # Global scopes (TeamScope)
│   └── Traits/           # Model-specific traits
├── Policies/
├── Providers/
├── Rules/                # Custom validation rules
├── Services/             # Business logic
│   └── BarcodeScanners/  # Sub-domain grouping
└── Supports/             # Static utility classes (plural)
```

- Form Requests grouped by entity: `Requests/Product/StoreRequest.php`, NOT `StoreProductRequest.php`
- Utility classes in `Supports/` (plural), not `Helpers/`

## Directory Structure (Package)

```
src/
├── Console/
├── Enums/
├── Support/              # Core logic (singular for packages)
├── Tools/
├── Traits/               # Primary integration: trait-first API
└── SkillsServiceProvider.php
config/
stubs/
tests/
    ├── Unit/
    └── Feature/
```

- Package API is **trait-first**: `use Skillable;` not extend a base class
- Single ServiceProvider per package. No Facades unless necessary.

---

## Controller Pattern

```php
class ProductController extends Controller
{
    protected SubscriptionUsageService $subscriptionUsageService;

    public function __construct(SubscriptionUsageService $subscriptionUsageService)
    {
        $this->subscriptionUsageService = $subscriptionUsageService;
    }

    /** List products with search, filters, and pagination. */
    public function index(Request $request): AnonymousResourceCollection
    {
        $query = Product::search($request->get('search'));
        $products = $query->paginate(25);

        return ProductResource::collection($products);
    }

    /** Create a new product inside a DB transaction. */
    public function store(StoreRequest $request): ProductResource
    {
        $attributes = $request->validated();

        $product = DB::transaction(function () use ($attributes) {
            return Product::create([
                ...$attributes,
                'team_id' => auth()->user()->current_team_id,
            ]);
        });

        return new ProductResource($product);
    }

    /** Show a product with authorization and eager-loaded relations. */
    public function show(Product $product): ProductResource
    {
        Gate::authorize('view', $product);
        $product->load(
            'productType.icon',
            'barcodes',
            'productLocations.location.icon',
            'tags',
        );

        return new ProductResource($product);
    }
}
```

- Return types ALWAYS explicit
- `store`/`update` use Form Requests, NOT inline validation
- `show`/`update` use `Gate::authorize()`
- Multi-model writes in `DB::transaction()`
- Spread operator: `[...$attributes, 'team_id' => ...]`

---

## Model Pattern

```php
/**
 * @property string $id
 * @property string $name
 * @property string $team_id
 * @property-read Collection<int, Barcode> $barcodes
 */
class Product extends Model
{
    use HasFactory, HasUuids, Searchable;

    protected $fillable = [
        'team_id',
        'name',
        'description',
    ];

    protected static function booted(): void
    {
        static::addGlobalScope(new TeamScope);
    }

    public function team(): BelongsTo
    {
        return $this->belongsTo(Team::class);
    }

    public function barcodes(): BelongsToMany
    {
        return $this->belongsToMany(Barcode::class);
    }
}
```

- UUID primary keys via `HasUuids`
- Multi-tenancy via `TeamScope` in `booted()`
- `$fillable` (NOT `$guarded`)
- Explicit relation return types
- `toAiString()` on models needing AI representation

---

## Service Pattern

```php
class ProductTranslationService
{
    /** Orchestrate finding or creating a translated product. */
    public function findOrCreate(Team $team, User $user, array $data): GlobalProduct
    {
        // 1. Check if already exists.
        if ($existing = $this->findProductByLocale(...)) {
            return $existing;
        }

        // 2. Find base product as translation source.
        $base = $this->findBaseProduct(...);

        try {
            // 3. Translate via AI.
            $translated = $this->translateViaAI($base, $data['locale']);

            // 4. Create and return.
            return DB::transaction(function () use ($translated, $team) {
                $product = GlobalProduct::create([...$translated, 'team_id' => $team->id]);
                $this->syncBarcodes($product, collect($translated['barcodes']));

                return $product;
            });
        } catch (Throwable $exception) {
            report($exception);
            throw new RuntimeException('Failed to translate product.');
        }
    }

    private function findProductByLocale(string $locale, ?int $id, ?string $barcode): ?GlobalProduct { ... }
    private function findBaseProduct(?int $id, ?string $barcode): ?GlobalProduct { ... }
    private function syncBarcodes(GlobalProduct $product, Collection $barcodes): void { ... }
}
```

- One public orchestrator + private helpers
- Error: `catch (Throwable)` → `report()` → throw user-friendly
- Deps via constructor OR method params

---

## Form Request Pattern

```php
class StoreRequest extends FormRequest
{
    public function authorize(): bool
    {
        return Auth::check();
    }

    public function rules(): array
    {
        return [
            'name' => [
                'required',
                'string',
                'max:255',
            ],
            'productType.id' => [
                'nullable',
                'exists:product_types,id,team_id,' . auth()->user()->current_team_id,
            ],
            'barcodes' => [
                'nullable',
                'array',
            ],
            'barcodes.*.code' => [
                'nullable',
                new BarcodeRule,
            ],
        ];
    }
}
```

- Rules ALWAYS arrays, never pipe-delimited
- `exists` rules include team scoping
- Custom Rule objects for domain validation
- Nested: `'productType.id'`, `'barcodes.*.code'`

---

## API Resource Pattern

```php
/**
 * @mixin Product
 */
class ProductResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'available_quantity' => $this->whenLoaded('productLocations', function () {
                return $this->available_quantity;
            }),
            'productType' => new ProductTypeResource($this->whenLoaded('productType')),
            'tags' => TagResource::collection($this->whenLoaded('tags')),
            'image' => $this->image_path ? Storage::cloud()->url($this->image_path) : null,
        ];
    }
}
```

- `@mixin Model` for IDE autocomplete
- `whenLoaded()` prevents N+1
- Nested resources for related models
- URLs computed in resource, not stored in DB

---

## Route Organization

```php
Route::middleware('auth:sanctum')->group(function () {
    Route::prefix('products')->group(function () {
        Route::get('/', [ProductController::class, 'index'])->name('products.index');
        Route::post('/', [ProductController::class, 'store'])->name('products.store');
        Route::get('{product}', [ProductController::class, 'show'])->name('products.show');
        Route::put('{product}', [ProductController::class, 'update'])->name('products.update');
    });
});
```

- `Route::prefix()->group()`, NOT `Route::resource()` (explicit > implicit)
- URL prefixes: camelCase. Names: kebab-case with dots.
- Throttle middleware on expensive endpoints individually

---

## Enum Pattern

```php
enum SubscriptionStatus: string implements HasLabel
{
    case ACTIVE = 'active';
    case INACTIVE = 'inactive';
    case CANCELED = 'canceled';

    public function getLabel(): string
    {
        return match ($this) {
            self::ACTIVE => __('Active'),
            self::INACTIVE => __('Inactive'),
            self::CANCELED => __('Canceled'),
        };
    }

    /** Try to create from user input with alias support. */
    public static function tryFromInput(mixed $value): ?self
    {
        if ($value instanceof self) {
            return $value;
        }

        $normalized = strtolower(trim($value));

        return match ($normalized) {
            'lite', 'lazy' => self::Lite,
            'full', 'eager' => self::Full,
            default => null,
        };
    }
}
```

- ALWAYS string-backed, UPPER_SNAKE case names
- Implement `HasLabel` for UI
- `tryFromInput` with alias support

---

## Constructor Patterns

```php
// Promoted (preferred for services/packages)
public function __construct(
    protected SkillDiscovery $discovery,
) {}

// Multiple promoted
public function __construct(
    protected array $paths,
    protected bool $cacheEnabled = true,
    protected int $cacheTtl = 3600,
) {}

// readonly class for value objects
readonly class Skill
{
    public function __construct(
        public string $name,
        public string $description,
        public array $tools,
    ) {}
}
```

---

## Import Style

```php
use App\Models\Product;
use Illuminate\Support\Facades\DB;
use RuntimeException;
use Throwable;
```

- Group: PHP built-ins → Framework → App → same namespace
- Import exceptions: `use RuntimeException;` (never `\RuntimeException`)
- One use per line

---

## Comment Style

```php
/** @mixin Product */
class ProductResource extends JsonResource

/**
 * @property string $id
 * @property-read Collection<int, Barcode> $barcodes
 * @method static Builder<static>|Product newQuery()
 */
class Product extends Model

/** Determine if the skill has any tools. */
public function hasTools(): bool

/**
 * Find an existing translated product or create a new one.
 *
 * @param  Team  $team  The team requesting the product.
 * @param  array  $data  The attributes for lookup/creation.
 * @return GlobalProduct
 *
 * @throws RuntimeException
 */
public function findOrCreate(Team $team, User $user, array $data): GlobalProduct
```

---

## Service Provider (Package)

```php
class SkillsServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->mergeConfigFrom(__DIR__ . '/../config/skills.php', 'skills');

        if (! config('skills.enabled', true)) {
            return;
        }

        $this->app->singleton(SkillDiscovery::class, function ($app) {
            $cacheEnabled = filter_var(
                config('skills.cache.enabled'),
                FILTER_VALIDATE_BOOLEAN,
                FILTER_NULL_ON_FAILURE,
            );

            if ($cacheEnabled === null) {
                $cacheEnabled = ! $app->environment('local', 'testing');
            }

            return new SkillDiscovery(
                paths: config('skills.paths', [resource_path('skills')]),
                cacheEnabled: $cacheEnabled,
            );
        });
    }

    public function boot(): void
    {
        if ($this->app->runningInConsole()) {
            $this->publishes([...], 'skills-config');
            $this->commands([...]);
        }
    }
}
```

- `mergeConfigFrom()` in `register()`
- `publishes()`/`commands()` inside `runningInConsole()`
- Defensive config with sensible fallbacks
- `singleton` for shared state, `scoped` for request-lifecycle

---

## Testing

```
tests/
├── Feature/    # Full HTTP cycle
└── Unit/       # Isolated logic (services, value objects)
```

- PHPUnit 11 (apps), PHPUnit 10-11 + orchestra/testbench (packages)
- Factories with dynamic creation/cleanup
- Naming: `test_{action}_{condition}_{expected_result}`
- Every test method has `: void` return type

---

## Tooling

| Tool | Config | Purpose |
|------|--------|---------|
| Laravel Pint | `pint.json` → `{"preset": "laravel"}` | Code style |
| PHPUnit | `phpunit.xml` | Testing |
| Composer | `composer.json` | Dependencies, PSR-4 |
| EditorConfig | `.editorconfig` | Editor settings |
