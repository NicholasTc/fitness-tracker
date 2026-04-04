export function serializeMeasurement(row) {
  const o = row.toObject ? row.toObject() : row;
  return {
    id: o._id.toString(),
    date: o.date ? new Date(o.date).toISOString().slice(0, 10) : null,
    weightKg: o.weightKg ?? null,
    waistCm: o.waistCm ?? null,
    bodyFatPct: o.bodyFatPct ?? null,
    notes: o.notes || null,
    createdAt: o.createdAt,
    updatedAt: o.updatedAt,
  };
}

export function serializePersonalRecord(row) {
  const o = row.toObject ? row.toObject() : row;
  return {
    id: o._id.toString(),
    exerciseName: o.exerciseName,
    weightKg: o.weightKg,
    reps: o.reps,
    achievedAt: o.achievedAt ? new Date(o.achievedAt).toISOString() : null,
    notes: o.notes || null,
    createdAt: o.createdAt,
    updatedAt: o.updatedAt,
  };
}

export function serializeProgressPhotoMeta(row) {
  const o = row.toObject ? row.toObject() : row;
  return {
    id: o._id.toString(),
    dateTaken: o.dateTaken
      ? new Date(o.dateTaken).toISOString().slice(0, 10)
      : null,
    caption: o.caption || null,
    contentType: o.contentType || "image/jpeg",
    createdAt: o.createdAt,
    updatedAt: o.updatedAt,
  };
}
