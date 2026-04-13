import { MEAL_TAG_OPTIONS } from "./constants.js";

export default function MealLogForm({
  meal,
  setMealField,
  totals,
  onIngredientChange,
  addIngredient,
  removeIngredient,
  onSubmit,
  saving,
  helperText,
}) {
  return (
    <form onSubmit={onSubmit}>
      <p className="ff-meta">{helperText}</p>
      <div className="ff-form-grid">
        <label htmlFor="meal-name">Meal name</label>
        <input
          id="meal-name"
          value={meal.mealName}
          onChange={(e) => setMealField("mealName", e.target.value)}
          placeholder="e.g. Chicken rice bowl"
          maxLength={120}
          required
        />
        <label htmlFor="meal-tag">Meal tag</label>
        <select
          id="meal-tag"
          value={meal.mealLabel}
          onChange={(e) => setMealField("mealLabel", e.target.value)}
        >
          <option value="">Select meal tag</option>
          {MEAL_TAG_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
        <label htmlFor="meal-note">Meal note (optional)</label>
        <input
          id="meal-note"
          value={meal.note}
          onChange={(e) => setMealField("note", e.target.value)}
          placeholder="Any context for this meal"
          maxLength={500}
        />
      </div>

      <div className="ff-meal-ingredients">
        {meal.ingredients.map((ing, idx) => (
          <article key={idx} className="ff-meal-ingredient-card">
            <div className="ff-meal-ingredient-top">
              <h3>Ingredient {idx + 1}</h3>
              <button type="button" className="ff-linkish" onClick={() => removeIngredient(idx)}>
                Remove
              </button>
            </div>
            <div className="ff-form-grid ff-meal-grid">
              <label>Name</label>
              <input
                value={ing.name}
                onChange={(e) => onIngredientChange(idx, "name", e.target.value)}
                placeholder="e.g. Chicken breast"
              />
              <label>Grams</label>
              <input
                type="number"
                min={1}
                max={5000}
                step={1}
                value={ing.grams}
                onChange={(e) => onIngredientChange(idx, "grams", e.target.value)}
              />
              <label>Calories</label>
              <input
                type="number"
                min={0}
                max={50000}
                step={0.1}
                value={ing.caloriesPer100g}
                onChange={(e) =>
                  onIngredientChange(idx, "caloriesPer100g", e.target.value)
                }
              />
              <label>Protein g</label>
              <input
                type="number"
                min={0}
                max={1000}
                step={0.1}
                value={ing.proteinPer100g}
                onChange={(e) => onIngredientChange(idx, "proteinPer100g", e.target.value)}
              />
              <label>Carbs g</label>
              <input
                type="number"
                min={0}
                max={1000}
                step={0.1}
                value={ing.carbsPer100g}
                onChange={(e) => onIngredientChange(idx, "carbsPer100g", e.target.value)}
              />
              <label>Fat g</label>
              <input
                type="number"
                min={0}
                max={1000}
                step={0.1}
                value={ing.fatPer100g}
                onChange={(e) => onIngredientChange(idx, "fatPer100g", e.target.value)}
              />
            </div>
          </article>
        ))}
      </div>
      <button type="button" className="ff-btn-secondary" onClick={addIngredient}>
        + Add manual ingredient
      </button>
      <p className="ff-meal-total-preview">
        Meal total: <strong>{totals.calories} kcal</strong> · P {totals.proteinG}g · C{" "}
        {totals.carbsG}g · F {totals.fatG}g
      </p>
      <button type="submit" className="ff-btn-primary" disabled={saving}>
        {saving ? "Saving meal…" : "Save meal"}
      </button>
    </form>
  );
}
