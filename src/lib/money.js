export function parseCents(value) {
  const text = String(value).trim();
  if (!/^\d+(?:[.,]\d{1,2})?$/.test(text)) throw new Error('Introduce un importe válido con un máximo de dos decimales.');
  const [whole, fraction = ''] = text.replace(',', '.').split('.');
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  if (!Number.isSafeInteger(cents) || cents <= 0 || cents > 100000000) throw new Error('El importe debe ser mayor que cero y no superar 1.000.000 €.');
  return cents;
}
export function getBalance(expenses, profiles) {
  const [a, b] = profiles;
  const total = expenses.reduce((sum, item) => sum + item.cents, 0);
  const shares = { [a.id]: Math.ceil(total / 2), [b.id]: Math.floor(total / 2) };
  const paidA = expenses.filter(item => item.profileId === a.id).reduce((sum, item) => sum + item.cents, 0);
  const diff = paidA - shares[a.id];
  const transfer = diff === 0 ? null : { from: diff > 0 ? b.id : a.id, to: diff > 0 ? a.id : b.id, cents: Math.abs(diff) };
  return { total, shares, transfer };
}
export function getBalanceFromPaid({ paidA, paidB }, profiles) {
  return getBalance([{ profileId: profiles[0].id, cents: paidA }, { profileId: profiles[1].id, cents: paidB }], profiles);
}
export function euro(cents) {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(cents / 100);
}
