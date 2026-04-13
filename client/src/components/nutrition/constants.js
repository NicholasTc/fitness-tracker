export const MEAL_TAG_OPTIONS = ["Breakfast", "Lunch", "Dinner", "Snack"];

export function normalizeMealTag(value) {
  return MEAL_TAG_OPTIONS.includes(value) ? value : "Uncategorized";
}
