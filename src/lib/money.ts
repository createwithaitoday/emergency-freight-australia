export function formatAud(cents: number) {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
  }).format(cents / 100);
}

export function dollarsToCents(value: number) {
  return Math.round(value * 100);
}
