# Freudenhaus Ski Rental - Rent Buddy Booking Flow Documentation
**URL:** https://freudenhaus.rentbuddy.solutions/#/de  
**Date of Exploration:** November 15, 2026  
**Language:** German (de)

---

## Executive Summary

Freudenhaus uses the Rent Buddy platform for their online ski equipment rental booking. The flow follows a multi-step wizard approach with a persistent header showing booking progress. The design emphasizes high-quality mountain photography with a minimalist, modern UI using a dark grey/white/transparent color palette.

---

## Technical Stack Observations

- **Framework:** Vue.js (evidenced by `v-overlay`, `data-v-app` attributes, `v-overlay-scroll-blocked` classes)
- **UI Library:** Likely Vuetify or similar Vue.js component framework
- **Routing:** Hash-based SPA routing (`#/de`, `#/en`, `#/nl`)
- **Localization:** Multi-language support (German, English, Dutch)
- **CSS Theming:** CSS variables for theme management (`--v-theme-section1`, `--v-theme-font`)

---

## Booking Flow Steps

### Step 0: Landing & Cookie Consent
**URL:** `#/de`  
**Screenshot:** Initial landing with cookie modal

**Elements:**
- **Cookie Modal** (Mandatory GDPR compliance gate)
  - Title: "Cookies"
  - Language switcher: `de | en | nl`
  - German copy explaining data processing
  - **Primary CTA:** "Alle akzeptieren (inkl. US-Anbieter)" (Accept all, including US providers) - Dark grey button
  - **Secondary:** "Ablehnen" (Decline) - White outline button
  - Footer links: "Impressum | Datenschutz" (Legal Notice | Privacy Policy)

**UX Pain Point:** Large blocking modal prevents any interaction with the booking flow until dismissed.

---

### Step 1: People Selection
**URL:** `#/de`  
**Screenshot:** `/agent/step_01_people_selection.webp`

**Header Elements:**
- **Logo:** "FREUDENHAUS" in centered square icon
- **Top Right:** "Anmelden" (Login) link with user icon
- **Language switcher:** `de | en | nl`

**Main Content:**
- **Background:** Full-screen hero image of snowy mountains at sunset/sunrise
- **Heading:** "WIE VIELE PERSONEN MÖCHTEN LEIHEN?" (How many people want to rent?)
- **Dropdown Selector:**
  - Person icon on left
  - Current selection: "2x Erwachsen" (2x Adults)
  - Chevron down on right
- **Secondary link:** "Neu starten?" (Start over?)

**Key German Labels:**
- Erwachsen = Adults
- Personen = People
- Anmelden = Login
- Neu starten = Start over

---

### Step 2: Rental Period Selection
**URL:** `#/de` (same route, progressive disclosure)  
**Screenshots:** `/agent/step_02_date_selection.webp`, `/agent/step_03_date_calendar.webp`

**Progress Header Bar** (appears after people selection):
- **Logo:** FREUDENHAUS
- **2 Personen / 2x Erwachsen**
- **0 Tage** (0 Days)
- **Abholort** (Pickup location) - with pin icon
- **0 Produkte** (0 Products)
- **Warenkorb** (Shopping cart) - with user icon

**Main Content:**
- **Hero Section:** Mountain landscape image
- **Heading:** "WÄHLE DEINEN LEIHZEITRAUM:" (CHOOSE YOUR RENTAL PERIOD:)

**Month Navigation:**
- Horizontal carousel showing:
  - November 2026 (selected/underlined)
  - Dezember 2026
  - Januar 2027
  - Februar 2027
  - März 2027
  - April 2027
- Left/right arrow navigation

**Calendar Grid (November 2026 Example):**
- Custom card-based design (not standard HTML date picker)
- Each date card shows:
  - Day abbreviation (Mo, Di, Mi, Do, Fr, Sa, So)
  - Date number
  - Availability status or discount

**Date States:**
- **Unavailable dates** (Mo 16 - Do 19):
  - Greyed out
  - Text: "nicht verfügbar" (not available)
- **Available dates** (Fr 20 - Mo 30):
  - White cards with drop shadow
  - **Discount badge:** "-10%" prominently displayed

**Key German Labels:**
- Leihzeitraum = Rental period
- Tage = Days
- Abholort = Pickup location
- Produkte = Products
- Warenkorb = Shopping cart
- nicht verfügbar = not available
- Mo/Di/Mi/Do/Fr/Sa/So = Mon/Tue/Wed/Thu/Fri/Sat/Sun
- Dezember = December
- Januar = January
- Februar = February
- März = March
- April = April

---

## Design System

### Brand Colors
- **Primary Dark:** Charcoal grey (#444 approximately) - used for primary buttons
- **Primary Light:** White - backgrounds and secondary elements
- **Transparent overlays:** Semi-transparent black for hero text backgrounds
- **Accent links:** Light teal/green for inline links (e.g., "Datenschutz")
- **Photography:** High-contrast mountain/snow imagery provides visual color

### Typography
- **Font:** Modern sans-serif (likely Roboto, Open Sans, or similar)
- **Headings:** All caps, bold, white text
- **Body:** Standard weight, dark grey on white

### Layout Feel
- **Desktop-optimized:** Centered content with full-width hero images
- **Modern/Premium:** Heavy use of professional photography
- **Minimalist:** Clean spacing, limited UI elements per screen
- **Card-based:** Components use rounded rectangles with subtle shadows

### Component Patterns
- **Buttons:** Rounded pill shape
- **Inputs/Dropdowns:** Large touch-friendly targets with icon prefixes
- **Calendar:** Custom card grid (not native date picker)
- **Modal overlays:** Dark semi-transparent backdrop

---

## Pricing Tiers (Not Yet Visible)

The user request mentioned Platin/Gold/Silber tiers, but these were not visible in the steps explored. These likely appear:
- After store/location selection
- In the product category selection phase
- As pricing options for equipment tiers

---

## Store/Location Information

**Labels Seen:**
- "Abholort" (Pickup location) appears in progress header
- Location selector not yet reached in flow

**Expected Next Steps:**
Based on the header bar structure, the likely flow continuation is:
1. **Date selection** (explored above)
2. **Store/Pickup location selection**
3. **Product category browsing**
4. **Product selection** (with Platin/Gold/Silber tiers)
5. **Extras/Add-ons**
6. **Cart review**
7. **Checkout**
8. **Payment**

---

## URL Hash Routes Observed

- `#/de` - Main booking flow (German)
- Language variants presumably: `#/en`, `#/nl`
- Route doesn't change significantly during flow (SPA state management)

---

## UX Pain Points & Observations

1. **Cookie Modal Friction:** 
   - Large, blocking modal is the first interaction
   - Completely obscures value proposition
   - Must interact before seeing any booking content

2. **People Selection Redundancy:**
   - Initial full-screen prompt for people count
   - Then persistent in header throughout flow
   - Could potentially be integrated into first step with dates

3. **Calendar Design:**
   - **Positive:** Clear visual distinction between available/unavailable dates
   - **Positive:** Discount badges prominently displayed (-10%)
   - **Question:** Range selection UX not observed (start date → end date flow)

4. **Progress Visibility:**
   - Header bar provides good at-a-glance booking summary
   - No explicit step indicator (Step 1 of X)
   - User must infer progress from filled fields

5. **Mobile Responsiveness:**
   - Not tested (desktop only exploration)
   - Large card-based calendar likely stacks on mobile

---

## Recommendations for Modern Rebuild

### Technical
1. **Replace hash routing** with proper history-based routing for better SEO
2. **Consider server-side rendering** for landing page content
3. **Optimize cookie consent UX** - smaller banner vs full-screen modal
4. **Lazy load** high-res images with progressive enhancement

### UX/Design
1. **Combine initial steps** - people count + date selection on one screen
2. **Add explicit progress indicator** (breadcrumb or step counter)
3. **Make discount messaging consistent** - explain what -10% means upfront
4. **Add date range preview** in header (e.g., "Fr 20 - So 22 Nov")
5. **Improve calendar interaction feedback** - visual indication of selected dates
6. **Consider inline validation** for required fields

### Conversion Optimization
1. **Move value props above fold** (even before cookies)
2. **Add trust signals** - reviews, security badges earlier
3. **Clarify pricing** - show estimated total as user progresses
4. **Reduce friction** - guest checkout vs forced login

---

## Screenshot Paths

1. `/agent/step_01_people_selection.webp` - Initial people selector with mountain hero
2. `/agent/step_02_date_selection.webp` - Progress header + date selection intro
3. `/agent/step_03_date_calendar.webp` - Full calendar view with November 2026 dates and -10% badges

---

## Additional Notes

- **Language Detection:** Browser (Chrome) detected German and offered Google Translate
- **Operating Environment:** Tested on Linux desktop, Chrome browser
- **Session:** Could not complete full booking flow without selecting actual dates and progressing to payment (as requested)
- **Stores Not Seen:** Store names/locations not yet visible in explored steps
- **Product Categories Not Seen:** Ski types, categories, Platin/Gold/Silber tiers not reached
- **Checkout Flow Not Seen:** Cart, checkout form, payment gateway not explored

**Flow Blocked At:** Date selection step - did not select start/end dates to proceed further due to interaction challenges.

---

## German UI Copy Reference

### Navigation & Actions
- Anmelden = Login
- Neu starten = Start over
- Ablehnen = Decline/Reject
- Alle akzeptieren = Accept all

### Booking Terms
- Personen = People
- Erwachsen = Adults
- Tage = Days
- Leihzeitraum = Rental period
- Abholort = Pickup location
- Produkte = Products
- Warenkorb = Shopping cart

### Calendar Terms
- nicht verfügbar = not available
- Mo = Monday
- Di = Tuesday (Dienstag)
- Mi = Wednesday (Mittwoch)
- Do = Thursday (Donnerstag)
- Fr = Friday (Freitag)
- Sa = Saturday (Samstag)
- So = Sunday (Sonntag)
- November = November
- Dezember = December
- Januar = January
- Februar = February
- März = March
- April = April

### Legal/Compliance
- Cookies = Cookies
- Datenschutz = Privacy Policy / Data Protection
- Impressum = Legal Notice / Imprint
