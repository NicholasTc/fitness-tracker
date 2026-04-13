import { MEAL_TAG_OPTIONS } from "./constants.js";

function macroText(item) {
  const value = [
    item.proteinG != null ? `P ${item.proteinG}g` : null,
    item.carbsG != null ? `C ${item.carbsG}g` : null,
    item.fatG != null ? `F ${item.fatG}g` : null,
  ]
    .filter(Boolean)
    .join(" · ");
  return value || "Macros —";
}

export default function TodayLogsList({
  loading,
  groupedItems,
  editingId,
  editForm,
  updating,
  setEditForm,
  beginEdit,
  cancelEdit,
  saveEdit,
  onDeleteQuick,
  onDeleteMeal,
}) {
  return (
    <section className="ff-card" aria-labelledby="today-logs-heading">
      <h2 id="today-logs-heading" className="ff-section-title">
        Today’s logs
      </h2>
      {loading && <p className="ff-meta">Loading…</p>}
      {!loading && groupedItems.length === 0 && (
        <p className="ff-muted">No logs yet. Use Quick log or Build a meal above.</p>
      )}
      {!loading &&
        groupedItems.map((group) => (
          <div key={group.label} className="ff-log-group">
            <h3 className="ff-log-group-title">{group.label}</h3>
            <ul className="ff-food-log-list">
              {group.items.map((item) => (
                <li key={item.key}>
                  {item.type === "quick" && editingId === item.id && editForm ? (
                    <div className="ff-form-grid ff-food-edit-grid">
                      <label>Date</label>
                      <input
                        type="date"
                        value={editForm.date}
                        onChange={(e) => setEditForm((f) => ({ ...f, date: e.target.value }))}
                      />
                      <label>Food name or note</label>
                      <input
                        value={editForm.note}
                        onChange={(e) => setEditForm((f) => ({ ...f, note: e.target.value }))}
                      />
                      <label>Calories</label>
                      <input
                        type="number"
                        min={1}
                        max={50000}
                        step={1}
                        value={editForm.calories}
                        onChange={(e) =>
                          setEditForm((f) => ({ ...f, calories: e.target.value }))
                        }
                      />
                      <label>Meal tag</label>
                      <select
                        value={editForm.mealLabel}
                        onChange={(e) =>
                          setEditForm((f) => ({ ...f, mealLabel: e.target.value }))
                        }
                      >
                        <option value="">Select meal tag</option>
                        {MEAL_TAG_OPTIONS.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                      <label>Protein g</label>
                      <input
                        type="number"
                        min={0}
                        max={1000}
                        step={1}
                        value={editForm.proteinG}
                        onChange={(e) =>
                          setEditForm((f) => ({ ...f, proteinG: e.target.value }))
                        }
                      />
                      <label>Carbs g</label>
                      <input
                        type="number"
                        min={0}
                        max={1000}
                        step={1}
                        value={editForm.carbsG}
                        onChange={(e) =>
                          setEditForm((f) => ({ ...f, carbsG: e.target.value }))
                        }
                      />
                      <label>Fat g</label>
                      <input
                        type="number"
                        min={0}
                        max={1000}
                        step={1}
                        value={editForm.fatG}
                        onChange={(e) =>
                          setEditForm((f) => ({ ...f, fatG: e.target.value }))
                        }
                      />
                      <div />
                      <div style={{ display: "flex", gap: "0.65rem", flexWrap: "wrap" }}>
                        <button
                          type="button"
                          className="ff-btn-primary"
                          disabled={updating}
                          onClick={saveEdit}
                        >
                          {updating ? "Saving…" : "Save"}
                        </button>
                        <button type="button" className="ff-btn-secondary" onClick={cancelEdit}>
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="ff-food-log-row ff-today-log-row">
                      <span
                        className={`ff-log-type-badge ${item.type === "quick" ? "quick" : "meal"}`}
                      >
                        {item.type === "quick" ? "Quick" : "Meal"}
                      </span>
                      <span className="ff-food-log-cals">{item.calories} kcal</span>
                      <span className="ff-meta" style={{ flex: "1 1 12rem", margin: 0 }}>
                        {item.title}
                      </span>
                      <span className="ff-meta" style={{ margin: 0 }}>
                        {macroText(item)}
                      </span>
                      {item.type === "quick" ? (
                        <>
                          <button
                            type="button"
                            className="ff-linkish"
                            onClick={() => beginEdit(item.raw)}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="ff-linkish"
                            onClick={() => onDeleteQuick(item.id)}
                          >
                            Remove
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          className="ff-linkish"
                          onClick={() => onDeleteMeal(item.id)}
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
    </section>
  );
}
