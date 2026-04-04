export function serializeWorkout(row) {
  const dateVal = row.date ?? row.createdAt;
  return {
    id: row._id.toString(),
    name: row.name,
    date: dateVal ? new Date(dateVal).toISOString() : null,
    exercises: (row.exercises || []).map((ex) => ({
      id: ex._id?.toString?.() ?? String(ex._id),
      name: ex.name,
      sets: ex.sets,
      reps: ex.reps,
      weightKg: ex.weightKg,
    })),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function serializeTemplate(row) {
  return {
    id: row._id.toString(),
    name: row.name,
    exercises: (row.exercises || []).map((ex) => ({
      id: ex._id?.toString?.() ?? String(ex._id),
      name: ex.name,
      sets: ex.sets,
      reps: ex.reps,
      weightKg: ex.weightKg,
    })),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
