import React, { useEffect, useState } from 'react';
import {
  Modal, View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFinance } from '../context/FinanceContext';
import DateField from './DateField';
import { COLORS, formatMoney, formatAmountInput, parseAmountInput } from '../theme';

export default function PayDebtModal({ visible, onClose, debt }) {
  const insets = useSafeAreaInsets();
  const { payDebt } = useFinance();
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));

  const isLend = debt?.kind === 'lend';

  useEffect(() => {
    if (visible && debt) {
      setAmount('');
      setDate(new Date().toISOString().slice(0, 10));
    }
  }, [visible, debt]);

  async function handleSave() {
    if (!debt) return;
    const num = parseAmountInput(amount);
    if (!num || num <= 0) {
      Alert.alert('Monto inválido', 'Ingresa un monto mayor a 0.');
      return;
    }
    if (num > debt.pending_amount + 0.001) {
      Alert.alert(
        'Monto muy alto',
        `Solo queda pendiente ${formatMoney(debt.pending_amount)}.`
      );
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      Alert.alert('Fecha inválida', 'Usa AAAA-MM-DD.');
      return;
    }

    try {
      await payDebt({ debtId: debt.id, amount: num, date });
      onClose();
    } catch (e) {
      Alert.alert('Error', e.message || 'No se pudo registrar.');
    }
  }

  if (!debt) return null;

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
            <Text style={styles.title}>{isLend ? 'Registrar cobro' : 'Pagar deuda'}</Text>
            <Text style={styles.sub}>{debt.name}</Text>
            <Text style={styles.hint}>
              Pendiente: {formatMoney(debt.pending_amount)}.
              {isLend
                ? ' Se creará un ingreso (te entra plata).'
                : ' Se creará un gasto (te sale plata).'}
            </Text>

            <Text style={styles.label}>Monto</Text>
            <TextInput
              style={styles.input}
              placeholder="300.000"
              keyboardType="number-pad"
              value={amount}
              onChangeText={(t) => setAmount(formatAmountInput(t))}
            />

            <Text style={styles.label}>Fecha</Text>
            <DateField value={date} onChange={setDate} />

            <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
              <Text style={styles.saveTxt}>{isLend ? 'Registrar cobro' : 'Registrar pago'}</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(22,34,59,0.6)', justifyContent: 'flex-end' },
  keyboard: { width: '100%' },
  sheet: {
    backgroundColor: COLORS.paper,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  handle: { width: 36, height: 4, backgroundColor: COLORS.line, borderRadius: 2, alignSelf: 'center', marginBottom: 14 },
  closeBtn: { position: 'absolute', top: 16, right: 16, padding: 4, zIndex: 2 },
  closeTxt: { fontSize: 18, color: COLORS.inkSoft },
  title: { fontSize: 19, fontWeight: '700', color: COLORS.ink },
  sub: { fontSize: 15, color: COLORS.inkSoft, marginTop: 4, marginBottom: 8 },
  hint: { fontSize: 12.5, color: COLORS.inkSoft, marginBottom: 8, lineHeight: 18 },
  label: { fontSize: 11.5, textTransform: 'uppercase', letterSpacing: 0.6, color: COLORS.inkSoft, marginTop: 12, marginBottom: 6 },
  input: { borderWidth: 1.5, borderColor: COLORS.line, borderRadius: 10, padding: 12, fontSize: 15, backgroundColor: '#fff', color: COLORS.ink },
  saveBtn: { marginTop: 20, marginBottom: 8, backgroundColor: COLORS.navy, borderRadius: 12, padding: 14, alignItems: 'center' },
  saveTxt: { color: COLORS.paper, fontWeight: '700', fontSize: 14.5 },
});
