export function resolveScheduleSlot(specData) {
  if (!specData) return null;
  const doctorIds = (specData.doctorIds || []).filter(Boolean);
  if (!doctorIds.length) return null;
  return {
    doctorIds,
    capacity: doctorIds.length,
    slotDuration: specData.slotDuration || 20,
  };
}
