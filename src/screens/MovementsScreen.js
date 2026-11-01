import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useFinance } from '../context/FinanceContext';
import Header from '../components/Header';
import LedgerRow from '../components/LedgerRow';
import AddMovementModal from '../components/AddMovementModal';
import AddRecurringModal from '../components/AddRecurringModal';
import { COLORS, formatMoney } from '../theme';

export default function MovementsScreen() {
  const {
    movements,
    recurringExpenses,
    pendingRecurring,
    categoryById,
    registerPendingRecurring,
    deleteRecurringExpense,
  } = useFinance();
  const [modalVisible, setModalVisible] = useState(false);
  const [editingMovement, setEditingMovement] = useState(null);
  const [recurringModal, setRecurringModal] = useState(false);
  const [editingRecurring, setEditingRecurring] = useState(null);
  const [recurringOpen, setRecurringOpen] = useState(false);

  const activeRecurring = recurringExpenses.filter((r) => r.active);
  const pendingCount = pendingRecurring.length;

  function openNewMovement() {
    setEditingMovement(null);
    setModalVisible(true);
  }

  function openEditMovement(mov) {
    setEditingMovement(mov);
    setModalVisible(true);
  }

  function closeMovementModal() {
    setModalVisible(false);
    setEditingMovement(null);
  }

  function openNewRecurring() {
    setEditingRecurring(null);
    setRecurringModal(true);
  }

  function openEditRecurring(item) {
    setEditingRecurring(item);
    setRecurringModal(true);
  }

  function confirmDeleteRecurring(item) {
    Alert.alert('Eliminar gasto fijo', `¿Eliminar "${item.name}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => deleteRecurringExpense(item.id) },
    ]);
  }

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.paper }}>
      <Header />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.sectionHeader}>
          <TouchableOpacity
            style={styles.collapseHeader}
            onPress={() => setRecurringOpen((v) => !v)}
            activeOpacity={0.7}
          >
            <Text style={styles.chevron}>{recurringOpen ? '▾' : '▸'}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.sectionTitle}>Gastos fijos</Text>
              {!recurringOpen ? (
                <Text style={styles.collapseSummary}>
                  {activeRecurring.length === 0
                    ? 'Sin gastos fijos'
                    : `${activeRecurring.length} · ${pendingCount > 0 ? `${pendingCount} pendiente${pendingCount === 1 ? '' : 's'}` : 'al día'}`}
                </Text>
              ) : null}
            </View>
          </TouchableOpacity>
          <TouchableOpacity onPress={openNewRecurring}>
            <Text style={styles.linkBtn}>+ Agregar</Text>
          </TouchableOpacity>
        </View>

        {recurringOpen ? (
          <>
            <Text style={styles.hint}>
              El día es solo una guía de cuándo suele cobrarse. Al tocar Registrar, el movimiento queda con la fecha de hoy.
            </Text>

            {activeRecurring.length === 0 ? (
              <Text style={styles.emptyMini}>No tienes gastos fijos todavía.</Text>
            ) : (
              <View style={styles.recurringList}>
                {activeRecurring.map((r) => {
                  const cat = categoryById(r.category_id);
                  const isPending = pendingRecurring.some((p) => p.id === r.id);
                  const done = !isPending;
                  return (
                    <View key={r.id} style={[styles.recurringRow, done && styles.recurringRowDone]}>
                      <View style={[styles.checkCircle, done && styles.checkCircleDone]}>
                        <Text style={styles.checkTxt}>{done ? '✓' : ''}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.recurringName}>{r.name}</Text>
                        <Text style={styles.recurringMeta}>
                          {cat ? `${cat.icon} ${cat.name}` : ''} · suele día {r.day_of_month} · {formatMoney(r.amount)}
                        </Text>
                        <Text style={[styles.statusTxt, done && styles.statusDone]}>
                          {done ? 'Registrado este mes' : 'Pendiente este mes'}
                        </Text>
                      </View>
                      {isPending ? (
                        <TouchableOpacity
                          style={styles.smallBtn}
                          onPress={() => registerPendingRecurring(r)}
                        >
                          <Text style={styles.smallBtnTxt}>Registrar</Text>
                        </TouchableOpacity>
                      ) : null}
                      <TouchableOpacity onPress={() => openEditRecurring(r)} hitSlop={8}>
                        <Text style={styles.editLink}>Editar</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => confirmDeleteRecurring(r)} hitSlop={8}>
                        <Text style={[styles.editLink, { color: COLORS.rust }]}>✕</Text>
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </View>
            )}
          </>
        ) : null}

        <Text style={[styles.sectionTitle, { marginTop: 22 }]}>Movimientos del mes</Text>
        <Text style={styles.hint}>Toca para editar · mantén presionado para eliminar.</Text>
        <View style={styles.ledger}>
          {movements.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>🧾</Text>
              <Text style={styles.emptyTxt}>No hay movimientos este mes todavía.</Text>
            </View>
          ) : (
            movements.map((m, i) => (
              <LedgerRow
                key={m.id}
                movement={m}
                isLast={i === movements.length - 1}
                onEdit={openEditMovement}
              />
            ))
          )}
        </View>
      </ScrollView>

      <TouchableOpacity style={styles.fab} onPress={openNewMovement}>
        <Text style={styles.fabTxt}>+</Text>
      </TouchableOpacity>

      <AddMovementModal
        visible={modalVisible}
        onClose={closeMovementModal}
        editing={editingMovement}
      />
      <AddRecurringModal
        visible={recurringModal}
        onClose={() => setRecurringModal(false)}
        editing={editingRecurring}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 100 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  collapseHeader: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, marginRight: 12 },
  chevron: { fontSize: 16, color: COLORS.inkSoft, width: 14, marginTop: -2 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: COLORS.ink, marginBottom: 0 },
  collapseSummary: { fontSize: 12, color: COLORS.inkSoft, marginTop: 2 },
  linkBtn: { fontSize: 13, fontWeight: '700', color: COLORS.gold },
  hint: { fontSize: 12, color: COLORS.inkSoft, marginTop: 8, marginBottom: 12, lineHeight: 17 },
  emptyMini: { fontSize: 13, color: COLORS.inkSoft, marginBottom: 8 },
  recurringList: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: COLORS.line,
    borderRadius: 14,
    overflow: 'hidden',
  },
  recurringRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.line,
  },
  recurringRowDone: { backgroundColor: '#F7FBF5' },
  checkCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: COLORS.line,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  checkCircleDone: {
    borderColor: COLORS.forest,
    backgroundColor: COLORS.forest,
  },
  checkTxt: { color: '#fff', fontSize: 14, fontWeight: '700', lineHeight: 16 },
  recurringName: { fontSize: 14, fontWeight: '600', color: COLORS.ink },
  recurringMeta: { fontSize: 12, color: COLORS.inkSoft, marginTop: 2 },
  statusTxt: { fontSize: 11, color: COLORS.gold, marginTop: 4, fontWeight: '600' },
  statusDone: { color: COLORS.forest },
  smallBtn: {
    backgroundColor: COLORS.navy,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
  },
  smallBtnTxt: { color: COLORS.paper, fontSize: 11, fontWeight: '700' },
  editLink: { fontSize: 12, fontWeight: '600', color: COLORS.navy, paddingHorizontal: 4 },
  ledger: { backgroundColor: '#fff', borderWidth: 1, borderColor: COLORS.line, borderRadius: 14, overflow: 'hidden' },
  emptyState: { alignItems: 'center', padding: 36 },
  emptyIcon: { fontSize: 30, marginBottom: 8 },
  emptyTxt: { fontSize: 13, color: COLORS.inkSoft },
  fab: {
    position: 'absolute', bottom: 24, right: 24, width: 56, height: 56, borderRadius: 28,
    backgroundColor: COLORS.gold, alignItems: 'center', justifyContent: 'center',
    elevation: 4, shadowColor: '#000', shadowOpacity: 0.3, shadowOffset: { width: 0, height: 3 }, shadowRadius: 6,
  },
  fabTxt: { fontSize: 28, color: COLORS.navy, lineHeight: 30 },
});
