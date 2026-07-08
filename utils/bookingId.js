/** Backend UUID booking id vs local demo ids starting with gb_ */
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isRemoteBookingId(id) {
  return typeof id === 'string' && UUID_RE.test(id);
}
