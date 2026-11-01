import React, { useEffect, useState } from 'react';
import {
  Modal, View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFinance } from '../context/FinanceContext';
import { COLORS, uid, formatAmountInput, parseAmountInput, CAT_SALDO_ANTERIOR, CAT_AHORRO } from '../theme';

export default function AddRecurringModal({ visible, onClose, editing = null }) {
  const insets = useSafeAreaInsets();
  const { categories, addRecurringExpense, updateRecurringExpense } = useFinance();
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState(null);
  const [dayOfMonth, setDayOfMonth] = useState('1');

  const gastoCats = categories.filter(
    (c) => c.type === 'gasto' && c.id !== CAT_SALDO_ANTERIOR && c.id !== CAT_AHORRO && !c.locked
  );

  useEffect(() => {
    if (visible) {
      setName(editing?.name || '');
      setAmount(editing?.amount ? formatAmountInput(String(Math.round(editing.amount))) : '');
      setCategoryId(editing?.category_id || gastoCats[0]?.id || null);
      setDayOfMonth(String(editing?.day_of_month || 1));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, editing]);

  async function handleSave() {
    if (!name.trim()) {
      Alert.alert('Falta el nombre', 'Ej: Arriendo, Internet, Netflix.');
      return;
    }
    const num = parseAmountInput(amount);
    if (!num || num <= 0) {
      Alert.alert('Monto inválido', 'Ingresa un valor mayor a 0.');
      return;
    }
    if (!categoryId) {
      Alert.alert('Categoría', 'Elige una categoría de gasto.');
      return;
    }
    const day = parseInt(dayOfMonth, 10);
    if (!day || day < 1 || day > 31) {
      Alert.alert('Día inválido', 'Usa un día del 1 al 31.');
      return;
    }

    const payload = {
      name: name.trim(),
      amount: num,
      categoryId,
      dayOfMonth: day,
      frequency: 'monthly',
    };

    if (editing) {
      await updateRecurringExpense({
        ...payload,
        id: editing.id,
        active: !!editing.active,
      });
    } else {
      await addRecurringExpense({
        ...payload,
        id: uid(),
        createdAt: new Date().toISOString(),
      });
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
            <Text style={styles.title}>{editing ? 'Editar gasto fijo' : 'Nuevo gasto fijo'}</Text>

            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <Text style={styles.hint}>Se recordará cada mes para que lo registres cuando lo pagues.</Text>

              <Text style={styles.label}>Nombre</Text>
              <TextInput
                style={styles.input}
                placeholder="Ej: Arriendo"
                value={name}
                onChangeText={setName}
              />

              <Text style={styles.label}>Valor</Text>
              <TextInput
                style={styles.input}
                placeholder="1.000.000"
                keyboardType="number-pad"
                value={amount}
                onChangeText={(t) => setAmount(formatAmountInput(t))}
              />

              <Text style={styles.label}>Día habitual del mes</Text>
              <TextInput
                style={styles.input}
                placeholder="1"
                keyboardType="number-pad"
                value={dayOfMonth}
                onChangeText={setDayOfMonth}
              />
              <Text style={styles.dayHint}>
                Solo como recordatorio. Al registrar el pago, la fecha del movimiento será el día en que lo registres.
              </Text>

              <Text style={styles.label}>Categoría</Text>
              <View style={styles.catList}>
                {gastoCats.map((c) => (
                  <TouchableOpacity
                    key={c.id}
                    style={[styles.catChip, categoryId === c.id && styles.catChipSelected]}
                    onPress={() => setCategoryId(c.id)}
                  >
                    <Text style={styles.catChipTxt}>{c.icon} {c.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.freq}>Frecuencia: mensual</Text>

              <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
                <Text style={styles.saveTxt}>{editing ? 'Guardar' : 'Crear gasto fijo'}</Text>
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
  title: { fontSize: 19, fontWeight: '700', color: COLORS.ink, marginBottom: 8 },
  hint: { fontSize: 13, color: COLORS.inkSoft, marginBottom: 8, lineHeight: 18 },
  label: { fontSize: 11.5, textTransform: 'uppercase', letterSpacing: 0.6, color: COLORS.inkSoft, marginTop: 12, marginBottom: 6 },
  dayHint: { fontSize: 12, color: COLORS.inkSoft, marginBottom: 4, lineHeight: 17 },
  input: { borderWidth: 1.5, borderColor: COLORS.line, borderRadius: 10, padding: 12, fontSize: 15, backgroundColor: '#fff', color: COLORS.ink },
  catList: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  catChip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: COLORS.line,
    backgroundColor: '#fff',
  },
  catChipSelected: { borderColor: COLORS.gold, backgroundColor: COLORS.paperDim },
  catChipTxt: { fontSize: 13, color: COLORS.ink, fontWeight: '500' },
  freq: { marginTop: 14, fontSize: 12, color: COLORS.inkSoft },
  saveBtn: { marginTop: 20, marginBottom: 8, backgroundColor: COLORS.navy, borderRadius: 12, padding: 14, alignItems: 'center' },
  saveTxt: { color: COLORS.paper, fontWeight: '700', fontSize: 14.5 },
});
