# Quick Design Spec: Bamboo Forest Beast Meat

**Type**: Addition
**System**: Foraging / Cooking / Shared Workshop
**GDD Reference**: No `design/gdd/` system document found in this repo snapshot.
**Date**: 2026-06-11

## Change Summary

When bamboo forest gathering touches wood, bamboo, or firewood sources, it can occasionally trigger a light beast encounter. Winning may award `wild_meat`, and a small set of meat-flavored recipes now consume that ingredient.

## Motivation

The bamboo forest already reads as a risky natural space in player memory. A rare meat drop gives beast encounters a practical loop into cooking without turning gathering into a full combat mode.

## Design Delta

Current implementation has bamboo forest gathering and recipe data, but no current bamboo-forest beast loot chain. This spec adds:

- A small random beast event in `ForageView.vue` after gathering wood-like sources.
- A new ordinary material item, `wild_meat` / 野兽肉块.
- Recipe ingredient updates for `bamboo_shoot_stir_fry`, `aged_radish_stew`, `hunters_roast`, and `battle_stew`.
- Matching shared-workshop inputs and common warehouse policy for the same recipes.

## New Rules / Values

- Trigger source: one gathering action must successfully collect `wood`, `firewood`, or `bamboo`.
- Encounter chance: 12% after such an action.
- Beast pool: 竹林狼, 黑熊, 山虎.
- Victory chance: based on combat level and beast challenge, clamped between 35% and 90%.
- Meat drop chance on victory: 45%.
- Meat quantity: 1 from wolf, 2 from bear or tiger.
- Failure: small HP damage, capped so the player is not knocked out by this event.
- Reward side effects on victory: combat exp and monster-kill achievement progress.

## Affected Systems

| System | Impact | Action Required |
|--------|--------|-----------------|
| Bamboo forest gathering | Adds rare beast event and meat drop | Update `ForageView.vue` |
| Item data | Adds ordinary material `wild_meat` | Update item catalog and source text |
| Cooking | Adds meat to selected recipes | Update `recipes.ts` |
| Shared workshop | Keeps shared recipe inputs aligned | Update frontend catalog and server runtime |
| QA | Guards item and recipe wiring | Update targeted data and contract checks |

## Acceptance Criteria

- [ ] `wild_meat` is a defined ordinary material item with a readable source.
- [ ] Bamboo forest gathering can award `wild_meat` only through a beast event after wood-like source gathering.
- [ ] The selected recipes require `wild_meat` in personal cooking.
- [ ] Matching shared-workshop recipes also require `wild_meat`.
- [ ] Shared warehouse policy treats `wild_meat` as a common item.
- [ ] Existing bamboo gathering still works without opening the mine combat UI.

## GDD Update Required?

No dedicated GDD file was present. This quick spec is the design record for the change.
