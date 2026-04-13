export default function LogModeToggle({ mode, onChange }) {
  return (
    <div className="ff-log-mode-toggle" role="tablist" aria-label="Log mode">
      <button
        type="button"
        role="tab"
        aria-selected={mode === "quick"}
        className={`ff-log-mode-btn ${mode === "quick" ? "is-active" : ""}`}
        onClick={() => onChange("quick")}
      >
        Quick log
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={mode === "meal"}
        className={`ff-log-mode-btn ${mode === "meal" ? "is-active" : ""}`}
        onClick={() => onChange("meal")}
      >
        Build a meal
      </button>
    </div>
  );
}
