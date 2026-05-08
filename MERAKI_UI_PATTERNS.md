# MerakiUI Implementation Guide for Arcane Kitchen 🧙‍♀️

This document outlines the MerakiUI Tailwind CSS patterns used throughout the Arcane Kitchen project.

## Color Palette Integration

Based on `/IMPROVEMENTS/color-manifest.md`, we use these custom colors in Tailwind:

### Primary Colors
- `cauldron-green` - Primary brand color (#3A5A40)
- `spellbook-brown` - Backgrounds (#5C4033)
- `golden-ember` - Highlights & CTAs (#D4A017)
- `arcane-violet` - Secondary/magical accents (#6C4AB6)
- `moonlight-cream` - Backgrounds (#FAF3E0)
- `nightshade-blue` - Text/headers (#1E2749)
- `ash-gray` - Subtext (#B8B8B8)
- `ember-red` - Alerts (#B33939)

## Component Patterns

### Buttons (MerakiUI Style)

#### Primary Button
```tsx
<button className="px-6 py-3 text-sm font-medium tracking-wide text-moonlight-cream capitalize transition-colors duration-300 transform bg-cauldron-green rounded-lg hover:bg-cauldron-dark focus:outline-none focus:ring focus:ring-cauldron-green focus:ring-opacity-50">
  Primary Action
</button>
```

#### Secondary Button
```tsx
<button className="px-6 py-3 text-sm font-medium tracking-wide text-nightshade-blue capitalize transition-colors duration-300 transform bg-golden-ember rounded-lg hover:bg-golden-dark focus:outline-none focus:ring focus:ring-golden-ember focus:ring-opacity-50">
  Secondary Action
</button>
```

#### Outline Button
```tsx
<button className="px-6 py-3 text-sm font-medium tracking-wide text-cauldron-green capitalize transition-colors duration-300 transform border-2 border-cauldron-green rounded-lg hover:bg-cauldron-green hover:text-moonlight-cream focus:outline-none focus:ring focus:ring-cauldron-green focus:ring-opacity-50">
  Outline Action
</button>
```

### Cards (MerakiUI Style)

#### Basic Card
```tsx
<div className="max-w-2xl px-8 py-4 bg-spellbook-brown/80 backdrop-blur-sm rounded-lg shadow-md">
  <div className="flex items-center justify-between">
    <span className="text-sm font-light text-ash-gray">Date</span>
    <span className="px-3 py-1 text-sm font-bold text-moonlight-cream bg-cauldron-green rounded">Badge</span>
  </div>
  <div className="mt-2">
    <h2 className="text-xl font-bold text-moonlight-cream">Card Title</h2>
    <p className="mt-2 text-ash-gray">Card content goes here...</p>
  </div>
</div>
```

#### Hover Card
```tsx
<div className="max-w-2xl overflow-hidden bg-spellbook-brown/80 backdrop-blur-sm rounded-lg shadow-lg hover:shadow-mystical-glow transition-all duration-300 transform hover:scale-105">
  <img className="object-cover w-full h-64" src="/image.jpg" alt="" />
  <div className="p-6">
    <h2 className="text-2xl font-semibold text-moonlight-cream">Title</h2>
    <p className="mt-2 text-ash-gray">Description...</p>
  </div>
</div>
```

### Forms & Inputs (MerakiUI Style)

#### Text Input
```tsx
<div>
  <label className="block text-sm font-medium text-moonlight-cream">Label</label>
  <input
    type="text"
    className="block w-full px-4 py-2 mt-2 text-moonlight-cream bg-spellbook-brown/60 border border-cauldron-green rounded-lg focus:border-golden-ember focus:ring-golden-ember focus:outline-none focus:ring focus:ring-opacity-40 transition-colors duration-300"
    placeholder="Enter text..."
  />
</div>
```

#### Select Dropdown
```tsx
<div>
  <label className="block text-sm font-medium text-moonlight-cream">Select Option</label>
  <select className="block w-full px-4 py-2 mt-2 text-moonlight-cream bg-spellbook-brown/60 border border-cauldron-green rounded-lg focus:border-golden-ember focus:ring-golden-ember focus:outline-none focus:ring focus:ring-opacity-40 transition-colors duration-300">
    <option>Option 1</option>
    <option>Option 2</option>
  </select>
</div>
```

#### Checkbox
```tsx
<label className="flex items-center">
  <input
    type="checkbox"
    className="w-5 h-5 text-cauldron-green bg-spellbook-brown border-cauldron-green rounded focus:ring-cauldron-green focus:ring-opacity-50"
  />
  <span className="ml-2 text-moonlight-cream">Checkbox Label</span>
</label>
```

### Navigation (MerakiUI Style)

#### Sidebar Item
```tsx
<a className="flex items-center px-4 py-2 text-moonlight-cream rounded-lg hover:bg-cauldron-green/30 transition-colors duration-300">
  <svg className="w-5 h-5" /* icon SVG */ />
  <span className="mx-4 font-medium">Menu Item</span>
</a>
```

#### Active Sidebar Item
```tsx
<a className="flex items-center px-4 py-2 text-moonlight-cream bg-cauldron-green rounded-lg">
  <svg className="w-5 h-5" /* icon SVG */ />
  <span className="mx-4 font-medium">Active Item</span>
</a>
```

### Badges & Tags (MerakiUI Style)

#### Badge
```tsx
<span className="px-3 py-1 text-xs font-semibold text-moonlight-cream bg-cauldron-green rounded-full">
  Badge
</span>
```

#### Tag (Dismissible)
```tsx
<span className="inline-flex items-center px-3 py-1 text-sm font-medium text-moonlight-cream bg-arcane-violet rounded-full">
  Tag Name
  <button className="ml-2 hover:text-ash-gray transition-colors duration-200">
    <svg className="w-4 h-4" /* close icon */ />
  </button>
</span>
```

### Alerts & Notifications (MerakiUI Style)

#### Success Alert
```tsx
<div className="flex w-full max-w-sm overflow-hidden bg-spellbook-brown rounded-lg shadow-md">
  <div className="flex items-center justify-center w-12 bg-cauldron-green">
    <svg className="w-6 h-6 text-moonlight-cream" /* checkmark icon */ />
  </div>
  <div className="px-4 py-2 -mx-3">
    <div className="mx-3">
      <span className="font-semibold text-cauldron-green">Success</span>
      <p className="text-sm text-ash-gray">Action completed successfully!</p>
    </div>
  </div>
</div>
```

#### Error Alert
```tsx
<div className="flex w-full max-w-sm overflow-hidden bg-spellbook-brown rounded-lg shadow-md">
  <div className="flex items-center justify-center w-12 bg-ember-red">
    <svg className="w-6 h-6 text-moonlight-cream" /* error icon */ />
  </div>
  <div className="px-4 py-2 -mx-3">
    <div className="mx-3">
      <span className="font-semibold text-ember-red">Error</span>
      <p className="text-sm text-ash-gray">Something went wrong!</p>
    </div>
  </div>
</div>
```

### Modals (MerakiUI Style)

#### Modal Container
```tsx
<div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
  <div className="flex items-end justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
    {/* Background overlay */}
    <div className="fixed inset-0 bg-nightshade-blue bg-opacity-75 transition-opacity" aria-hidden="true"></div>

    {/* Modal panel */}
    <div className="inline-block align-bottom bg-spellbook-brown rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
      <div>
        <h3 className="text-lg font-medium text-moonlight-cream" id="modal-title">
          Modal Title
        </h3>
        <div className="mt-2">
          <p className="text-sm text-ash-gray">
            Modal content...
          </p>
        </div>
      </div>
      <div className="mt-5 sm:mt-6 sm:flex sm:flex-row-reverse">
        <button className="w-full inline-flex justify-center rounded-lg border border-transparent shadow-sm px-4 py-2 bg-cauldron-green text-base font-medium text-moonlight-cream hover:bg-cauldron-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cauldron-green sm:ml-3 sm:w-auto sm:text-sm transition-colors duration-300">
          Confirm
        </button>
        <button className="mt-3 w-full inline-flex justify-center rounded-lg border border-ash-gray shadow-sm px-4 py-2 bg-spellbook-brown text-base font-medium text-ash-gray hover:bg-spellbook-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ash-gray sm:mt-0 sm:w-auto sm:text-sm transition-colors duration-300">
          Cancel
        </button>
      </div>
    </div>
  </div>
</div>
```

### Loading States (MerakiUI Style)

#### Spinner
```tsx
<div className="flex items-center justify-center">
  <div className="w-8 h-8 border-4 border-cauldron-green border-t-transparent rounded-full animate-spin"></div>
</div>
```

#### Loading Dots
```tsx
<div className="flex space-x-2 justify-center items-center">
  <div className="w-2 h-2 bg-cauldron-green rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
  <div className="w-2 h-2 bg-golden-ember rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
  <div className="w-2 h-2 bg-arcane-violet rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
</div>
```

## Best Practices

1. **Always use backdrop-blur** for cards and modals: `backdrop-blur-sm` or `backdrop-blur-md`
2. **Consistent transitions**: Use `transition-colors duration-300` or `transition-all duration-300`
3. **Focus states**: Always include `focus:outline-none focus:ring focus:ring-{color} focus:ring-opacity-50`
4. **Hover effects**: Add subtle scale transforms: `hover:scale-105` or background changes
5. **Responsive design**: Use `sm:`, `md:`, `lg:` breakpoints consistently
6. **Opacity for overlays**: Use colors with opacity like `bg-spellbook-brown/80` for glassmorphism effects
7. **Shadow hierarchy**: 
   - Cards: `shadow-md`
   - Hover states: `shadow-lg` or `shadow-mystical-glow`
   - Modals: `shadow-xl`

## Component Templates

### Profile Card
```tsx
<div className="max-w-xs overflow-hidden bg-spellbook-brown/80 backdrop-blur-sm rounded-lg shadow-lg">
  <img className="object-cover w-full h-56" src="/avatar.jpg" alt="Avatar" />
  <div className="py-5 text-center">
    <h3 className="text-2xl font-bold text-moonlight-cream">User Name</h3>
    <span className="text-sm text-ash-gray">Kitchen Witch</span>
    <div className="flex items-center justify-center mt-4 space-x-2">
      <span className="px-3 py-1 text-xs font-semibold text-moonlight-cream bg-cauldron-green rounded-full">
        Level 5
      </span>
      <span className="px-3 py-1 text-xs font-semibold text-moonlight-cream bg-arcane-violet rounded-full">
        Herbalist
      </span>
    </div>
  </div>
</div>
```

### Recipe Card
```tsx
<article className="overflow-hidden rounded-lg shadow transition hover:shadow-mystical-glow">
  <img alt="" src="/recipe.jpg" className="h-56 w-full object-cover" />
  <div className="bg-spellbook-brown/80 backdrop-blur-sm p-4 sm:p-6">
    <time className="block text-xs text-ash-gray">Date</time>
    <h3 className="mt-0.5 text-lg text-moonlight-cream">Recipe Title</h3>
    <p className="mt-2 line-clamp-3 text-sm/relaxed text-ash-gray">
      Recipe description...
    </p>
    <div className="mt-4 flex gap-2">
      <span className="whitespace-nowrap rounded-full bg-cauldron-green px-2.5 py-0.5 text-xs text-moonlight-cream">
        30 min
      </span>
      <span className="whitespace-nowrap rounded-full bg-golden-ember px-2.5 py-0.5 text-xs text-nightshade-blue">
        Easy
      </span>
    </div>
  </div>
</article>
```

Remember: MerakiUI emphasizes clean, modern design with smooth transitions and accessibility. Keep the mystical theme while maintaining usability! ✨
