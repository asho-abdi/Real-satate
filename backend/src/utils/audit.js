/** Soft no-op audit for simplified schema (no ActivityLog table). */
export async function writeActivityLog(_prisma, _entry) {
  return null;
}

export default { writeActivityLog };
