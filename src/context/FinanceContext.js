import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  initDatabase,
  getCategories,
  addCategoryDb,
  updateCategoryDb,
  deleteCategoryDb,
  getMovementsByMonth,
  addMovementDb,
  updateMovementDb,
  deleteMovementDb,
  exportBackupData,
  importBackupData,
  checkpointDatabase,
  getDatabaseFilePath,
  replaceDatabaseFromFile,
  ensureCarryOver,
  getSavingsGoals,
  addSavingsGoalDb,
  updateSavingsGoalDb,
  setSavingsGoalActiveDb,
  deleteSavingsGoalDb,
  getSavingsTotalsByGoal,
  getActiveSavingsTotal,
  getAvailableForSavings,
  getRecurringExpenses,
  addRecurringExpenseDb,
  updateRecurringExpenseDb,
  deleteRecurringExpenseDb,
  getPendingRecurring,
  getDebts,
  addDebtDb,
  updateDebtDb,
  deleteDebtDb,
  payDebtDb,
} from '../database/db';
import { monthKey, nextMonthKey, calcMonthTotals, uid } from '../theme';

const FinanceContext = createContext(null);

export function FinanceProvider({ children }) {
  const [ready, setReady] = useState(false);
  const [categories, setCategories] = useState([]);
  const [movements, setMovements] = useState([]);
  const [savingsGoals, setSavingsGoals] = useState([]);
  const [savingsTotals, setSavingsTotals] = useState({});
  const [activeSavingsTotal, setActiveSavingsTotal] = useState(0);
  const [recurringExpenses, setRecurringExpenses] = useState([]);
  const [pendingRecurring, setPendingRecurring] = useState([]);
  const [debts, setDebts] = useState([]);
  const [currentDate, setCurrentDate] = useState(new Date());

  const refreshCategories = useCallback(async () => {
    setCategories(await getCategories());
  }, []);

  const refreshSavings = useCallback(async () => {
    const goals = await getSavingsGoals(false);
    const totalsRows = await getSavingsTotalsByGoal();
    const totals = {};
    totalsRows.forEach((r) => {
      totals[r.id] = r.total || 0;
    });
    setSavingsGoals(goals);
    setSavingsTotals(totals);
    setActiveSavingsTotal(await getActiveSavingsTotal());
  }, []);

  const refreshDebts = useCallback(async () => {
    setDebts(await getDebts(false));
  }, []);

  const refreshRecurring = useCallback(async (date) => {
    const key = monthKey(date || currentDate);
    setRecurringExpenses(await getRecurringExpenses(false));
    setPendingRecurring(await getPendingRecurring(key));
  }, [currentDate]);

  const refreshMovements = useCallback(async (date) => {
    const d = date || currentDate;
    const key = monthKey(d);
    await ensureCarryOver(key);
    setMovements(await getMovementsByMonth(key));
    await refreshRecurring(d);
  }, [currentDate, refreshRecurring]);

  const reloadAll = useCallback(async (date = currentDate) => {
    await refreshCategories();
    await refreshSavings();
    await refreshDebts();
    await refreshMovements(date);
  }, [currentDate, refreshCategories, refreshSavings, refreshDebts, refreshMovements]);

  useEffect(() => {
    (async () => {
      await initDatabase();
      await refreshCategories();
      await refreshSavings();
      await refreshDebts();
      await refreshMovements(currentDate);
      setReady(true);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (ready) refreshMovements(currentDate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentDate, ready]);

  function goToPrevMonth() {
    setCurrentDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  }
  function goToNextMonth() {
    setCurrentDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1));
  }

  async function syncCarryForMonth(dateStr) {
    await ensureCarryOver(nextMonthKey(dateStr.slice(0, 7)));
  }

  async function addMovement(mov) {
    await addMovementDb(mov);
    await syncCarryForMonth(mov.date);
    await refreshSavings();
    const movMonth = mov.date.slice(0, 7);
    if (movMonth !== monthKey(currentDate)) {
      const [y, m] = movMonth.split('-').map(Number);
      setCurrentDate(new Date(y, m - 1, 1));
    } else {
      await refreshMovements(currentDate);
    }
  }

  async function updateMovement(mov) {
    const prev = movements.find((m) => m.id === mov.id);
    await updateMovementDb(mov);
    if (prev?.date) await syncCarryForMonth(prev.date);
    await syncCarryForMonth(mov.date);
    await refreshSavings();
    await refreshDebts();
    const movMonth = mov.date.slice(0, 7);
    if (movMonth !== monthKey(currentDate)) {
      const [y, m] = movMonth.split('-').map(Number);
      setCurrentDate(new Date(y, m - 1, 1));
    } else {
      await refreshMovements(currentDate);
    }
  }

  async function deleteMovement(id) {
    const mov = movements.find((m) => m.id === id);
    await deleteMovementDb(id);
    if (mov) await syncCarryForMonth(mov.date);
    await refreshSavings();
    await refreshDebts();
    await refreshMovements(currentDate);
  }

  async function addCategory(cat) {
    await addCategoryDb(cat);
    await refreshCategories();
  }

  async function updateCategory(cat) {
    await updateCategoryDb(cat);
    await refreshCategories();
  }

  async function deleteCategory(id) {
    await deleteCategoryDb(id);
    await refreshCategories();
  }

  function categoryById(id) {
    return categories.find((c) => c.id === id) || null;
  }

  async function addSavingsGoal(goal) {
    await addSavingsGoalDb(goal);
    await refreshSavings();
  }

  async function updateSavingsGoal(goal) {
    await updateSavingsGoalDb(goal);
    await refreshSavings();
  }

  async function setSavingsGoalActive(id, active) {
    await setSavingsGoalActiveDb(id, active);
    await refreshSavings();
  }

  async function deleteSavingsGoal(id) {
    await deleteSavingsGoalDb(id);
    await refreshSavings();
  }

  async function availableForSavings(dateStr) {
    return getAvailableForSavings((dateStr || monthKey(currentDate)).slice(0, 7));
  }

  async function addRecurringExpense(item) {
    await addRecurringExpenseDb(item);
    await refreshRecurring(currentDate);
  }

  async function updateRecurringExpense(item) {
    await updateRecurringExpenseDb(item);
    await refreshRecurring(currentDate);
  }

  async function deleteRecurringExpense(id) {
    await deleteRecurringExpenseDb(id);
    await refreshRecurring(currentDate);
  }

  /** Registra un gasto fijo pendiente con la fecha de hoy (el día habitual es solo guía). */
  async function registerPendingRecurring(recurring) {
    const key = monthKey(currentDate);
    const today = new Date();
    const todayIso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    let date = todayIso;
    // Si estás viendo otro mes, usa el mismo día del mes (acotado) para que cuente ahí.
    if (todayIso.slice(0, 7) !== key) {
      const [y, m] = key.split('-').map(Number);
      const lastDay = new Date(y, m, 0).getDate();
      const day = Math.min(today.getDate(), lastDay);
      date = `${key}-${String(day).padStart(2, '0')}`;
    }
    await addMovement({
      id: uid(),
      type: 'gasto',
      categoryId: recurring.category_id,
      amount: recurring.amount,
      date,
      note: recurring.name,
      savingsGoalId: null,
      recurringId: recurring.id,
    });
  }

  async function addDebt(debt) {
    const needsMovement = debt.kind === 'lend' || debt.receivedCash;
    await addDebtDb({
      ...debt,
      movementId: needsMovement ? uid() : undefined,
    });
    await refreshDebts();
    if (needsMovement) {
      const dateStr = debt.date || new Date().toISOString().slice(0, 10);
      await syncCarryForMonth(dateStr);
      if (dateStr.slice(0, 7) === monthKey(currentDate)) {
        await refreshMovements(currentDate);
      }
    }
  }

  async function updateDebt(debt) {
    await updateDebtDb(debt);
    await refreshDebts();
  }

  async function deleteDebt(id) {
    await deleteDebtDb(id);
    await refreshDebts();
  }

  async function payDebt({ debtId, amount, date }) {
    await payDebtDb({
      debtId,
      amount,
      date,
      movementId: uid(),
    });
    await syncCarryForMonth(date);
    await refreshDebts();
    const movMonth = date.slice(0, 7);
    if (movMonth !== monthKey(currentDate)) {
      const [y, m] = movMonth.split('-').map(Number);
      setCurrentDate(new Date(y, m - 1, 1));
    } else {
      await refreshMovements(currentDate);
    }
  }

  async function createBackup() {
    return exportBackupData();
  }

  async function restoreBackup(data) {
    await importBackupData(data);
    await reloadAll(currentDate);
  }

  async function prepareSqliteExport() {
    await checkpointDatabase();
    return getDatabaseFilePath();
  }

  async function restoreFromSqliteFile(uri) {
    await replaceDatabaseFromFile(uri);
    await reloadAll(currentDate);
  }

  const monthTotals = calcMonthTotals(movements);
  const activeGoals = savingsGoals.filter((g) => g.active);
  const openDebts = debts.filter((d) => d.active && d.pending_amount > 0.005);
  const openOwedDebts = openDebts.filter((d) => (d.kind || 'owe') === 'owe');

  const value = {
    ready,
    categories,
    movements,
    currentDate,
    savingsGoals,
    activeGoals,
    savingsTotals,
    activeSavingsTotal,
    recurringExpenses,
    pendingRecurring,
    debts,
    openDebts,
    openOwedDebts,
    monthTotals,
    goToPrevMonth,
    goToNextMonth,
    addMovement,
    updateMovement,
    deleteMovement,
    addCategory,
    updateCategory,
    deleteCategory,
    categoryById,
    addSavingsGoal,
    updateSavingsGoal,
    setSavingsGoalActive,
    deleteSavingsGoal,
    availableForSavings,
    addRecurringExpense,
    updateRecurringExpense,
    deleteRecurringExpense,
    registerPendingRecurring,
    addDebt,
    updateDebt,
    deleteDebt,
    payDebt,
    createBackup,
    restoreBackup,
    prepareSqliteExport,
    restoreFromSqliteFile,
  };

  return <FinanceContext.Provider value={value}>{children}</FinanceContext.Provider>;
}

export function useFinance() {
  const ctx = useContext(FinanceContext);
  if (!ctx) throw new Error('useFinance debe usarse dentro de FinanceProvider');
  return ctx;
}
