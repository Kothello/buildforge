# SteelFlow One - Design Guidelines

## Design Philosophy
World-class luxury software that feels like "flying a spaceship made of black glass and money." Every interaction must be jaw-dropping. This is desktop-first power workflow with zero compromises on mobile.

## Visual Design System

### Color Palette
- **Base**: Deep charcoal backgrounds (#0F1419, #1A1F2E)
- **Primary**: Electric blue (#0EA5E9, #38BDF8) for CTAs, accents, highlights
- **Success**: Vibrant green (#10B981) for won deals, positive actions
- **Warning**: Amber (#F59E0B) for warming leads, attention states
- **Glassmorphism**: Cards use `backdrop-blur-xl` with subtle borders and gradients

### Typography
- **Body & UI**: Inter for all interface text, data, labels
- **Headlines & Impact**: Satoshi or Neue Montreal for hero text, section headers
- **Sizes**: Generous scale - 48px+ for hero headlines, 16px minimum for body text
- **Weight**: Use 400 (regular), 600 (semibold), 700 (bold) consistently

### Spacing & Layout
- **Tailwind units**: Primary spacing rhythm uses 4, 6, 8, 12, 16, 24, 32 (p-4, p-6, p-8, etc.)
- **Desktop-first**: Optimize for large screens (1440px+), generous white space
- **Grid system**: Dashboard uses 12-column grid, asymmetric layouts encouraged
- **Breathing room**: Never cram - luxury means space

## Component Design

### Cards & Containers
- Glassmorphism treatment: `bg-slate-900/50 backdrop-blur-xl border border-slate-800/50`
- Subtle shadow glows on hover: `shadow-xl shadow-blue-500/10`
- Rounded corners: `rounded-xl` (12px) for cards, `rounded-lg` for nested elements
- Lead cards slide in from right with Framer Motion spring animations

### Buttons
- **Primary CTAs**: Giant, obvious, electric blue with glow effects
  - Desktop: Minimum 48px height, generous padding (px-8 py-4)
  - Hover: Brighten + subtle scale (1.02) + glow intensifies
- **Action trio** (Call/Text/Email): Equal width, stacked vertically in sidebar, icon + label
- **Secondary**: Outlined style with border-slate-700, hover fills with slate-800
- Blurred backgrounds when overlaying images: `bg-slate-900/80 backdrop-blur-md`

### Drawers & Sidebars
- Right sidebar for lead details: 480px width, slides in smoothly
- No modals - use drawers or inline expansion instead
- Auto-opens when lead card clicked, showing 3D viewer immediately

### Drag & Drop Zones
- Large, inviting drop zones with dashed borders (`border-2 border-dashed border-slate-600`)
- Hover state: Border becomes solid electric blue, background lightens
- Upload icon + "Drop anything - emails, screenshots, CSV" messaging

## Animations & Motion

### Micro-Interactions (Framer Motion)
- Card hover: Lift slightly (`y: -4`) with shadow increase
- Button clicks: Quick scale down (0.95) then spring back
- New lead appears: Slide in from right with fade-in (`x: 100, opacity: 0` → `x: 0, opacity: 1`)
- Success actions: Confetti burst for hot leads/deals won

### Loading States
- Beautiful skeleton screens with shimmer gradient animation
- Never show spinners - use skeleton cards that match final content structure
- Shimmer: Gradient moving from `slate-800` → `slate-700` → `slate-800`

### Transitions
- All transitions use spring physics: `type: "spring", stiffness: 300, damping: 30`
- Page transitions: Smooth fade with slight vertical movement
- Drawer slides: Ease-out timing, 300ms duration

## Key Screens & Flows

### Dashboard (Morning Brief)
- Hero section: "Good morning, [Name]" with user avatar, current time
- Top 10 hottest deals in priority cards (temperature meter: cold→warm→hot→fire icons)
- Each card shows: Company name, building specs, AI-written script preview, one-click send button
- Temperature visualization: Gradient from blue (cold) to red (hot) with flame icon

### Lead Detail View (Split Screen)
- **Left 50%**: Full embedded 3D building viewer with rotation controls + screenshot button
- **Right 50%**: 
  - Top: Giant Call/Text/Email action buttons (stacked, full width)
  - AI-generated first message in highlighted box
  - Pricing breakdown table (building specs, cost, price, margin %)
  - Activity timeline with icons
  - Contract status badge + deposit button

### Pipeline Board
- Horizontal columns: New → Contacted → Quote Sent → Negotiating → Won/Lost
- Lead cards drag smoothly between columns (@dnd-kit)
- Drop zones highlight in electric blue when dragging
- Card count badges on column headers

### Mobile (PWA)
- Bottom navigation bar with 5 core actions (thumb-friendly)
- Bottom sheets instead of modals
- Swipe actions on lead cards (swipe right = call, left = archive)
- Large touch targets: Minimum 44px for all tappable elements
- Native-feeling animations (iOS-style spring bounces)

## Images
- **No hero images** - This is a data-dense dashboard application, not a marketing site
- **3D building renders**: Embedded in lead detail views (generated or placeholder)
- **User avatars**: Circular, 40px in navigation, 80px in morning greeting
- **Icons**: Use Heroicons throughout for consistency (outline style for secondary, solid for primary actions)

## Accessibility
- Electric blue primary (#0EA5E9) meets WCAG AA on dark backgrounds
- Focus states: 2px electric blue ring (`ring-2 ring-blue-500`)
- Keyboard shortcuts for all primary actions (displayed in tooltips)
- All interactive elements minimum 44x44px touch target