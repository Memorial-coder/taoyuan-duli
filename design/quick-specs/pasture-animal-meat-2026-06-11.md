# Quick Design Spec: Pasture Animal Meat

**Type**: Addition
**System**: Animals, Cooking
**GDD Reference**: No `design/gdd/` file found; aligned with `design/quick-specs/bamboo-forest-beast-meat-2026-06-11.md`.
**Date**: 2026-06-11

## Change Summary

Adult pasture animals can be permanently converted into the existing `wild_meat` ingredient through a confirmed牧场操作. Meat-flavored recipes consume the same ingredient whether it came from bamboo forest beast encounters or pasture animals.

## Motivation

The bamboo forest meat drop adds a new ingredient, but the ranch loop also naturally supports a meat source. Reusing one meat item keeps recipes and shared-workshop rules compact while giving animal husbandry a deliberate resource tradeoff.

## Design Delta

Current implemented behavior allows animals to be sold for money and to produce daily animal products.

This spec changes that to:

Players may choose a separate high-confirmation "取肉" action for eligible adult non-horse animals. The action removes the animal from the pasture and grants `wild_meat`; it does not grant money.

## New Rules / Values

- Eligible animals: non-horse animals in coop or barn, with `daysOwned >= 1`.
- Ineligible animals: horse, missing animal IDs, animals bought the same day.
- Output item: `wild_meat`.
- Yield:
  - Small animals: 1-3 depending on type and care.
  - Medium animals: 3-6 depending on type and care.
  - Large animals: 5-8 depending on type and care.
- Quantity bonuses:
  - Friendship adds up to 2 extra meat by thresholds.
  - Fed and healthy animals can add 1 extra meat, capped by type maximum.
- Inventory safety: if the meat cannot be added to the backpack, the animal remains.
- Time cost: 1 hour.

## Affected Systems

| System | Impact | Action Required |
|--------|--------|-----------------|
| Animals | Adds confirmed permanent animal-to-meat operation | Update store and牧场 UI |
| Items | Existing `wild_meat` gains牧场 source text | Update item source/description |
| Cooking | Meat-named recipes require `wild_meat` | Update personal recipes |
| Shared workshop | Matching shared recipes require `wild_meat` | Update frontend and server catalogs |

## Acceptance Criteria

- [x]牧场 animal cards expose a disabled/enabled "取肉" action for non-horse animals.
- [x]取肉 opens a confirmation dialog that states the animal permanently leaves the pasture.
- [x] Successful取肉 removes the animal and grants `wild_meat`.
- [x] Same-day animals and horses cannot be processed for meat.
- [x] If inventory add fails, the animal is not removed.
- [x] Personal and shared meat recipes require `wild_meat`.

## GDD Update Required?

No full GDD update required; this quick spec is the source of record for the small addition.
