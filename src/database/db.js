import * as SQLite from 'expo-sqlite';
import {
  CAT_AHORRO,
  CAT_COBRO_PRESTAMO,
  CAT_DEUDA_PAGO,
  CAT_DEUDA_RECIBIDA,
  CAT_PRESTAMO,
  CAT_SALDO_ANTERIOR,
  SYSTEM_PALETTE_COLORS,
  calcMonthTotals,
  carryMovementId,
  firstDayOfMonth,
  prevMonthKey,
} from '../theme';

let dbInstance = null;

async function getDb() {
  if (!dbInstance) {
    dbInstance = await SQLite.openDatabaseAsync('finanzas.db');
  }
  return dbInstance;
}

const DEFAULT_CATEGORIES = [
  ['c1', 'gasto', 'Comida', '🍔', '#E85D4C', 0],
  ['c2', 'gasto', 'Transporte', '🚗', '#457B9D', 0],
  ['c3', 'gasto', 'Hogar', '🏠', '#F4A261', 0],
  ['c4', 'gasto', 'Ropa', '👕', '#F15BB5', 0],
  ['c5', 'gasto', 'Ocio', '🎮', '#9B5DE5', 0],
  ['c6', 'gasto', 'Salud', '💊', '#2A9D8F', 0],
  ['c7', 'ingreso', 'Salario', '💰', '#06D6A0', 0],
  ['c8', 'ingreso', 'Freelance', '💻', '#00BBF9', 0],
  ['c9', 'ingreso', 'Otros', '📥', '#E9C46A', 0],
];

const SYSTEM_CATEGORIES = [
  [CAT_SALDO_ANTERIOR, 'sistema', 'Saldo anterior', '↩', SYSTEM_PALETTE_COLORS[CAT_SALDO_ANTERIOR], 1],
  [CAT_AHORRO, 'ahorro', 'Ahorro', '🏦', SYSTEM_PALETTE_COLORS[CAT_AHORRO], 1],
  [CAT_DEUDA_PAGO, 'gasto', 'Pago deuda', '💳', SYSTEM_PALETTE_COLORS[CAT_DEUDA_PAGO], 1],
  [CAT_PRESTAMO, 'gasto', 'Préstamo', '🤝', SYSTEM_PALETTE_COLORS[CAT_PRESTAMO], 1],
  [CAT_COBRO_PRESTAMO, 'ingreso', 'Cobro préstamo', '💵', SYSTEM_PALETTE_COLORS[CAT_COBRO_PRESTAMO], 1],
  [CAT_DEUDA_RECIBIDA, 'ingreso', 'Deuda recibida', '📥', SYSTEM_PALETTE_COLORS[CAT_DEUDA_RECIBIDA], 1],
];

async function columnExists(table, column) {
  const db = await getDb();
  const cols = await db.getAllAsync(`PRAGMA table_info(${table})`);
  return cols.some((c) => c.name === column);
}

async function ensureSchema() {
  const db = await getDb();

  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY NOT NULL,
      type TEXT NOT NULL,
      name TEXT NOT NULL,
      icon TEXT NOT NULL,
      color TEXT NOT NULL,
      locked INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS movements (
      id TEXT PRIMARY KEY NOT NULL,
      type TEXT NOT NULL,
      category_id TEXT NOT NULL,
      amount REAL NOT NULL,
      date TEXT NOT NULL,
      note TEXT,
      savings_goal_id TEXT,
      recurring_id TEXT
    );
    CREATE TABLE IF NOT EXISTS savings_goals (
      id TEXT PRIMARY KEY NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      image_uri TEXT,
      target_amount REAL,
      target_date TEXT,
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS recurring_expenses (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      amount REAL NOT NULL,
      category_id TEXT NOT NULL,
      day_of_month INTEGER NOT NULL DEFAULT 1,
      frequency TEXT NOT NULL DEFAULT 'monthly',
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS debts (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      total_amount REAL NOT NULL,
      pending_amount REAL NOT NULL,
      due_date TEXT,
      description TEXT,
      kind TEXT NOT NULL DEFAULT 'owe',
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL
    );
  `);

  if (!(await columnExists('categories', 'locked'))) {
    await db.execAsync('ALTER TABLE categories ADD COLUMN locked INTEGER NOT NULL DEFAULT 0');
  }
  if (!(await columnExists('movements', 'savings_goal_id'))) {
    await db.execAsync('ALTER TABLE movements ADD COLUMN savings_goal_id TEXT');
  }
  if (!(await columnExists('movements', 'recurring_id'))) {
    await db.execAsync('ALTER TABLE movements ADD COLUMN recurring_id TEXT');
  }
  if (!(await columnExists('movements', 'debt_id'))) {
    await db.execAsync('ALTER TABLE movements ADD COLUMN debt_id TEXT');
  }
  if (!(await columnExists('savings_goals', 'target_amount'))) {
    await db.execAsync('ALTER TABLE savings_goals ADD COLUMN target_amount REAL');
  }
  if (!(await columnExists('savings_goals', 'target_date'))) {
    await db.execAsync('ALTER TABLE savings_goals ADD COLUMN target_date TEXT');
  }
  if (!(await columnExists('debts', 'kind'))) {
    await db.execAsync("ALTER TABLE debts ADD COLUMN kind TEXT NOT NULL DEFAULT 'owe'");
  }
}

async function ensureSystemCategories() {
  const db = await getDb();
  for (const cat of SYSTEM_CATEGORIES) {
    await db.runAsync(
      `INSERT INTO categories (id, type, name, icon, color, locked)
       VALUES (?,?,?,?,?,?)
       ON CONFLICT(id) DO UPDATE SET
         type = excluded.type,
         name = excluded.name,
         icon = excluded.icon,
         color = excluded.color,
         locked = 1`,
      cat
    );
  }
}

export async function initDatabase() {
  await ensureSchema();
  const db = await getDb();

  const existing = await db.getAllAsync('SELECT COUNT(*) as count FROM categories WHERE locked = 0');
  if (existing[0].count === 0) {
    const any = await db.getAllAsync('SELECT COUNT(*) as count FROM categories');
    if (any[0].count === 0) {
      for (const cat of DEFAULT_CATEGORIES) {
        await db.runAsync(
          'INSERT INTO categories (id, type, name, icon, color, locked) VALUES (?,?,?,?,?,?)',
          cat
        );
      }
    }
  }

  await ensureSystemCategories();
}

export async function getCategories(type) {
  const db = await getDb();
  if (type) {
    return db.getAllAsync('SELECT * FROM categories WHERE type = ? ORDER BY locked DESC, name', [type]);
  }
  return db.getAllAsync('SELECT * FROM categories ORDER BY locked DESC, name');
}

export async function addCategoryDb(cat) {
  const db = await getDb();
  await db.runAsync(
    'INSERT INTO categories (id, type, name, icon, color, locked) VALUES (?,?,?,?,?,?)',
    [cat.id, cat.type, cat.name, cat.icon, cat.color, 0]
  );
}

/** Actualiza nombre/ícono/color (y tipo) sin cambiar el id, para no romper movimientos. */
export async function updateCategoryDb(cat) {
  if (
    cat.id === CAT_SALDO_ANTERIOR ||
    cat.id === CAT_AHORRO ||
    cat.id === CAT_DEUDA_PAGO ||
    cat.id === CAT_PRESTAMO ||
    cat.id === CAT_COBRO_PRESTAMO ||
    cat.id === CAT_DEUDA_RECIBIDA
  ) {
    throw new Error('Esta categoría del sistema no se puede editar');
  }
  const db = await getDb();
  const row = await db.getFirstAsync('SELECT locked FROM categories WHERE id = ?', [cat.id]);
  if (!row) throw new Error('Categoría no encontrada');
  if (row.locked) throw new Error('Esta categoría del sistema no se puede editar');

  await db.runAsync(
    'UPDATE categories SET name = ?, icon = ?, color = ?, type = ? WHERE id = ?',
    [cat.name, cat.icon, cat.color, cat.type, cat.id]
  );
}

export async function deleteCategoryDb(id) {
  if (
    id === CAT_SALDO_ANTERIOR ||
    id === CAT_AHORRO ||
    id === CAT_DEUDA_PAGO ||
    id === CAT_PRESTAMO ||
    id === CAT_COBRO_PRESTAMO ||
    id === CAT_DEUDA_RECIBIDA
  ) {
    throw new Error('Esta categoría del sistema no se puede eliminar');
  }
  const db = await getDb();
  const row = await db.getFirstAsync('SELECT locked FROM categories WHERE id = ?', [id]);
  if (row?.locked) {
    throw new Error('Esta categoría del sistema no se puede eliminar');
  }
  await db.runAsync('DELETE FROM categories WHERE id = ?', [id]);
}

export async function getMovementsByMonth(monthKeyStr) {
  const db = await getDb();
  return db.getAllAsync(
    'SELECT * FROM movements WHERE substr(date,1,7) = ? ORDER BY date DESC, id DESC',
    [monthKeyStr]
  );
}

export async function getAllMovements() {
  const db = await getDb();
  return db.getAllAsync('SELECT * FROM movements ORDER BY date DESC');
}

export async function addMovementDb(mov) {
  const db = await getDb();
  await db.runAsync(
    'INSERT INTO movements (id, type, category_id, amount, date, note, savings_goal_id, recurring_id, debt_id) VALUES (?,?,?,?,?,?,?,?,?)',
    [
      mov.id,
      mov.type,
      mov.categoryId,
      mov.amount,
      mov.date,
      mov.note || '',
      mov.savingsGoalId || null,
      mov.recurringId || null,
      mov.debtId || null,
    ]
  );
}

export async function upsertMovementDb(mov) {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO movements (id, type, category_id, amount, date, note, savings_goal_id, recurring_id, debt_id)
     VALUES (?,?,?,?,?,?,?,?,?)
     ON CONFLICT(id) DO UPDATE SET
       type = excluded.type,
       category_id = excluded.category_id,
       amount = excluded.amount,
       date = excluded.date,
       note = excluded.note,
       savings_goal_id = excluded.savings_goal_id,
       recurring_id = excluded.recurring_id,
       debt_id = excluded.debt_id`,
    [
      mov.id,
      mov.type,
      mov.categoryId,
      mov.amount,
      mov.date,
      mov.note || '',
      mov.savingsGoalId || null,
      mov.recurringId || null,
      mov.debtId || null,
    ]
  );
}

/** Actualiza un movimiento existente y sincroniza efectos sobre deudas. */
export async function updateMovementDb(mov) {
  if (String(mov.id).startsWith('carry_')) {
    throw new Error('El saldo anterior se calcula solo; no se puede editar');
  }
  const db = await getDb();
  const prev = await db.getFirstAsync('SELECT * FROM movements WHERE id = ?', [mov.id]);
  if (!prev) {
    throw new Error('Movimiento no encontrado');
  }
  if (prev.category_id === CAT_SALDO_ANTERIOR || String(prev.id).startsWith('carry_')) {
    throw new Error('El saldo anterior se calcula solo; no se puede editar');
  }

  await reverseDebtSideEffect(db, prev);

  await db.runAsync(
    `UPDATE movements
     SET type = ?, category_id = ?, amount = ?, date = ?, note = ?,
         savings_goal_id = ?, recurring_id = ?, debt_id = ?
     WHERE id = ?`,
    [
      mov.type,
      mov.categoryId,
      mov.amount,
      mov.date,
      mov.note || '',
      mov.savingsGoalId || null,
      mov.recurringId || null,
      mov.debtId || null,
      mov.id,
    ]
  );

  await applyDebtSideEffect(db, {
    type: mov.type,
    amount: mov.amount,
    debt_id: mov.debtId || null,
  });
}

async function reverseDebtSideEffect(db, mov) {
  if (!mov?.debt_id) return;
  const debt = await db.getFirstAsync('SELECT * FROM debts WHERE id = ?', [mov.debt_id]);
  if (!debt) return;
  const kind = debt.kind || 'owe';
  if (kind === 'owe' && mov.type === 'gasto') {
    await db.runAsync(
      'UPDATE debts SET pending_amount = pending_amount + ? WHERE id = ?',
      [mov.amount, mov.debt_id]
    );
  } else if (kind === 'lend' && mov.type === 'ingreso') {
    await db.runAsync(
      'UPDATE debts SET pending_amount = pending_amount + ? WHERE id = ?',
      [mov.amount, mov.debt_id]
    );
  } else if (kind === 'lend' && mov.type === 'gasto') {
    const next = Math.max(0, (debt.pending_amount || 0) - mov.amount);
    await db.runAsync('UPDATE debts SET pending_amount = ? WHERE id = ?', [next, mov.debt_id]);
  }
}

async function applyDebtSideEffect(db, mov) {
  if (!mov?.debt_id) return;
  const debt = await db.getFirstAsync('SELECT * FROM debts WHERE id = ?', [mov.debt_id]);
  if (!debt) return;
  const kind = debt.kind || 'owe';
  if (kind === 'owe' && mov.type === 'gasto') {
    const next = Math.max(0, (debt.pending_amount || 0) - mov.amount);
    await db.runAsync('UPDATE debts SET pending_amount = ? WHERE id = ?', [next, mov.debt_id]);
  } else if (kind === 'lend' && mov.type === 'ingreso') {
    const next = Math.max(0, (debt.pending_amount || 0) - mov.amount);
    await db.runAsync('UPDATE debts SET pending_amount = ? WHERE id = ?', [next, mov.debt_id]);
  } else if (kind === 'lend' && mov.type === 'gasto') {
    await db.runAsync(
      'UPDATE debts SET pending_amount = pending_amount + ? WHERE id = ?',
      [mov.amount, mov.debt_id]
    );
  }
}

export async function deleteMovementDb(id) {
  if (String(id).startsWith('carry_')) {
    throw new Error('El saldo anterior se calcula solo; no se puede eliminar');
  }
  const db = await getDb();
  const mov = await db.getFirstAsync('SELECT * FROM movements WHERE id = ?', [id]);
  if (mov) await reverseDebtSideEffect(db, mov);
  await db.runAsync('DELETE FROM movements WHERE id = ?', [id]);
}

/** Calcula el saldo del mes anterior y lo refleja como movimiento fijo del mes actual. */
export async function ensureCarryOver(monthKeyStr) {
  const prevKey = prevMonthKey(monthKeyStr);
  const prevMovs = await getMovementsByMonth(prevKey);
  const { balance } = calcMonthTotals(prevMovs);
  const carryId = carryMovementId(monthKeyStr);
  const db = await getDb();

  if (Math.abs(balance) < 0.005) {
    await db.runAsync('DELETE FROM movements WHERE id = ?', [carryId]);
    return;
  }

  const type = balance >= 0 ? 'ingreso' : 'gasto';
  const amount = Math.abs(balance);
  const [y, m] = prevKey.split('-').map(Number);
  const monthNames = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
  ];
  const note = `Traspaso de ${monthNames[m - 1]} ${y}`;

  await upsertMovementDb({
    id: carryId,
    type,
    categoryId: CAT_SALDO_ANTERIOR,
    amount,
    date: firstDayOfMonth(monthKeyStr),
    note,
    savingsGoalId: null,
    recurringId: null,
  });
}

export async function getSavingsGoals(activeOnly = false) {
  const db = await getDb();
  if (activeOnly) {
    return db.getAllAsync(
      'SELECT * FROM savings_goals WHERE active = 1 ORDER BY created_at DESC'
    );
  }
  return db.getAllAsync('SELECT * FROM savings_goals ORDER BY active DESC, created_at DESC');
}

export async function addSavingsGoalDb(goal) {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO savings_goals
      (id, title, description, image_uri, target_amount, target_date, active, created_at)
     VALUES (?,?,?,?,?,?,?,?)`,
    [
      goal.id,
      goal.title,
      goal.description || '',
      goal.imageUri || null,
      goal.targetAmount ?? null,
      goal.targetDate || null,
      1,
      goal.createdAt,
    ]
  );
}

export async function updateSavingsGoalDb(goal) {
  const db = await getDb();
  await db.runAsync(
    `UPDATE savings_goals
     SET title = ?, description = ?, image_uri = ?, target_amount = ?, target_date = ?, active = ?
     WHERE id = ?`,
    [
      goal.title,
      goal.description || '',
      goal.imageUri || null,
      goal.targetAmount ?? null,
      goal.targetDate || null,
      goal.active ? 1 : 0,
      goal.id,
    ]
  );
}

export async function setSavingsGoalActiveDb(id, active) {
  const db = await getDb();
  await db.runAsync('UPDATE savings_goals SET active = ? WHERE id = ?', [active ? 1 : 0, id]);
}

export async function deleteSavingsGoalDb(id) {
  const db = await getDb();
  await db.runAsync('UPDATE movements SET savings_goal_id = NULL WHERE savings_goal_id = ?', [id]);
  await db.runAsync('DELETE FROM savings_goals WHERE id = ?', [id]);
}

export async function getSavingsTotalsByGoal() {
  const db = await getDb();
  return db.getAllAsync(
    `SELECT savings_goal_id as id, SUM(amount) as total
     FROM movements
     WHERE category_id = ? AND savings_goal_id IS NOT NULL
     GROUP BY savings_goal_id`,
    [CAT_AHORRO]
  );
}

export async function getActiveSavingsTotal() {
  const db = await getDb();
  const row = await db.getFirstAsync(
    `SELECT COALESCE(SUM(m.amount), 0) as total
     FROM movements m
     INNER JOIN savings_goals g ON g.id = m.savings_goal_id
     WHERE m.category_id = ? AND g.active = 1`,
    [CAT_AHORRO]
  );
  return row?.total || 0;
}

export async function getAvailableForSavings(monthKeyStr) {
  const movs = await getMovementsByMonth(monthKeyStr);
  const { balance } = calcMonthTotals(movs);
  return Math.max(0, balance);
}

/* ——— Gastos recurrentes ——— */

export async function getRecurringExpenses(activeOnly = true) {
  const db = await getDb();
  if (activeOnly) {
    return db.getAllAsync(
      'SELECT * FROM recurring_expenses WHERE active = 1 ORDER BY day_of_month, name'
    );
  }
  return db.getAllAsync('SELECT * FROM recurring_expenses ORDER BY active DESC, name');
}

export async function addRecurringExpenseDb(item) {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO recurring_expenses
      (id, name, amount, category_id, day_of_month, frequency, active, created_at)
     VALUES (?,?,?,?,?,?,?,?)`,
    [
      item.id,
      item.name,
      item.amount,
      item.categoryId,
      item.dayOfMonth || 1,
      item.frequency || 'monthly',
      1,
      item.createdAt,
    ]
  );
}

export async function updateRecurringExpenseDb(item) {
  const db = await getDb();
  await db.runAsync(
    `UPDATE recurring_expenses
     SET name = ?, amount = ?, category_id = ?, day_of_month = ?, frequency = ?, active = ?
     WHERE id = ?`,
    [
      item.name,
      item.amount,
      item.categoryId,
      item.dayOfMonth || 1,
      item.frequency || 'monthly',
      item.active ? 1 : 0,
      item.id,
    ]
  );
}

export async function deleteRecurringExpenseDb(id) {
  const db = await getDb();
  await db.runAsync('DELETE FROM recurring_expenses WHERE id = ?', [id]);
}

/** Recurrentes activos que aún no tienen movimiento en el mes. */
export async function getPendingRecurring(monthKeyStr) {
  const all = await getRecurringExpenses(true);
  const db = await getDb();
  const registered = await db.getAllAsync(
    `SELECT recurring_id FROM movements
     WHERE substr(date,1,7) = ? AND recurring_id IS NOT NULL`,
    [monthKeyStr]
  );
  const done = new Set(registered.map((r) => r.recurring_id));
  return all.filter((r) => !done.has(r.id));
}

/* ——— Deudas ——— */

export async function getDebts(activeOnly = true) {
  const db = await getDb();
  if (activeOnly) {
    return db.getAllAsync(
      'SELECT * FROM debts WHERE active = 1 ORDER BY pending_amount DESC, name'
    );
  }
  return db.getAllAsync('SELECT * FROM debts ORDER BY active DESC, name');
}

export async function addDebtDb(debt) {
  const db = await getDb();
  const kind = debt.kind === 'lend' ? 'lend' : 'owe';
  const total = debt.totalAmount;
  const pending = debt.pendingAmount ?? total;

  await db.runAsync(
    `INSERT INTO debts
      (id, name, total_amount, pending_amount, due_date, description, kind, active, created_at)
     VALUES (?,?,?,?,?,?,?,?,?)`,
    [
      debt.id,
      debt.name,
      total,
      pending,
      debt.dueDate || null,
      debt.description || '',
      kind,
      1,
      debt.createdAt,
    ]
  );

  // Si presto plata, se descuenta de lo que tengo (gasto inmediato)
  if (kind === 'lend' && pending > 0) {
    await db.runAsync(
      'INSERT INTO movements (id, type, category_id, amount, date, note, savings_goal_id, recurring_id, debt_id) VALUES (?,?,?,?,?,?,?,?,?)',
      [
        debt.movementId || `${debt.id}_lend`,
        'gasto',
        CAT_PRESTAMO,
        pending,
        debt.date || new Date().toISOString().slice(0, 10),
        `Préstamo a ${debt.name}`,
        null,
        null,
        debt.id,
      ]
    );
  }

  // Si me prestaron en plata y la tengo disponible (ingreso opcional)
  if (kind === 'owe' && debt.receivedCash && pending > 0) {
    await db.runAsync(
      'INSERT INTO movements (id, type, category_id, amount, date, note, savings_goal_id, recurring_id, debt_id) VALUES (?,?,?,?,?,?,?,?,?)',
      [
        debt.movementId || `${debt.id}_recv`,
        'ingreso',
        CAT_DEUDA_RECIBIDA,
        pending,
        debt.date || new Date().toISOString().slice(0, 10),
        `Deuda recibida de ${debt.name}`,
        null,
        null,
        debt.id,
      ]
    );
  }
}

export async function updateDebtDb(debt) {
  const db = await getDb();
  await db.runAsync(
    `UPDATE debts
     SET name = ?, total_amount = ?, pending_amount = ?, due_date = ?, description = ?, kind = ?, active = ?
     WHERE id = ?`,
    [
      debt.name,
      debt.totalAmount,
      debt.pendingAmount,
      debt.dueDate || null,
      debt.description || '',
      debt.kind === 'lend' ? 'lend' : 'owe',
      debt.active ? 1 : 0,
      debt.id,
    ]
  );
}

export async function deleteDebtDb(id) {
  const db = await getDb();
  await db.runAsync('UPDATE movements SET debt_id = NULL WHERE debt_id = ?', [id]);
  await db.runAsync('DELETE FROM debts WHERE id = ?', [id]);
}

/**
 * owe  → pago: gasto (sale plata)
 * lend → cobro: ingreso (entra plata)
 */
export async function payDebtDb({ debtId, amount, date, movementId }) {
  const db = await getDb();
  const debt = await db.getFirstAsync('SELECT * FROM debts WHERE id = ?', [debtId]);
  if (!debt) throw new Error('Deuda no encontrada');
  if (amount <= 0) throw new Error('El monto debe ser mayor a 0');
  if (amount > debt.pending_amount + 0.001) {
    throw new Error('El monto no puede superar el valor pendiente');
  }

  const kind = debt.kind || 'owe';
  const newPending = Math.max(0, debt.pending_amount - amount);
  await db.runAsync('UPDATE debts SET pending_amount = ? WHERE id = ?', [newPending, debtId]);

  if (kind === 'lend') {
    await db.runAsync(
      'INSERT INTO movements (id, type, category_id, amount, date, note, savings_goal_id, recurring_id, debt_id) VALUES (?,?,?,?,?,?,?,?,?)',
      [
        movementId,
        'ingreso',
        CAT_COBRO_PRESTAMO,
        amount,
        date,
        `Cobro préstamo ${debt.name}`,
        null,
        null,
        debtId,
      ]
    );
  } else {
    await db.runAsync(
      'INSERT INTO movements (id, type, category_id, amount, date, note, savings_goal_id, recurring_id, debt_id) VALUES (?,?,?,?,?,?,?,?,?)',
      [
        movementId,
        'gasto',
        CAT_DEUDA_PAGO,
        amount,
        date,
        `Pago deuda ${debt.name}`,
        null,
        null,
        debtId,
      ]
    );
  }
  return newPending;
}

export async function exportBackupData() {
  const db = await getDb();
  const categories = await db.getAllAsync('SELECT * FROM categories ORDER BY name');
  const movements = await db.getAllAsync('SELECT * FROM movements ORDER BY date DESC');
  const savingsGoals = await db.getAllAsync('SELECT * FROM savings_goals ORDER BY created_at DESC');
  const recurringExpenses = await db.getAllAsync('SELECT * FROM recurring_expenses ORDER BY name');
  const debts = await db.getAllAsync('SELECT * FROM debts ORDER BY name');
  return {
    version: 4,
    app: 'mis-finanzas',
    exportedAt: new Date().toISOString(),
    categories,
    movements,
    savingsGoals,
    recurringExpenses,
    debts,
  };
}

export async function importBackupData(data) {
  if (!data || !Array.isArray(data.categories) || !Array.isArray(data.movements)) {
    throw new Error('Archivo de respaldo inválido');
  }

  const db = await getDb();
  await db.withTransactionAsync(async () => {
    await db.execAsync(
      'DELETE FROM movements; DELETE FROM savings_goals; DELETE FROM recurring_expenses; DELETE FROM debts; DELETE FROM categories;'
    );

    for (const c of data.categories) {
      await db.runAsync(
        'INSERT INTO categories (id, type, name, icon, color, locked) VALUES (?,?,?,?,?,?)',
        [c.id, c.type, c.name, c.icon, c.color, c.locked ? 1 : 0]
      );
    }

    for (const g of data.savingsGoals || []) {
      await db.runAsync(
        `INSERT INTO savings_goals
          (id, title, description, image_uri, target_amount, target_date, active, created_at)
         VALUES (?,?,?,?,?,?,?,?)`,
        [
          g.id,
          g.title,
          g.description || '',
          g.image_uri || null,
          g.target_amount ?? null,
          g.target_date || null,
          g.active ? 1 : 0,
          g.created_at,
        ]
      );
    }

    for (const r of data.recurringExpenses || []) {
      await db.runAsync(
        `INSERT INTO recurring_expenses
          (id, name, amount, category_id, day_of_month, frequency, active, created_at)
         VALUES (?,?,?,?,?,?,?,?)`,
        [
          r.id,
          r.name,
          r.amount,
          r.category_id,
          r.day_of_month || 1,
          r.frequency || 'monthly',
          r.active ? 1 : 0,
          r.created_at,
        ]
      );
    }

    for (const d of data.debts || []) {
      await db.runAsync(
        `INSERT INTO debts
          (id, name, total_amount, pending_amount, due_date, description, kind, active, created_at)
         VALUES (?,?,?,?,?,?,?,?,?)`,
        [
          d.id,
          d.name,
          d.total_amount,
          d.pending_amount,
          d.due_date || null,
          d.description || '',
          d.kind === 'lend' ? 'lend' : 'owe',
          d.active ? 1 : 0,
          d.created_at,
        ]
      );
    }

    for (const m of data.movements) {
      await db.runAsync(
        'INSERT INTO movements (id, type, category_id, amount, date, note, savings_goal_id, recurring_id, debt_id) VALUES (?,?,?,?,?,?,?,?,?)',
        [
          m.id,
          m.type,
          m.category_id,
          m.amount,
          m.date,
          m.note || '',
          m.savings_goal_id || null,
          m.recurring_id || null,
          m.debt_id || null,
        ]
      );
    }
  });

  await ensureSystemCategories();
}

export function getDatabaseFilePath() {
  const dir = SQLite.defaultDatabaseDirectory || '';
  const sep = dir.endsWith('/') ? '' : '/';
  return `${dir}${sep}finanzas.db`;
}

export async function checkpointDatabase() {
  const db = await getDb();
  await db.execAsync('PRAGMA wal_checkpoint(FULL);');
}

export async function closeDatabase() {
  if (dbInstance) {
    await dbInstance.closeAsync();
    dbInstance = null;
  }
}

export async function replaceDatabaseFromFile(sourceUri) {
  const FileSystem = await import('expo-file-system/legacy');
  const dest = getDatabaseFilePath();

  await closeDatabase();

  const info = await FileSystem.getInfoAsync(dest);
  if (info.exists) {
    await FileSystem.deleteAsync(dest, { idempotent: true });
  }
  for (const suffix of ['-wal', '-shm']) {
    const side = `${dest}${suffix}`;
    const sideInfo = await FileSystem.getInfoAsync(side);
    if (sideInfo.exists) {
      await FileSystem.deleteAsync(side, { idempotent: true });
    }
  }

  await FileSystem.copyAsync({ from: sourceUri, to: dest });
  await initDatabase();
}
