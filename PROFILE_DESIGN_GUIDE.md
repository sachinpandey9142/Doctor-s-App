# Profile Screen Design Guide - Premium Healthcare Social App

## 🎨 Design Philosophy

The profile screen has been redesigned as a **premium, modern healthcare social platform** combining the best aspects of:

- **LinkedIn:** Professional layout, reputation focus
- **Instagram Professional:** Visual hierarchy, engagement metrics
- **Modern SaaS:** Clean spacing, soft premium aesthetics

## 📐 Layout Structure

### Banner Section (128px)

```
┌─────────────────────────────────────┐
│  Back/Menu                    Edit  │  ← Soft transparent controls
│                                     │
│  [Linear Gradient: Blue → Cyan]    │  ← Subtle medical-themed gradient
└─────────────────────────────────────┘
     ↓ Overlaps -28px
  ┌──────────────────────────────────────┐
  │ ╔════════╗              ┌──────────┐ │
  │ ║ Avatar ║              │Reputation│ │  ← Floating card
  │ ║ 104px  ║              └──────────┘ │
  │ ╚════════╝                           │
  │                                      │
  │ Name (26px Bold)                     │
  │ Role (11px, Uppercase, Blue)         │
  │ Location/Hospital (12px, Gray)       │
  │                                      │
  │ Bio Text (13px, Regular)             │
  │                                      │
  └──────────────────────────────────────┘
```

### Profile Card Stack

```
1. Hero Card (Profile Info + Avatar + Reputation)
   ↓ 16px gap
2. Stats Card (Posts, Followers, Following, Reputation)
   ↓ 16px gap
3. Action Buttons (Follow/Edit, Message/Admin)
   ↓ 20px gap
4. Highlights Row (Story-like circles)
   ↓ Tab Bar
5. Content (Posts Grid or Feed)
```

## 🎯 Component Specifications

### Profile Hero Card

- **Banner Height:** 128px (compact)
- **Card Border Radius:** 28px
- **Avatar Size:** 104px with 4px white border
- **Avatar Position:** Absolute, overlaps -28px
- **Reputation Card:** Floating, top-right corner, 110x100px
- **Shadow:** elevation 2, opacity 0.06
- **Spacing:**
  - Horizontal margins: 16px from screen edges
  - Avatar to name: 20px padding in card
  - Bio margin-top: 6px

### Typography Hierarchy

```
Profile Name
├─ Font: SpaceGrotesk_700Bold
├─ Size: 26px
├─ Line Height: 32px
├─ Letter Spacing: -0.4px
└─ Color: textPrimary

Role/Position
├─ Font: Manrope_700Bold
├─ Size: 11px
├─ Case: UPPERCASE
├─ Letter Spacing: 0.8px
└─ Color: primary (#2563EB)

Hospital/Location
├─ Font: Manrope_500Medium
├─ Size: 12px
├─ Line Height: 18px
└─ Color: textSecondary

Bio
├─ Font: Manrope_500Medium
├─ Size: 13px
├─ Line Height: 19px
└─ Color: textPrimary
```

### Stats Card

- **Height:** 76px minimum per stat item
- **Items:** 4 equal-width columns
- **Border Radius:** 24px
- **Spacing:** 12px padding
- **Dividers:** Hairline, light gray
- **Values:** 16px bold, primary/accent colored
- **Labels:** 10px uppercase, gray

### Action Buttons

- **Height:** 46px minimum
- **Border Radius:** 20px
- **Gap Between:** 12px
- **Padding:** 20px horizontal
- **Shadow:** Soft, elevation 1-2
- **States:**
  - Primary: Gradient fill, shadow
  - Secondary: Light blue background, border
  - Ghost: Transparent, border outline

### Highlights Row

- **Circle Size:** 82px
- **Spacing Between:** 16px
- **Border Radius:** 41px (50% of size)
- **Gradient Ring:** 2px colorful border
- **Items:** 4 visible, horizontal scroll
- **Label:** Below circle, 11px bold
- **Date:** Muted gray, 9px, below label

### Tab Bar

- **Height:** 44px minimum per tab
- **Indicators:** Bottom border (2px) instead of background
- **Spacing:** No gap between tabs
- **Active State:** Bottom border colored (#2563EB)
- **Inactive:** Gray text, no bottom border

## 🎨 Color System

### Primary Colors

```
Primary Blue:    #2563EB  (Main CTA, active states)
Cyan Accent:     #06B6D4  (Gradients, secondary visual)
Success Green:   #16A34A  (Trending, positive)
```

### Surface Colors

```
Background:      #F8FAFC  (Page background)
Surface:         #FFFFFF  (Card backgrounds)
Border Light:    #F1F5F9  (Subtle dividers)
Border:          #E2E8F0  (Normal borders)
```

### Text Colors

```
Primary:         #0F172A  (Main text, 87% contrast)
Secondary:       #64748B  (Secondary info, 74% contrast)
Tertiary:        #94A3B8  (Muted, 65% contrast)
Inverted:        #FFFFFF  (On colored backgrounds)
```

## 📏 Spacing System

### Margins & Padding

```
Horizontal Margins:
- Cards: 16px from screen edges
- Buttons: 12px gap between
- List items: 16px gap

Vertical Spacing:
- Major sections: 20-24px
- Between components: 16px
- Within component: 12px
- Text lines: 4-8px
```

### Border Radius Progression

```
XS:   8px   (Small icons)
S:   12px   (Small buttons)
M:   18px   (Medium elements)
L:   24px   (Cards, buttons)
XL:  28px   (Large cards)
Pill: 41px+ (Circles, stories)
```

## ✨ Shadow Specifications

### Soft Shadow (Cards)

```
Color:   #0F172A (dark navy)
Offset:  0, 2px
Opacity: 0.05-0.08
Radius:  12px
Elevation: 1-2
```

### Medium Shadow (Buttons)

```
Color:   #0F172A
Offset:  0, 4px
Opacity: 0.08-0.1
Radius:  16px
Elevation: 2-3
```

### Strong Shadow (Avatar, Reputation)

```
Color:   #0F172A
Offset:  0, 4px
Opacity: 0.1-0.12
Radius:  12-16px
Elevation: 2-3
```

## 🔄 Interaction States

### Button Press

```
Scale: 0.95 (slight scale down)
Duration: Spring animation (damping: 16, stiffness: 340)
Haptic: Medium feedback
Opacity: 0.7-0.8 on disabled
```

### Tab Active

```
Bottom Border: 2px #2563EB
Text Color: primary
Icon Color: primary
```

### Card Hover/Press

```
Opacity: 0.72-0.78
No scale change for cards
Maintains visual hierarchy
```

## 📱 Responsive Considerations

- Minimum width: 320px
- Maximum width: 428px (modern mobile)
- Padding adjusts for safe area (notch, rounded corners)
- Avatar size: Fixed 104px (maintainable)
- Banner: Fixed 128px (compact)
- Stats: 4-column always (equal width)
- Grid: 3-column posts grid maintained

## 🚀 Performance Optimizations

- Smooth spring animations (not jarring)
- Lazy loading for images
- Gradient gradients (GPU accelerated)
- Minimal re-renders
- Proper key extraction in lists
- Haptic feedback (subtle, not overwhelming)

## 🎓 Design Tokens Reference

### Fonts

- Display: `SpaceGrotesk_700Bold` (headings, large text)
- Heading: `SpaceGrotesk_700Bold`
- Body: `Manrope_500Medium` (regular text)
- Body Bold: `Manrope_700Bold` (labels, emphasis)

### Gradients (Medical Theme)

```
Profile Banner:   #1E40AF → #0369A1  (Deep blue → teal)
Primary:          #2563EB → #06B6D4  (Blue → cyan)
Highlights Ring:  #2563EB → #06B6D4 → #8B5CF6  (Blue → cyan → purple)
```

## 🔍 Quality Checklist

- [x] Consistent spacing (16px system)
- [x] Professional typography hierarchy
- [x] Soft, premium shadows
- [x] Modern border radius (24-28px)
- [x] Proper color contrast (WCAG AA+)
- [x] Clean, minimal borders
- [x] Smooth animations
- [x] Production-ready code
- [x] No excessive gradients
- [x] Clear visual hierarchy
- [x] Healthcare theme consistency
- [x] Investor/demo ready appearance

## 📝 Implementation Notes

- All measurements are in pixels (React Native units)
- Colors use hex format for consistency
- Shadow values are carefully calibrated (not oversized)
- Border radius increases with component size
- Spacing follows 4px base unit (multiples of 4, 8, 12, 16, 20, 24, 28, 32)
- Typography uses consistent font families
- All interactive elements have proper press states
- Haptic feedback enhances but doesn't distract
