export function fmtPHP(n: number) {
  return "₱" + Number(n || 0).toLocaleString();
}
export function yearNow() {
  return new Date().getFullYear();
}
      