import { MEAL_TAG_OPTIONS } from "./constants.js";

export default function QuickLogForm({
  values,
  onChange,
  onSubmit,
  saving,
  helperText,
}) {
  return (
    <form onSubmit={onSubmit}>
      <p className="ff-meta">{helperText}</p>
      <div className="ff-form-grid">
        <label htmlFor="quick-note">Food name or note</label>
        <input
          id="quick-note"
          value={values.note}
          onChange={(e) => onChange("note", e.target.value)}
          maxLength={500}
          placeholder="e.g. banana, protein bar, iced latte"
        />
        <label htmlFor="quick-calories">Calories</label>
        <input
          id="quick-calories"
          type="number"
          min={1}
          max={50000}
          step={1}
          value={values.calories}
          onChange={(e) => onChange("calories", e.target.value)}
          required
          placeholder="e.g. 250"
        />
        <label htmlFor="quick-meal-tag">Meal tag</label>
        <select
          id="quick-meal-tag"
          value={values.mealLabel}
          onChange={(e) => onChange("mealLabel", e.target.value)}
        >
          <option value="">Select meal tag</option>
          {MEAL_TAG_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
        <label htmlFor="quick-protein">Protein g (optional)</label>
        <input
          id="quick-protein"
          type="number"
          min={0}
          max={1000}
          step={1}
          value={values.proteinG}
          onChange={(e) => onChange("proteinG", e.target.value)}
          placeholder="e.g. 20"
        />
        <label htmlFor="quick-carbs">Carbs g (optional)</label>
        <input
          id="quick-carbs"
          type="number"
          min={0}
          max={1000}
          step={1}
          value={values.carbsG}
          onChange={(e) => onChange("carbsG", e.target.value)}
          placeholder="e.g. 30"
        />
        <label htmlFor="quick-fat">Fat g (optional)</label>
        <input
          id="quick-fat"
          type="number"
          min={0}
          max={1000}
          step={1}
          value={values.fatG}
          onChange={(e) => onChange("fatG", e.target.value)}
          placeholder="e.g. 10"
        />
      </div>
      <button type="submit" className="ff-btn-primary" disabled={saving}>
        {saving ? "Saving…" : "Save quick log"}
      </button>
    </form>
  );
}
