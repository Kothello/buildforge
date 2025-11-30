# CRM & Iron-Builder Integration: Complete Technical Reference

## Project Context
Integration of canonical 3D building renderer (BuildingModel.tsx) from iron-builder into CRM system with bug fixes for structural rendering.

---

## FIX #1: Single-Slope Lean-To Wall Visibility (Line 2298)

### Problem
Single-slope lean-to walls didn't hide when "Open" configuration selected.

### Code Change
**Before (BROKEN):**
```javascript
// Line 2295 - BuildingModel.tsx
{leanTo.type === 'enclosed' && (
  <mesh 
    position={[effectiveWidth / 2, leanToHeight / 2, 0]}
    onClick={(e) => {
      e.stopPropagation();
      if (!isDragging && onWallClick) {
        onWallClick(leanTo.wall, leanTo.id, 'front');
      }
    }}
  >
    <boxGeometry args={[0.2, leanToHeight, attachWallLength - 0.4]} />
    <meshStandardMaterial 
      color={resolveColor(wallColor)}
      metalness={0.9}
      roughness={0.2}
      bumpMap={wallBump}
      bumpScale={0.3}
      side={THREE.DoubleSide}
    />
  </mesh>
)}
```

**After (FIXED):**
```javascript
// Line 2298 - BuildingModel.tsx
{!leanTo.isOpen && (
  <mesh 
    position={[effectiveWidth / 2, leanToHeight / 2, 0]}
    onClick={(e) => {
      e.stopPropagation();
      if (!isDragging && onWallClick) {
        onWallClick(leanTo.wall, leanTo.id, 'front');
      }
    }}
  >
    <boxGeometry args={[0.2, leanToHeight, attachWallLength - 0.4]} />
    <meshStandardMaterial 
      color={resolveColor(wallColor)}
      metalness={0.9}
      roughness={0.2}
      bumpMap={wallBump}
      bumpScale={0.3}
      side={THREE.DoubleSide}
    />
  </mesh>
)}
```

### Key Change
- `leanTo.type === 'enclosed'` → `!leanTo.isOpen`
- Now checks state instead of type, matching gable lean-to logic

---

## FIX #2: Gable Roof with Structural I-Beams (Lines 966-1059)

### Overview
Complete rewrite of main building's roof beam system to use simple box geometry with correct positioning and spacing.

### Structure Overview
```javascript
// Lines 966-1059 - Complete beam rendering system
{/* Red Iron Structural Beams - per prompt specification */}
{(() => {
  // Beam calculations and rendering logic
  // Returns array of beam meshes positioned along building length
})()}
```

---

### Part 1: Angle and Dimension Calculations (Lines 968-970)

```javascript
// Line 968-970
const angle = Math.atan(roofPitch / 12);          // Exact roof pitch angle
const beamLength = (width / 2) / Math.cos(angle);  // Hypotenuse of roof panel
const beamThickness = 0.15;                        // 0.15 feet per spec
```

**Example:** 40ft width, 2/12 pitch:
- angle = Math.atan(2/12) ≈ 0.1651 rad
- beamLength = 20 / cos(0.1651) ≈ 20.33 ft

---

### Part 2: Beam Set Rendering Function (Lines 972-1037)

#### Gable Roof Beams (Lines 974-1007)

```javascript
// Lines 977-984: LEFT ANGLED BEAM
{/* Left angled beam - endpoints at (-width/2, height) and (0, height+roofHeight) */}
<mesh 
  position={[-width / 4, height + roofHeight / 2, zPosition]} 
  rotation={[0, 0, angle]}
  castShadow={false} receiveShadow={false}
>
  <boxGeometry args={[beamLength, beamThickness, beamThickness]} />
  <primitive attach="material" object={beamMaterial} />
</mesh>
```

**Breakdown:**
- Position X: -width/4 (quarter-width left)
- Position Y: height + roofHeight/2 (midpoint of roof height)
- Position Z: zPosition (varies per beam set)
- Rotation: [0, 0, angle] (angled around Z-axis)
- Size: [beamLength, 0.15, 0.15] (angled along X, thin cross-section)

```javascript
// Lines 986-994: RIGHT ANGLED BEAM
{/* Right angled beam - endpoints at (0, height+roofHeight) and (width/2, height) */}
<mesh 
  position={[width / 4, height + roofHeight / 2, zPosition]} 
  rotation={[0, 0, -angle]}
  castShadow={false} receiveShadow={false}
>
  <boxGeometry args={[beamLength, beamThickness, beamThickness]} />
  <primitive attach="material" object={beamMaterial} />
</mesh>
```

**Breakdown:**
- Position X: width/4 (quarter-width right, mirror of left)
- Position Y: height + roofHeight/2 (same height as left beam)
- Rotation: [0, 0, -angle] (angled opposite direction)

```javascript
// Lines 997-1000: LEFT VERTICAL COLUMN
{/* Left vertical column - from ground to eave height, no rotation */}
<mesh position={[-width / 4, height / 2, zPosition]}>
  <boxGeometry args={[beamThickness, height, beamThickness]} />
  <primitive attach="material" object={beamMaterial} />
</mesh>
```

**Breakdown:**
- Position X: -width/4 (directly below left angled beam)
- Position Y: height/2 (midpoint of wall height)
- Size: [0.15, height, 0.15] (vertical orientation)
- Rotation: NONE (truly vertical)

```javascript
// Lines 1003-1006: RIGHT VERTICAL COLUMN
{/* Right vertical column - from ground to eave height, no rotation */}
<mesh position={[width / 4, height / 2, zPosition]}>
  <boxGeometry args={[beamThickness, height, beamThickness]} />
  <primitive attach="material" object={beamMaterial} />
</mesh>
```

#### Single-Slope Roof Beams (Lines 1008-1031)

```javascript
// Lines 1014-1018: ANGLED BEAM (center of building)
{/* Single slope angled beam following roof pitch */}
<mesh 
  position={[0, height + roofHeight / 2, zPosition]} 
  rotation={[0, 0, angle]}
  castShadow={false} receiveShadow={false}
>
  <boxGeometry args={[width / Math.cos(angle), beamThickness, beamThickness]} />
  <primitive attach="material" object={beamMaterial} />
</mesh>
```

**Breakdown:**
- Position X: 0 (center)
- Beam length: width / Math.cos(angle) (covers full width at angle)

```javascript
// Lines 1021-1024: LEFT COLUMN (standard height)
{/* Left vertical column - standard height */}
<mesh position={[-width / 2, height / 2, zPosition]}>
  <boxGeometry args={[beamThickness, height, beamThickness]} />
  <primitive attach="material" object={beamMaterial} />
</mesh>
```

```javascript
// Lines 1027-1030: RIGHT COLUMN (full height for single slope)
{/* Right vertical column - full height for single slope */}
<mesh position={[width / 2, (height + roofHeight) / 2, zPosition]}>
  <boxGeometry args={[beamThickness, height + roofHeight, beamThickness]} />
  <primitive attach="material" object={beamMaterial} />
</mesh>
```

**Breakdown:**
- Left: standard height (low side of single slope)
- Right: height + roofHeight (high side, supports higher roof)

---

### Part 3: Beam Positioning Logic (Lines 1036-1056)

#### Corner Beams (Lines 1039-1040)
```javascript
// Lines 1039-1040
// Corner beams - 0.875 feet inboard from walls
beams.push(renderBeamSet(-length / 2 + 0.875, 'corner-front'));
beams.push(renderBeamSet(length / 2 - 0.875, 'corner-back'));
```

**Example:** 60ft building
- Front: -30 + 0.875 = -29.125 (front end, inboard)
- Back: 30 - 0.875 = 29.125 (back end, inboard)

#### Middle Beams (Lines 1044-1056)
```javascript
// Lines 1044-1056
// Middle beams: Math.floor((length - 40) / 24.5) evenly distributed
// Guard against short buildings where length <= 40
if (length > 40) {
  const middleCount = Math.floor((length - 40) / 24.5);
  if (middleCount > 0) {
    const span = (length - 40) / (middleCount + 1);
    for (let i = 1; i <= middleCount; i++) {
      const zPos = -length / 2 + 20 + i * span;
      beams.push(renderBeamSet(zPos, `middle-${i}`));
    }
  }
}
```

**Example Calculation:** 60ft building
- middleCount = Math.floor((60 - 40) / 24.5) = Math.floor(20 / 24.5) = 0
- No middle beams added (just corners)

**Example Calculation:** 100ft building
- middleCount = Math.floor((100 - 40) / 24.5) = Math.floor(60 / 24.5) = 2
- span = 60 / (2 + 1) = 20 ft
- Beam 1: -50 + 20 + (1 × 20) = -10
- Beam 2: -50 + 20 + (2 × 20) = 10
- Result: 3 beam sets evenly distributed

---

## Code Comparison: Before vs After

### Before (Old Complex System)
```javascript
// OLD - Lines with custom I-beam geometry
<mesh 
  position={[-width / 4 + 0.92, height + roofHeight / 2 - 0.62, position]} 
  rotation={[0, 0, angle * 1.02]}  // Multiplier!
>
  <primitive object={createIBeamGeometry(beamLength - 0.65, 'left')} />
  <primitive attach="material" object={beamMaterial} />
</mesh>

// Vertical column with tilt
<mesh position={[-width / 2 - 0.083, height / 2, position]} rotation={[0, 0, -1.5 * Math.PI / 180]}>
  <primitive object={createIBeamGeometry(height, 'vertical')} />
  <primitive attach="material" object={beamMaterial} />
</mesh>

// Old spacing algorithm
const spacing = 24.5;
const margin = 20;
const inner = Math.max(0, length - margin * 2);
const n = Math.floor(inner / spacing);
const start = -(n * spacing) / 2;
```

### After (New Simple System)
```javascript
// NEW - Simple box geometry
<mesh 
  position={[-width / 4, height + roofHeight / 2, zPosition]} 
  rotation={[0, 0, angle]}  // Exact angle
>
  <boxGeometry args={[beamLength, beamThickness, beamThickness]} />
  <primitive attach="material" object={beamMaterial} />
</mesh>

// Vertical column with NO rotation
<mesh position={[-width / 4, height / 2, zPosition]}>
  <boxGeometry args={[beamThickness, height, beamThickness]} />
  <primitive attach="material" object={beamMaterial} />
</mesh>

// New spacing algorithm
const middleCount = Math.floor((length - 40) / 24.5);
const span = (length - 40) / (middleCount + 1);
for (let i = 1; i <= middleCount; i++) {
  const zPos = -length / 2 + 20 + i * span;
  beams.push(renderBeamSet(zPos, `middle-${i}`));
}
```

---

## Key Differences Summary

| Aspect | Before | After |
|--------|--------|-------|
| Beam Geometry | `createIBeamGeometry()` | `boxGeometry` |
| Beam Thickness | Variable | 0.15 ft (constant) |
| Position Offsets | +0.92, -0.8, -0.083 | Exact ±width/4 |
| Rotation | angle × 1.02 | angle (exact) |
| Column Rotation | ±1.5° tilt | No rotation |
| Spacing Algorithm | Centered distribution | Even distribution 20-40ft |
| Short Building Guard | None | `if (length > 40)` |

---

## Material Setup (For Reference)

```javascript
// Lines 320-340 (approximate) - Material definitions
const beamMaterial = new THREE.MeshStandardMaterial({
  color: 0xFF4444, // Red/brown structural color
  metalness: 1,    // Fully metallic
  roughness: 0.3,  // Shiny finish
  bumpMap: roofBump,
  bumpScale: 0.2,
});
```

---

## Props Interface (BuildingModel.tsx)

```typescript
interface Props {
  width: number;          // Building width in feet
  length: number;         // Building length in feet
  height: number;         // Wall height in feet
  roofStyle: 'gable' | 'single-slope';
  roofPitch: number;      // e.g., 2, 4, 6 for 2/12, 4/12, 6/12 pitch
  leanTos: LeanTo[];      // Array of lean-to configurations
  wallColor: string;      // CSS color
  roofColor: string;      // CSS color
  trimColor: string;      // CSS color
  // ... other props
}

interface LeanTo {
  id: string;
  type: 'gable' | 'single-slope';
  isOpen: boolean;        // KEY: Controls wall visibility
  width: number;
  length: number;
  height: number;
  pitch: number;
  wall: string;
  gableAttachmentSide?: string;
  enclosure?: string;
}
```

---

## File Locations
- Main file: `client/src/configurator/BuildingModel.tsx` (3,593 lines total)
- Fixed section 1: Line 2298 (single-slope wall visibility)
- Fixed section 2: Lines 966-1059 (gable beams system)

---

## Related Functions (Not Modified)

```javascript
// Line 413 - Roof height calculation
const roofHeight = roofStyle === 'gable' ? (roofPitch / 12) * (width / 2) : (roofPitch / 12) * width;

// Lines 936-953 - Roof panels (unchanged, but beams reference these)
// Gable roof panels at [-width/4] and [width/4] positions
// Single-slope at [0] position
```

---

## What Your AI Should Know

### For Future Maintenance:
1. **Beam positioning is absolute**, not relative - no offsets or margins
2. **Rotations must be exact** - `Math.atan(roofPitch / 12)` is the canonical formula
3. **Vertical columns have NO rotation** - they're always [0, 0, 0]
4. **Geometry is simple** - 3 numbers: [length, thickness, thickness]
5. **Spacing formula** - `Math.floor((length - 40) / 24.5)` with 20ft margins

### Common Pitfalls to Avoid:
- ❌ Don't add multipliers to angle calculations
- ❌ Don't tilt vertical columns
- ❌ Don't use createIBeamGeometry for main beams (use boxGeometry)
- ❌ Don't forget the `if (length > 40)` guard
- ❌ Don't use position offsets like +0.92 or -0.083

### If Things Break:
- Check if `isOpen` vs `type` logic is being used correctly
- Verify beam positions match ±width/4 for gable
- Ensure rotations are exact angles, not multiplied
- Confirm short buildings don't crash the spacing algorithm
