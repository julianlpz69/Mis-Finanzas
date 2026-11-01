import React, { useEffect, useState } from 'react';
import {
  Modal, View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFinance } from '../context/FinanceContext';
import DateField from './DateField';
import { COLORS, uid, formatAmountInput, parseAmountInput, formatMoney } from '../theme';

export default function AddDebtModal({ visible, onClose, editing = null }) {
  const insets = useSafeAreaInsets();
  const { addDebt, updateDebt, availableForSavings } = useFinance();
  const [kind, setKind] = useState('owe');
  const [name, setName] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [pendingAmount, setPendingAmount] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState('');
  const [receivedCash, setReceivedCash] = useState(false);

  const isLend = kind === 'lend';

  useEffect(() => {
    if (visible) {
      setKind(editing?.kind === 'lend' ? 'lend' : 'owe');
      setName(editing?.name || '');
      setTotalAmount(
        editing?.total_amount ? formatAmountInput(String(Math.round(editing.total_amount))) : ''
      );
      setPendingAmount(
        editing?.pending_amount != null
          ? formatAmountInput(String(Math.round(editing.pending_amount)))
          : ''
      );
      setDueDate(editing?.due_date || '');
      setDate(new Date().toISOString().slice(0, 10));
      setDescription(editing?.description || '');
      setReceivedCash(false);
    }
  }, [visible, editing]);

  async function handleSave() {
    if (!name.trim()) {
      Alert.alert('Falta el nombre', isLend ? 'Ej: María (a quien le prestaste).' : 'Ej: Juan, Banco.');
      return;
    }
    const total = parseAmountInput(totalAmount);
    if (!total || total <= 0) {
      Alert.alert('Valor total', 'Indica el valor.');
      return;
    }
    let pending = pendingAmount ? parseAmountInput(pendingAmount) : total;
    if (Number.isNaN(pending) || pending < 0) {
      Alert.alert('Pendiente inválido', 'El valor pendiente no es válido.');
      return;
    }
    if (pending > total + 0.001) {
      Alert.alert('Pendiente', 'El pendiente no puede ser mayor al total.');
      return;
    }
    if (dueDate && !/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) {
      Alert.alert('Fecha inválida', 'Usa AAAA-MM-DD o déjala vacía.');
      return;
    }
    if (!editing && isLend) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        Alert.alert('Fecha inválida', 'Usa AAAA-MM-DD para la fecha del préstamo.');
        return;
      }
      const avail = await availableForSavings(date);
      if (pending > avail + 0.001) {
        Alert.alert(
          'Sin saldo suficiente',
          `Solo tienes ${formatMoney(avail)} disponibles. El préstamo se descuenta de tu plata.`
        );
        return;
      }
    }
    if (!editing && !isLend && receivedCash && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      Alert.alert('Fecha inválida', 'Usa AAAA-MM-DD para la fecha en que recibiste la plata.');
      return;
    }

    const payload = {
      name: name.trim(),
      totalAmount: total,
      pendingAmount: pending,
      dueDate: dueDate || null,
      description: description.trim(),
      kind,
      date,
      receivedCash: !isLend && receivedCash,
    };

    if (editing) {
      await updateDebt({
        ...payload,
        id: editing.id,
        active: !!editing.active,
        kind: editing.kind === 'lend' ? 'lend' : 'owe',
      });
    } else {
      await addDebt({
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
            <Text style={styles.title}>{editing ? 'Editar' : 'Nueva'} {isLend ? 'préstamo' : 'deuda'}</Text>

            {!editing ? (
              <View style={styles.typeToggle}>
                <TouchableOpacity
                  style={[styles.typeBtn, kind === 'owe' && styles.typeBtnOwe]}
                  onPress={() => { setKind('owe'); }}
                >
                  <Text style={[styles.typeTxt, kind === 'owe' && { color: COLORS.rust }]}>Yo debo</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.typeBtn, kind === 'lend' && styles.typeBtnLend]}
                  onPress={() => { setKind('lend'); setReceivedCash(false); }}
                >
                  <Text style={[styles.typeTxt, kind === 'lend' && { color: COLORS.forest }]}>Yo presté</Text>
                </TouchableOpacity>
              </View>
            ) : null}

            <Text style={styles.hint}>
              {isLend
                ? 'Al guardar se descuenta de tu saldo (gasto). Cuando te paguen, registras el cobro.'
                : 'Anota lo que debes. Si te dieron la plata en efectivo, actívalo abajo para sumarla a tu saldo.'}
            </Text>

            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <Text style={styles.label}>{isLend ? 'A quién le prestaste' : 'Nombre / persona'}</Text>
              <TextInput
                style={styles.input}
                placeholder={isLend ? 'Ej: María' : 'Ej: Juan'}
                value={name}
                onChangeText={setName}
              />

              <Text style={styles.label}>Valor total</Text>
              <TextInput
                style={styles.input}
                placeholder="1.000.000"
                keyboardType="number-pad"
                value={totalAmount}
                onChangeText={(t) => {
                  setTotalAmount(formatAmountInput(t));
                  if (!editing) setPendingAmount(formatAmountInput(t));
                }}
              />

              {editing ? (
                <>
                  <Text style={styles.label}>Valor pendiente</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="700.000"
                    keyboardType="number-pad"
                    value={pendingAmount}
                    onChangeText={(t) => setPendingAmount(formatAmountInput(t))}
                  />
                </>
              ) : null}

              {!editing && isLend ? (
                <>
                  <Text style={styles.label}>Fecha del préstamo</Text>
                  <DateField value={date} onChange={setDate} />
                </>
              ) : null}

              {!editing && !isLend ? (
                <>
                  <TouchableOpacity
                    style={[styles.cashToggle, receivedCash && styles.cashToggleOn]}
                    onPress={() => setReceivedCash((v) => !v)}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.cashCheck, receivedCash && styles.cashCheckOn]}>
                      <Text style={styles.cashCheckTxt}>{receivedCash ? '✓' : ''}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.cashTitle}>Recibí esta plata</Text>
                      <Text style={styles.cashHint}>
                        Opcional. Si te prestaron en efectivo, se registra un ingreso y queda disponible.
                      </Text>
                    </View>
                  </TouchableOpacity>
                  {receivedCash ? (
                    <>
                      <Text style={styles.label}>Fecha en que recibiste</Text>
                      <DateField value={date} onChange={setDate} />
                    </>
                  ) : null}
                </>
              ) : null}

              <Text style={styles.label}>Fecha límite (opcional)</Text>
              <DateField
                value={dueDate}
                onChange={setDueDate}
                placeholder="Sin fecha límite"
                optional
              />

              <Text style={styles.label}>Descripción (opcional)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder={isLend ? '¿Para qué le prestaste?' : '¿Por qué es esta deuda?'}
                value={description}
                onChangeText={setDescription}
                multiline
              />

              <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
                <Text style={styles.saveTxt}>
                  {editing ? 'Guardar' : isLend ? 'Registrar préstamo' : 'Crear deuda'}
                </Text>
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
  title: { fontSize: 19, fontWeight: '700', color: COLORS.ink, marginBottom: 10 },
  typeToggle: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  typeBtn: {
    flex: 1, padding: 11, borderRadius: 10, borderWidth: 1.5, borderColor: COLORS.line,
    alignItems: 'center', backgroundColor: '#fff',
  },
  typeBtnOwe: { borderColor: COLORS.rust, backgroundColor: '#FBEEE9' },
  typeBtnLend: { borderColor: COLORS.forest, backgroundColor: '#EAF3EE' },
  typeTxt: { fontSize: 13.5, fontWeight: '600', color: COLORS.inkSoft },
  hint: { fontSize: 12.5, color: COLORS.inkSoft, marginBottom: 8, lineHeight: 18 },
  cashToggle: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: COLORS.line,
    backgroundColor: '#fff',
    marginTop: 14,
  },
  cashToggleOn: { borderColor: COLORS.forest, backgroundColor: '#EAF3EE' },
  cashCheck: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: COLORS.line,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  cashCheckOn: { borderColor: COLORS.forest, backgroundColor: COLORS.forest },
  cashCheckTxt: { color: '#fff', fontWeight: '700', fontSize: 13, lineHeight: 15 },
  cashTitle: { fontSize: 14, fontWeight: '700', color: COLORS.ink },
  cashHint: { fontSize: 12, color: COLORS.inkSoft, marginTop: 3, lineHeight: 17 },
  label: { fontSize: 11.5, textTransform: 'uppercase', letterSpacing: 0.6, color: COLORS.inkSoft, marginTop: 12, marginBottom: 6 },
  input: { borderWidth: 1.5, borderColor: COLORS.line, borderRadius: 10, padding: 12, fontSize: 15, backgroundColor: '#fff', color: COLORS.ink },
  textArea: { minHeight: 70, textAlignVertical: 'top' },
  saveBtn: { marginTop: 20, marginBottom: 8, backgroundColor: COLORS.navy, borderRadius: 12, padding: 14, alignItems: 'center' },
  saveTxt: { color: COLORS.paper, fontWeight: '700', fontSize: 14.5 },
});
