import React, { useEffect, useState } from 'react';
import {
  Modal, View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFinance } from '../context/FinanceContext';
import DateField from './DateField';
import {
  COLORS, CAT_AHORRO, CAT_SALDO_ANTERIOR, CAT_DEUDA_PAGO, CAT_PRESTAMO,
  CAT_COBRO_PRESTAMO, CAT_DEUDA_RECIBIDA, uid, formatMoney, formatAmountInput,
  parseAmountInput, isAhorroMovement, isCarryMovement,
} from '../theme';

const HIDDEN_SYSTEM_CATS = new Set([
  CAT_SALDO_ANTERIOR,
  CAT_AHORRO,
  CAT_DEUDA_PAGO,
  CAT_PRESTAMO,
  CAT_COBRO_PRESTAMO,
  CAT_DEUDA_RECIBIDA,
]);

export default function AddMovementModal({
  visible,
  onClose,
  initialType = 'gasto',
  editing = null,
}) {
  const insets = useSafeAreaInsets();
  const {
    categories, activeGoals, openOwedDebts,
    addMovement, updateMovement, availableForSavings,
  } = useFinance();
  const [type, setType] = useState(initialType);
  const [categoryId, setCategoryId] = useState(null);
  const [savingsGoalId, setSavingsGoalId] = useState(null);
  const [debtId, setDebtId] = useState(null);
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState('');
  const [available, setAvailable] = useState(0);
  const [recurringId, setRecurringId] = useState(null);

  const isEditing = !!editing;
  const isAhorro = type === 'ahorro';
  const isIngreso = type === 'ingreso';
  const catsForType = categories.filter((c) => {
    if (c.type !== type) return false;
    if (c.id === categoryId) return true;
    if (HIDDEN_SYSTEM_CATS.has(c.id) || c.locked) return false;
    return true;
  });

  useEffect(() => {
    if (!visible) return;
    if (editing) {
      const editType = isAhorroMovement(editing) ? 'ahorro' : editing.type;
      setType(editType);
      setCategoryId(editing.category_id);
      setSavingsGoalId(editing.savings_goal_id || null);
      setDebtId(editing.debt_id || null);
      setAmount(formatAmountInput(String(Math.round(editing.amount))));
      setDate(editing.date);
      setNote(editing.note || '');
      setRecurringId(editing.recurring_id || null);
    } else {
      setType(initialType);
      setAmount('');
      setNote('');
      setDate(new Date().toISOString().slice(0, 10));
      setSavingsGoalId(null);
      setDebtId(null);
      setRecurringId(null);
      setCategoryId(null);
    }
  }, [visible, initialType, editing]);

  useEffect(() => {
    if (!visible) return;
    if (isAhorro) {
      setCategoryId(CAT_AHORRO);
      return;
    }
    if (catsForType.length > 0 && !catsForType.some((c) => c.id === categoryId)) {
      setCategoryId(catsForType[0].id);
    }
    if (catsForType.length === 0) setCategoryId(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, categories, visible]);

  useEffect(() => {
    if (!visible || !isAhorro) return;
    let cancelled = false;
    (async () => {
      let avail = await availableForSavings(date);
      if (
        editing &&
        isAhorroMovement(editing) &&
        editing.date.slice(0, 7) === date.slice(0, 7)
      ) {
        avail += editing.amount;
      }
      if (!cancelled) setAvailable(avail);
    })();
    return () => { cancelled = true; };
  }, [visible, isAhorro, date, availableForSavings, editing]);

  async function handleSave() {
    if (editing && isCarryMovement(editing)) {
      Alert.alert('Saldo anterior', 'Este movimiento se calcula solo y no se puede editar.');
      return;
    }
    const numAmount = parseAmountInput(amount);
    if (!isAhorro && !categoryId) {
      Alert.alert('Falta categoría', 'Primero crea una categoría de este tipo en la pestaña Categorías.');
      return;
    }
    if (!numAmount || numAmount <= 0) {
      Alert.alert('Monto inválido', 'Ingresa un monto mayor a 0.');
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      Alert.alert('Fecha inválida', 'Elige una fecha válida.');
      return;
    }

    if (isAhorro) {
      let avail = await availableForSavings(date);
      if (
        editing &&
        isAhorroMovement(editing) &&
        editing.date.slice(0, 7) === date.slice(0, 7)
      ) {
        avail += editing.amount;
      }
      if (avail <= 0) {
        Alert.alert(
          'Sin saldo disponible',
          'Solo puedes ahorrar de lo que te sobra este mes (saldo disponible).'
        );
        return;
      }
      if (numAmount > avail + 0.001) {
        Alert.alert(
          'Monto muy alto',
          `Solo puedes ahorrar hasta ${formatMoney(avail)}.`
        );
        return;
      }
    }

    const payload = {
      id: isEditing ? editing.id : uid(),
      type: isAhorro ? 'ahorro' : type,
      categoryId: isAhorro ? CAT_AHORRO : categoryId,
      amount: numAmount,
      date,
      note: note.trim(),
      savingsGoalId: isAhorro ? savingsGoalId : null,
      debtId: isIngreso
        ? debtId
        : (isEditing ? (editing.debt_id || null) : null),
      recurringId: isEditing ? recurringId : null,
    };

    if (isEditing) {
      await updateMovement(payload);
    } else {
      await addMovement(payload);
    }
    onClose();
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboard}
        >
          <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
            <View style={styles.handle} />
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Text style={styles.closeTxt}>✕</Text>
            </TouchableOpacity>
            <Text style={styles.title}>{isEditing ? 'Editar movimiento' : 'Nuevo movimiento'}</Text>

            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.formContent}
            >
              <View style={styles.typeToggle}>
                <TouchableOpacity
                  style={[styles.typeBtn, type === 'gasto' && styles.typeBtnGastoActive]}
                  onPress={() => setType('gasto')}
                >
                  <Text style={[styles.typeTxt, type === 'gasto' && { color: COLORS.rust }]}>Gasto</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.typeBtn, type === 'ingreso' && styles.typeBtnIngresoActive]}
                  onPress={() => setType('ingreso')}
                >
                  <Text style={[styles.typeTxt, type === 'ingreso' && { color: COLORS.forest }]}>Ingreso</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.typeBtn, type === 'ahorro' && styles.typeBtnAhorroActive]}
                  onPress={() => setType('ahorro')}
                >
                  <Text style={[styles.typeTxt, type === 'ahorro' && { color: COLORS.gold }]}>Ahorro</Text>
                </TouchableOpacity>
              </View>

              {isAhorro ? (
                <>
                  <Text style={styles.label}>Meta (opcional)</Text>
                  {activeGoals.length === 0 ? (
                    <Text style={styles.hint}>
                      Puedes ahorrar sin meta, o crear una en la pestaña Ahorros.
                    </Text>
                  ) : (
                    <View style={styles.goalList}>
                      <TouchableOpacity
                        style={[styles.goalChip, savingsGoalId === null && styles.goalChipSelected]}
                        onPress={() => setSavingsGoalId(null)}
                      >
                        <Text style={styles.goalChipTxt}>Sin meta</Text>
                      </TouchableOpacity>
                      {activeGoals.map((g) => (
                        <TouchableOpacity
                          key={g.id}
                          style={[styles.goalChip, savingsGoalId === g.id && styles.goalChipSelected]}
                          onPress={() => setSavingsGoalId(g.id)}
                        >
                          <Text style={styles.goalChipTxt} numberOfLines={1}>{g.title}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                  <View style={styles.availBox}>
                    <Text style={styles.availLabel}>Disponible para ahorrar</Text>
                    <Text style={styles.availValue}>{formatMoney(available)}</Text>
                    <Text style={styles.hint}>
                      Sale del saldo disponible del mes. No cuenta como gasto.
                    </Text>
                  </View>
                </>
              ) : (
                <>
                  <Text style={styles.label}>Categoría</Text>
                  {catsForType.length === 0 ? (
                    <Text style={styles.hint}>
                      No tienes categorías de este tipo todavía. Créala primero en la pestaña Categorías.
                    </Text>
                  ) : (
                    <View style={styles.catRow}>
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.catScrollContent}
                      >
                        {catsForType.map((c) => (
                          <TouchableOpacity
                            key={c.id}
                            style={[styles.catChip, categoryId === c.id && styles.catChipSelected]}
                            onPress={() => setCategoryId(c.id)}
                          >
                            <View style={[styles.catChipIcon, { backgroundColor: `${c.color}22` }]}>
                              <Text style={{ fontSize: 16 }}>{c.icon}</Text>
                            </View>
                            <Text style={styles.catChipTxt} numberOfLines={1}>{c.name}</Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  )}
                  {isIngreso && openOwedDebts.length > 0 ? (
                    <>
                      <Text style={styles.label}>Vincular a deuda (opcional)</Text>
                      <Text style={styles.hint}>
                        Si este ingreso fue dinero que te prestaron, puedes asociarlo. No cambia el pendiente.
                      </Text>
                      <View style={styles.goalList}>
                        <TouchableOpacity
                          style={[styles.goalChip, debtId === null && styles.goalChipSelected]}
                          onPress={() => setDebtId(null)}
                        >
                          <Text style={styles.goalChipTxt}>Ninguna</Text>
                        </TouchableOpacity>
                        {openOwedDebts.map((d) => (
                          <TouchableOpacity
                            key={d.id}
                            style={[styles.goalChip, debtId === d.id && styles.goalChipSelected]}
                            onPress={() => setDebtId(d.id)}
                          >
                            <Text style={styles.goalChipTxt} numberOfLines={1}>{d.name}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </>
                  ) : null}
                </>
              )}

              <Text style={styles.label}>Monto</Text>
              <TextInput
                style={styles.input}
                placeholder="0"
                keyboardType="number-pad"
                value={amount}
                onChangeText={(text) => setAmount(formatAmountInput(text))}
              />

              <Text style={styles.label}>Fecha</Text>
              <DateField value={date} onChange={setDate} />

              <Text style={styles.label}>Nota (opcional)</Text>
              <TextInput
                style={[styles.input, { fontFamily: undefined }]}
                placeholder={isAhorro ? 'Ej: Quincena apartada' : 'Ej: Mercado de la semana'}
                value={note}
                onChangeText={setNote}
              />

              <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
                <Text style={styles.saveTxt}>{isEditing ? 'Guardar cambios' : 'Guardar movimiento'}</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(22,34,59,0.6)', justifyContent: 'flex-end' },
  keyboard: { width: '100%', maxHeight: '92%' },
  sheet: {
    backgroundColor: COLORS.paper,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 12,
    maxHeight: '100%',
  },
  handle: { width: 36, height: 4, backgroundColor: COLORS.line, borderRadius: 2, alignSelf: 'center', marginBottom: 14 },
  closeBtn: { position: 'absolute', top: 16, right: 16, padding: 4, zIndex: 2 },
  closeTxt: { fontSize: 18, color: COLORS.inkSoft },
  title: { fontSize: 19, fontWeight: '700', color: COLORS.ink, marginBottom: 12 },
  formContent: { paddingBottom: 8 },
  typeToggle: { flexDirection: 'row', gap: 6, marginBottom: 8 },
  typeBtn: { flex: 1, padding: 10, borderRadius: 10, borderWidth: 1.5, borderColor: COLORS.line, alignItems: 'center', backgroundColor: '#fff' },
  typeBtnGastoActive: { borderColor: COLORS.rust, backgroundColor: '#FBEEE9' },
  typeBtnIngresoActive: { borderColor: COLORS.forest, backgroundColor: '#EAF3EE' },
  typeBtnAhorroActive: { borderColor: COLORS.gold, backgroundColor: '#F7F0DE' },
  typeTxt: { fontSize: 12.5, fontWeight: '600', color: COLORS.inkSoft },
  label: { fontSize: 11.5, textTransform: 'uppercase', letterSpacing: 0.6, color: COLORS.inkSoft, marginTop: 12, marginBottom: 6 },
  hint: { fontSize: 12.5, color: COLORS.inkSoft, marginBottom: 8, lineHeight: 18 },
  availBox: {
    backgroundColor: COLORS.paperDim,
    borderRadius: 10,
    padding: 12,
    marginBottom: 4,
  },
  availLabel: { fontSize: 10, letterSpacing: 0.8, color: COLORS.inkSoft, textTransform: 'uppercase' },
  availValue: { fontSize: 20, fontWeight: '700', color: COLORS.gold, marginVertical: 4 },
  catRow: { height: 78, marginBottom: 4 },
  catScrollContent: { alignItems: 'center', paddingVertical: 2, paddingRight: 8 },
  catChip: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginRight: 10,
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: 'transparent',
    width: 72,
    height: 72,
    backgroundColor: '#fff',
  },
  catChipSelected: { borderColor: COLORS.gold, backgroundColor: COLORS.paperDim },
  catChipIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  catChipTxt: { fontSize: 10, color: COLORS.inkSoft, textAlign: 'center', width: '100%' },
  goalList: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  goalChip: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: COLORS.line,
    backgroundColor: '#fff',
    maxWidth: '100%',
  },
  goalChipSelected: { borderColor: COLORS.gold, backgroundColor: COLORS.paperDim },
  goalChipTxt: { fontSize: 13, fontWeight: '600', color: COLORS.ink },
  input: { borderWidth: 1.5, borderColor: COLORS.line, borderRadius: 10, padding: 12, fontSize: 15, backgroundColor: '#fff', color: COLORS.ink },
  saveBtn: { marginTop: 20, backgroundColor: COLORS.navy, borderRadius: 12, padding: 14, alignItems: 'center' },
  saveTxt: { color: COLORS.paper, fontWeight: '700', fontSize: 14.5 },
});
