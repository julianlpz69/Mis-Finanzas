export const COLORS = {
  navy: '#16223B',
  navySoft: '#233457',
  paper: '#FBF7EC',
  paperDim: '#F1EAD6',
  line: '#E4DAC0',
  rust: '#B14A2E',
  forest: '#2F6B4F',
  gold: '#C79A3E',
  ink: '#1E2433',
  inkSoft: '#5B6478',
};

export const CAT_SALDO_ANTERIOR = 'sys_saldo_anterior';
export const CAT_AHORRO = 'sys_ahorro';
export const CAT_DEUDA_PAGO = 'sys_deuda_pago';
export const CAT_PRESTAMO = 'sys_prestamo';
export const CAT_COBRO_PRESTAMO = 'sys_cobro_prestamo';
export const CAT_DEUDA_RECIBIDA = 'sys_deuda_recibida';

export const SYSTEM_CATEGORY_IDS = [
  CAT_SALDO_ANTERIOR,
  CAT_AHORRO,
  CAT_DEUDA_PAGO,
  CAT_PRESTAMO,
  CAT_COBRO_PRESTAMO,
  CAT_DEUDA_RECIBIDA,
];

/** En qué pestañas de Categorías se muestra cada fija. */
export const SYSTEM_CAT_TABS = {
  [CAT_SALDO_ANTERIOR]: ['gasto', 'ingreso'],
  [CAT_AHORRO]: ['gasto', 'ingreso'],
  [CAT_DEUDA_PAGO]: ['gasto'],
  [CAT_PRESTAMO]: ['gasto'],
  [CAT_COBRO_PRESTAMO]: ['ingreso'],
  [CAT_DEUDA_RECIBIDA]: ['ingreso'],
};

export const SYSTEM_CAT_HINTS = {
  [CAT_SALDO_ANTERIOR]: 'Traspaso del mes anterior (no es ingreso/gasto real)',
  [CAT_AHORRO]: 'Aportes a metas; no cuenta como gasto ni ingreso',
  [CAT_DEUDA_PAGO]: 'Cuando pagas una deuda que tú debes',
  [CAT_PRESTAMO]: 'Cuando prestas plata a alguien',
  [CAT_COBRO_PRESTAMO]: 'Cuando te pagan un préstamo (ingreso)',
  [CAT_DEUDA_RECIBIDA]: 'Cuando te prestan plata y la tienes disponible',
};

export const ICONS = [
  '🍔', '🍕', '🍎', '🥗', '☕', '🛒', '👕', '👟', '👜', '💄',
  '🏠', '💡', '🔧', '🛏️', '🚗', '🚌', '🏍️', '⛽', '🅿️', '🎮',
  '🎬', '🎵', '🎨', '📚', '✈️', '🏖️', '💊', '🏥', '🦷', '🐾',
  '🎁', '🎉', '📱', '💻', '🏋️', '🐶', '💰', '💵', '📈', '💼',
  '🖥️', '🎯', '📥', '🧾', '🏦', '🎓', '🛠️',
];

/** Colores solo para categorías del sistema (no aparecen al crear/editar las tuyas). */
export const SYSTEM_PALETTE_COLORS = {
  [CAT_SALDO_ANTERIOR]: '#C79A3E',
  [CAT_AHORRO]: '#5C7C8A',
  [CAT_DEUDA_PAGO]: '#8B3A4A',
  [CAT_PRESTAMO]: '#4A6FA5',
  [CAT_COBRO_PRESTAMO]: '#2A6B55',
  [CAT_DEUDA_RECIBIDA]: '#5B4F8C',
};

/** Colores disponibles para categorías del usuario (sin solapar con las fijas). */
export const PALETTE_COLORS = [
  '#E85D4C', '#F4A261', '#E9C46A', '#2A9D8F', '#457B9D', '#9B5DE5',
  '#F15BB5', '#00BBF9', '#06D6A0', '#FF6B35', '#6A994E', '#BC4749',
  '#023E8A', '#FB8500', '#D62828', '#7209B7', '#118AB2', '#EF476F',
  '#80B918', '#FF9F1C', '#2EC4B6', '#E71D36', '#3D5A80', '#EE6C4D',
];

export const MONTH_NAMES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

export function monthKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function prevMonthKey(key) {
  const [y, m] = key.split('-').map(Number);
  const d = new Date(y, m - 2, 1);
  return monthKey(d);
}

export function nextMonthKey(key) {
  const [y, m] = key.split('-').map(Number);
  const d = new Date(y, m, 1);
  return monthKey(d);
}

export function firstDayOfMonth(key) {
  return `${key}-01`;
}

export function dateForDayInMonth(monthKeyStr, day) {
  const [y, m] = monthKeyStr.split('-').map(Number);
  const lastDay = new Date(y, m, 0).getDate();
  const d = Math.min(Math.max(1, day || 1), lastDay);
  return `${monthKeyStr}-${String(d).padStart(2, '0')}`;
}

export function carryMovementId(monthKeyStr) {
  return `carry_${monthKeyStr}`;
}

export function isCarryMovement(m) {
  return (
    m?.category_id === CAT_SALDO_ANTERIOR ||
    String(m?.id || '').startsWith('carry_')
  );
}

export function isAhorroMovement(m) {
  return m.type === 'ahorro' || m.category_id === CAT_AHORRO;
}

/**
 * Totales del mes.
 * - saldoAnterior: traspaso (NO es ingreso/gasto real)
 * - ingresos / gastos: solo actividad real del mes
 * - balance: saldo disponible/final = saldoAnterior + ingresos - gastos - ahorros
 */
export function calcMonthTotals(movements) {
  let saldoAnterior = 0;
  let ingresos = 0;
  let gastos = 0;
  let ahorros = 0;

  movements.forEach((m) => {
    if (isCarryMovement(m)) {
      saldoAnterior += m.type === 'ingreso' ? m.amount : -m.amount;
    } else if (isAhorroMovement(m)) {
      ahorros += m.amount;
    } else if (m.type === 'ingreso') {
      ingresos += m.amount;
    } else if (m.type === 'gasto') {
      gastos += m.amount;
    }
  });

  return {
    saldoAnterior,
    ingresos,
    gastos,
    ahorros,
    balance: saldoAnterior + ingresos - gastos - ahorros,
  };
}

export function formatMoney(n) {
  const sign = n < 0 ? '-' : '';
  const abs = Math.round(Math.abs(n));
  return `${sign}$${abs.toLocaleString('es-CO')}`;
}

export function formatAmountInput(text) {
  const digits = String(text ?? '').replace(/\D/g, '');
  if (!digits) return '';
  const trimmed = digits.replace(/^0+(?=\d)/, '');
  return trimmed.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

export function parseAmountInput(text) {
  if (text == null || text === '') return NaN;
  return parseFloat(String(text).replace(/\./g, ''));
}

export function formatShortDate(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return `${date.getDate()} ${MONTH_NAMES[date.getMonth()].slice(0, 3)}`;
}

export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}
