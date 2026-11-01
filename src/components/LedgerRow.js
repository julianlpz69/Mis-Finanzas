import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useFinance } from '../context/FinanceContext';
import { COLORS, formatMoney, formatShortDate, isAhorroMovement, isCarryMovement } from '../theme';

export default function LedgerRow({ movement, isLast, onEdit }) {
  const { categoryById, deleteMovement, savingsGoals } = useFinance();
  const cat = categoryById(movement.category_id);
  const color = cat ? cat.color : '#999999';
  const icon = cat ? cat.icon : '❓';
  const name = cat ? cat.name : 'Sin categoría';
  const isCarry = isCarryMovement(movement);
  const isAhorro = isAhorroMovement(movement);
  const goal = savingsGoals.find((g) => g.id === movement.savings_goal_id);
  const isIngreso = movement.type === 'ingreso';

  let amountColor = isIngreso ? COLORS.forest : COLORS.rust;
  if (isAhorro) amountColor = COLORS.gold;
  if (isCarry) amountColor = COLORS.gold;

  function handlePress() {
    if (isCarry) {
      Alert.alert(
        'Saldo anterior',
        'Este movimiento se calcula solo a partir del mes anterior y no se puede editar.'
      );
      return;
    }
    if (onEdit) onEdit(movement);
  }

  function handleDelete() {
    if (isCarry) {
      Alert.alert(
        'Saldo anterior',
        'Este movimiento se calcula solo a partir del mes anterior y no se puede eliminar.'
      );
      return;
    }
    Alert.alert('Eliminar movimiento', '¿Seguro que quieres eliminarlo?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => deleteMovement(movement.id) },
    ]);
  }

  const subtitle = [
    formatShortDate(movement.date),
    goal ? goal.title : null,
    movement.note || null,
  ].filter(Boolean).join(' · ');

  return (
    <TouchableOpacity
      style={[styles.row, !isLast && styles.rowBorder]}
      onPress={handlePress}
      onLongPress={handleDelete}
      activeOpacity={0.7}
    >
      <View style={[styles.icon, { backgroundColor: `${color}22` }]}>
        <Text style={{ fontSize: 18 }}>{icon}</Text>
      </View>
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {isCarry ? 'Saldo anterior' : name}
        </Text>
        <Text style={styles.date} numberOfLines={1}>{subtitle}</Text>
      </View>
      <Text style={[styles.amount, { color: amountColor }]}>
        {isCarry || isAhorro ? '' : isIngreso ? '+' : '-'}
        {isAhorro ? '↗ ' : ''}
        {isCarry && movement.type === 'gasto' ? '-' : ''}
        {isCarry && movement.type === 'ingreso' ? '+' : ''}
        {formatMoney(movement.amount).replace('-', '')}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: COLORS.line },
  icon: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  info: { flex: 1 },
  name: { fontSize: 14, fontWeight: '500', color: COLORS.ink },
  date: { fontSize: 11, color: COLORS.inkSoft, marginTop: 2 },
  amount: { fontSize: 14, fontWeight: '600' },
});
