import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFinance } from '../context/FinanceContext';
import AddDebtModal from '../components/AddDebtModal';
import PayDebtModal from '../components/PayDebtModal';
import ProgressBar from '../components/ProgressBar';
import { COLORS, formatMoney, formatShortDate } from '../theme';

export default function DebtsScreen() {
  const insets = useSafeAreaInsets();
  const { debts, deleteDebt, updateDebt } = useFinance();
  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState(null);
  const [payDebt, setPayDebt] = useState(null);
  const [filter, setFilter] = useState('all'); // all | owe | lend

  const visible = debts.filter((d) => {
    if (filter === 'owe') return (d.kind || 'owe') === 'owe';
    if (filter === 'lend') return d.kind === 'lend';
    return true;
  });

  const open = visible.filter((d) => d.active && d.pending_amount > 0.005);
  const paid = visible.filter((d) => d.active && d.pending_amount <= 0.005);
  const archived = visible.filter((d) => !d.active);

  const openOwe = debts.filter((d) => d.active && d.pending_amount > 0.005 && (d.kind || 'owe') === 'owe');
  const openLend = debts.filter((d) => d.active && d.pending_amount > 0.005 && d.kind === 'lend');
  const totalOwe = openOwe.reduce((s, d) => s + d.pending_amount, 0);
  const totalLend = openLend.reduce((s, d) => s + d.pending_amount, 0);

  function openCreate() {
    setEditing(null);
    setModalVisible(true);
  }

  function openEdit(debt) {
    setEditing(debt);
    setModalVisible(true);
  }

  function confirmDelete(debt) {
    Alert.alert(
      'Eliminar',
      `¿Eliminar "${debt.name}"? Los movimientos asociados quedan, pero se desvinculan.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Eliminar', style: 'destructive', onPress: () => deleteDebt(debt.id) },
      ]
    );
  }

  function renderDebt(debt) {
    const isLend = debt.kind === 'lend';
    const paidAmt = Math.max(0, debt.total_amount - debt.pending_amount);
    const progress = debt.total_amount > 0 ? paidAmt / debt.total_amount : 0;
    const done = debt.pending_amount <= 0.005;

    return (
      <View key={debt.id} style={[styles.card, done && styles.cardDone]}>
        <View style={styles.cardTop}>
          <View style={{ flex: 1 }}>
            <Text style={styles.kindTag}>{isLend ? 'Yo presté' : 'Yo debo'}</Text>
            <Text style={styles.cardTitle}>{debt.name}</Text>
          </View>
          {done ? (
            <Text style={styles.badgeDone}>{isLend ? '✓ Cobrado' : '✓ Pagada'}</Text>
          ) : null}
        </View>
        {debt.description ? (
          <Text style={styles.cardDesc} numberOfLines={2}>{debt.description}</Text>
        ) : null}
        {debt.due_date ? (
          <Text style={styles.cardDate}>Límite: {formatShortDate(debt.due_date)}</Text>
        ) : null}

        <Text style={styles.pendingLabel}>
          {isLend ? 'Me deben' : 'Debo'}
        </Text>
        <Text style={[styles.pendingAmt, done && { color: COLORS.forest }, isLend && !done && { color: COLORS.forest }]}>
          {formatMoney(debt.pending_amount)}
        </Text>
        <Text style={styles.totalTxt}>Total: {formatMoney(debt.total_amount)}</Text>

        <ProgressBar progress={progress} color={done || isLend ? COLORS.forest : COLORS.rust} />
        <Text style={styles.progressTxt}>
          {Math.round(Math.min(progress, 1) * 100)}% {isLend ? 'cobrado' : 'pagado'}
          {!done ? ` · faltan ${formatMoney(debt.pending_amount)}` : ''}
        </Text>

        <View style={styles.actions}>
          {!done && debt.active ? (
            <TouchableOpacity style={styles.payBtn} onPress={() => setPayDebt(debt)}>
              <Text style={styles.payBtnTxt}>{isLend ? 'Registrar cobro' : 'Registrar pago'}</Text>
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity onPress={() => openEdit(debt)}>
            <Text style={styles.actionTxt}>Editar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => updateDebt({
              id: debt.id,
              name: debt.name,
              totalAmount: debt.total_amount,
              pendingAmount: debt.pending_amount,
              dueDate: debt.due_date,
              description: debt.description || '',
              kind: debt.kind === 'lend' ? 'lend' : 'owe',
              active: !debt.active,
            })}
          >
            <Text style={styles.actionTxt}>{debt.active ? 'Archivar' : 'Reactivar'}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => confirmDelete(debt)}>
            <Text style={[styles.actionTxt, { color: COLORS.rust }]}>Eliminar</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.paper }}>
      <View style={[styles.topHeader, { paddingTop: insets.top + 16 }]}>
        <Text style={styles.title}>Deudas</Text>
        <Text style={styles.subtitle}>
          {openOwe.length || openLend.length
            ? [
                openOwe.length ? `Debo ${formatMoney(totalOwe)}` : null,
                openLend.length ? `Me deben ${formatMoney(totalLend)}` : null,
              ].filter(Boolean).join(' · ')
            : 'Registra lo que debes o lo que prestaste.'}
        </Text>

        <View style={styles.filterRow}>
          {[
            { id: 'all', label: 'Todas' },
            { id: 'owe', label: 'Yo debo' },
            { id: 'lend', label: 'Yo presté' },
          ].map((f) => (
            <TouchableOpacity
              key={f.id}
              style={[styles.filterBtn, filter === f.id && styles.filterBtnActive]}
              onPress={() => setFilter(f.id)}
            >
              <Text style={[styles.filterTxt, filter === f.id && styles.filterTxtActive]}>{f.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {visible.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>💳</Text>
            <Text style={styles.emptyTxt}>Nada por aquí todavía.</Text>
          </View>
        ) : null}

        {open.map(renderDebt)}

        {paid.length > 0 ? (
          <>
            <Text style={styles.sectionTitle}>Cerradas</Text>
            {paid.map(renderDebt)}
          </>
        ) : null}

        {archived.length > 0 ? (
          <>
            <Text style={styles.sectionTitle}>Archivadas</Text>
            {archived.map(renderDebt)}
          </>
        ) : null}
      </ScrollView>

      <TouchableOpacity style={styles.fab} onPress={openCreate}>
        <Text style={styles.fabTxt}>+</Text>
      </TouchableOpacity>

      <AddDebtModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        editing={editing}
      />
      <PayDebtModal
        visible={!!payDebt}
        onClose={() => setPayDebt(null)}
        debt={payDebt}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  topHeader: {
    backgroundColor: COLORS.navy,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  title: { color: COLORS.paper, fontSize: 20, fontWeight: '700', marginBottom: 8 },
  subtitle: { color: '#8B96AC', fontSize: 13, lineHeight: 18, marginBottom: 12 },
  filterRow: { flexDirection: 'row', gap: 8 },
  filterBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: COLORS.navySoft,
  },
  filterBtnActive: { backgroundColor: COLORS.gold },
  filterTxt: { fontSize: 12, fontWeight: '600', color: '#8B96AC' },
  filterTxtActive: { color: COLORS.navy },
  content: { padding: 20, paddingBottom: 100, gap: 14 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: COLORS.ink, marginTop: 8 },
  card: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: COLORS.line,
    borderRadius: 14,
    padding: 14,
  },
  cardDone: { borderColor: '#C5D9C8' },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  kindTag: {
    fontSize: 10,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: COLORS.inkSoft,
    marginBottom: 2,
  },
  cardTitle: { fontSize: 17, fontWeight: '700', color: COLORS.ink },
  badgeDone: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.forest,
    backgroundColor: '#EAF3EE',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    overflow: 'hidden',
  },
  cardDesc: { fontSize: 13, color: COLORS.inkSoft, marginTop: 6, lineHeight: 18 },
  cardDate: { fontSize: 12, color: COLORS.inkSoft, marginTop: 4 },
  pendingLabel: {
    fontSize: 10,
    letterSpacing: 0.8,
    color: COLORS.inkSoft,
    marginTop: 12,
    textTransform: 'uppercase',
  },
  pendingAmt: { fontSize: 24, fontWeight: '700', color: COLORS.rust, marginTop: 2 },
  totalTxt: { fontSize: 12, color: COLORS.inkSoft, marginBottom: 10 },
  progressTxt: { fontSize: 12, color: COLORS.inkSoft, marginTop: 8 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, alignItems: 'center', marginTop: 14 },
  payBtn: {
    backgroundColor: COLORS.navy,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
  },
  payBtnTxt: { color: COLORS.paper, fontWeight: '700', fontSize: 12 },
  actionTxt: { fontSize: 13, fontWeight: '600', color: COLORS.navy },
  empty: { alignItems: 'center', paddingVertical: 48 },
  emptyIcon: { fontSize: 36, marginBottom: 8 },
  emptyTxt: { color: COLORS.inkSoft, fontSize: 13 },
  fab: {
    position: 'absolute', bottom: 24, right: 24, width: 56, height: 56, borderRadius: 28,
    backgroundColor: COLORS.gold, alignItems: 'center', justifyContent: 'center',
    elevation: 4, shadowColor: '#000', shadowOpacity: 0.3, shadowOffset: { width: 0, height: 3 }, shadowRadius: 6,
  },
  fabTxt: { fontSize: 28, color: COLORS.navy, lineHeight: 30 },
});
