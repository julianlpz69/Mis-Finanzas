import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFinance } from '../context/FinanceContext';
import AddSavingsGoalModal from '../components/AddSavingsGoalModal';
import AddMovementModal from '../components/AddMovementModal';
import ProgressBar from '../components/ProgressBar';
import { COLORS, formatMoney, formatShortDate } from '../theme';

export default function SavingsScreen() {
  const insets = useSafeAreaInsets();
  const {
    savingsGoals,
    savingsTotals,
    activeSavingsTotal,
    setSavingsGoalActive,
    deleteSavingsGoal,
  } = useFinance();
  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState(null);
  const [movModal, setMovModal] = useState(false);

  const active = savingsGoals.filter((g) => g.active);
  const inactive = savingsGoals.filter((g) => !g.active);

  function openCreate() {
    setEditing(null);
    setModalVisible(true);
  }

  function openEdit(goal) {
    setEditing(goal);
    setModalVisible(true);
  }

  function confirmDelete(goal) {
    Alert.alert(
      'Eliminar meta',
      `¿Eliminar "${goal.title}"? Los aportes quedan registrados, solo se desvinculan de la meta.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Eliminar', style: 'destructive', onPress: () => deleteSavingsGoal(goal.id) },
      ]
    );
  }

  function renderGoal(goal) {
    const saved = savingsTotals[goal.id] || 0;
    const target = goal.target_amount || 0;
    const progress = target > 0 ? saved / target : 0;
    const remaining = Math.max(0, target - saved);

    return (
      <View key={goal.id} style={[styles.card, !goal.active && styles.cardInactive]}>
        {goal.image_uri ? (
          <Image source={{ uri: goal.image_uri }} style={styles.cardImage} />
        ) : (
          <View style={[styles.cardImage, styles.cardImageEmpty]}>
            <Text style={styles.cardImageEmptyTxt}>🎯</Text>
          </View>
        )}
        <View style={styles.cardBody}>
          <Text style={styles.cardTitle}>{goal.title}</Text>
          {goal.description ? (
            <Text style={styles.cardDesc} numberOfLines={2}>{goal.description}</Text>
          ) : null}
          {goal.target_date ? (
            <Text style={styles.cardDate}>Fecha objetivo: {formatShortDate(goal.target_date)}</Text>
          ) : null}

          <Text style={styles.cardAmount}>
            {formatMoney(saved)}
            {target > 0 ? <Text style={styles.cardTarget}> / {formatMoney(target)}</Text> : null}
          </Text>

          {target > 0 ? (
            <>
              <ProgressBar progress={progress} />
              <Text style={styles.progressTxt}>
                {Math.round(Math.min(progress, 1) * 100)}%
                {remaining > 0 ? ` · faltan ${formatMoney(remaining)}` : ' · ¡meta alcanzada!'}
              </Text>
            </>
          ) : null}

          <View style={styles.cardActions}>
            <TouchableOpacity onPress={() => openEdit(goal)}>
              <Text style={styles.actionTxt}>Editar</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setSavingsGoalActive(goal.id, !goal.active)}>
              <Text style={styles.actionTxt}>{goal.active ? 'Archivar' : 'Reactivar'}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => confirmDelete(goal)}>
              <Text style={[styles.actionTxt, { color: COLORS.rust }]}>Eliminar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.paper }}>
      <View style={[styles.topHeader, { paddingTop: insets.top + 16 }]}>
        <Text style={styles.title}>Ahorros</Text>
        <Text style={styles.subtitle}>
          {active.length > 0
            ? `${formatMoney(activeSavingsTotal)} ahorrados en ${active.length} meta${active.length === 1 ? '' : 's'}`
            : 'Define una meta (ej: moto) y ve aportando. El ahorro no se mezcla con el saldo disponible.'}
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {active.length === 0 && inactive.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🎯</Text>
            <Text style={styles.emptyTxt}>Aún no tienes metas de ahorro.</Text>
          </View>
        ) : null}

        {active.map(renderGoal)}

        {inactive.length > 0 ? (
          <>
            <Text style={styles.sectionTitle}>Archivadas</Text>
            {inactive.map(renderGoal)}
          </>
        ) : null}
      </ScrollView>

      <TouchableOpacity style={styles.fabSecondary} onPress={() => setMovModal(true)}>
        <Text style={styles.fabSecondaryTxt}>+ Aporte</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.fab} onPress={openCreate}>
        <Text style={styles.fabTxt}>+</Text>
      </TouchableOpacity>

      <AddSavingsGoalModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        editing={editing}
      />
      <AddMovementModal visible={movModal} onClose={() => setMovModal(false)} initialType="ahorro" />
    </View>
  );
}

const styles = StyleSheet.create({
  topHeader: {
    backgroundColor: COLORS.navy,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  title: { color: COLORS.paper, fontSize: 20, fontWeight: '700', marginBottom: 8 },
  subtitle: { color: '#8B96AC', fontSize: 13, lineHeight: 18 },
  content: { padding: 20, paddingBottom: 120, gap: 14 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: COLORS.ink, marginTop: 8 },
  card: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: COLORS.line,
    borderRadius: 14,
    overflow: 'hidden',
  },
  cardInactive: { opacity: 0.7 },
  cardImage: { width: '100%', height: 160, backgroundColor: COLORS.paperDim },
  cardImageEmpty: { alignItems: 'center', justifyContent: 'center', height: 100 },
  cardImageEmptyTxt: { fontSize: 36 },
  cardBody: { padding: 14 },
  cardTitle: { fontSize: 17, fontWeight: '700', color: COLORS.ink },
  cardDesc: { fontSize: 13, color: COLORS.inkSoft, marginTop: 4, lineHeight: 18 },
  cardDate: { fontSize: 12, color: COLORS.inkSoft, marginTop: 4 },
  cardAmount: { fontSize: 22, fontWeight: '700', color: COLORS.gold, marginTop: 10, marginBottom: 10 },
  cardTarget: { fontSize: 14, fontWeight: '500', color: COLORS.inkSoft },
  progressTxt: { fontSize: 12, color: COLORS.inkSoft, marginTop: 8 },
  cardActions: { flexDirection: 'row', gap: 16, marginTop: 14 },
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
  fabSecondary: {
    position: 'absolute', bottom: 32, right: 92, paddingHorizontal: 14, paddingVertical: 12,
    borderRadius: 22, backgroundColor: COLORS.navy,
  },
  fabSecondaryTxt: { color: COLORS.paper, fontWeight: '700', fontSize: 13 },
});
