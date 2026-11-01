import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFinance } from '../context/FinanceContext';
import { COLORS, MONTH_NAMES, formatMoney } from '../theme';

export default function Header() {
  const insets = useSafeAreaInsets();
  const { currentDate, goToPrevMonth, goToNextMonth, monthTotals } = useFinance();
  const { saldoAnterior, ingresos, gastos, ahorros, balance } = monthTotals;

  return (
    <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
      <View style={styles.monthNav}>
        <TouchableOpacity onPress={goToPrevMonth} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Text style={styles.navArrow}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.monthLabel}>
          {MONTH_NAMES[currentDate.getMonth()]} {currentDate.getFullYear()}
        </Text>
        <TouchableOpacity onPress={goToNextMonth} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Text style={styles.navArrow}>›</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>SALDO DISPONIBLE</Text>
        <Text style={[styles.balanceAmount, balance < 0 && { color: COLORS.rust }]}>
          {formatMoney(balance)}
        </Text>

        <View style={styles.grid}>
          <View style={styles.cell}>
            <Text style={styles.miniLabel}>INGRESOS</Text>
            <Text style={[styles.miniValue, { color: COLORS.forest }]}>{formatMoney(ingresos)}</Text>
          </View>
          <View style={styles.cell}>
            <Text style={styles.miniLabel}>GASTOS</Text>
            <Text style={[styles.miniValue, { color: COLORS.rust }]}>{formatMoney(gastos)}</Text>
          </View>
          <View style={styles.cell}>
            <Text style={styles.miniLabel}>SALDO ANTERIOR</Text>
            <Text style={[styles.miniValue, saldoAnterior < 0 && { color: COLORS.rust }]}>
              {formatMoney(saldoAnterior)}
            </Text>
          </View>
          <View style={styles.cell}>
            <Text style={styles.miniLabel}>AHORRO MES</Text>
            <Text style={[styles.miniValue, { color: COLORS.gold }]}>{formatMoney(ahorros)}</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: COLORS.navy,
    paddingHorizontal: 20,
    paddingBottom: 26,
  },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 18,
    marginBottom: 16,
  },
  navArrow: { color: COLORS.gold, fontSize: 22, paddingHorizontal: 10 },
  monthLabel: {
    color: COLORS.paper,
    fontSize: 16,
    fontWeight: '600',
    textTransform: 'capitalize',
    minWidth: 150,
    textAlign: 'center',
  },
  balanceCard: {
    backgroundColor: COLORS.paper,
    borderRadius: 14,
    padding: 18,
  },
  balanceLabel: {
    fontSize: 11,
    letterSpacing: 1.2,
    color: COLORS.inkSoft,
    marginBottom: 4,
  },
  balanceAmount: {
    fontSize: 32,
    fontWeight: '700',
    color: COLORS.ink,
    marginBottom: 14,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderTopWidth: 1,
    borderTopColor: COLORS.line,
    borderStyle: 'dashed',
    paddingTop: 12,
    gap: 10,
  },
  cell: { width: '47%' },
  miniLabel: { fontSize: 10, letterSpacing: 0.8, color: COLORS.inkSoft, marginBottom: 2 },
  miniValue: { fontSize: 15, fontWeight: '600', color: COLORS.ink },
  miniHint: { fontSize: 10, color: COLORS.inkSoft, marginTop: 2 },
});
