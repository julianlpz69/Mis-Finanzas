import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Dimensions, Image,
} from 'react-native';
import { PieChart } from 'react-native-chart-kit';
import { useFinance } from '../context/FinanceContext';
import Header from '../components/Header';
import ProgressBar from '../components/ProgressBar';
import AddMovementModal from '../components/AddMovementModal';
import {
  COLORS, CAT_AHORRO, formatMoney, formatShortDate, isAhorroMovement, isCarryMovement,
} from '../theme';

const screenWidth = Dimensions.get('window').width;

export default function SummaryScreen() {
  const {
    movements,
    categoryById,
    activeGoals,
    savingsTotals,
    monthTotals,
  } = useFinance();
  const [chartType, setChartType] = useState('gasto');
  const [modalVisible, setModalVisible] = useState(false);

  const filtered = movements.filter(
    (m) =>
      m.type === chartType &&
      !isCarryMovement(m) &&
      m.category_id !== CAT_AHORRO &&
      !isAhorroMovement(m)
  );
  const byCat = {};
  filtered.forEach((m) => {
    byCat[m.category_id] = (byCat[m.category_id] || 0) + m.amount;
  });
  const chartData = Object.keys(byCat)
    .sort((a, b) => byCat[b] - byCat[a])
    .map((catId) => {
      const cat = categoryById(catId);
      return {
        name: cat ? cat.name : 'Otro',
        population: byCat[catId],
        color: cat ? cat.color : '#999999',
        legendFontColor: COLORS.inkSoft,
        legendFontSize: 12,
      };
    });

  const totalChart = chartData.reduce((s, d) => s + d.population, 0);

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.paper }}>
      <Header />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.sectionTitleRow}>
          <Text style={styles.sectionTitle}>Por categoría</Text>
          <View style={styles.toggleGroup}>
            <TouchableOpacity
              style={[styles.toggleBtn, chartType === 'gasto' && styles.toggleBtnActive]}
              onPress={() => setChartType('gasto')}
            >
              <Text style={[styles.toggleTxt, chartType === 'gasto' && styles.toggleTxtActive]}>Gastos</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleBtn, chartType === 'ingreso' && styles.toggleBtnActive]}
              onPress={() => setChartType('ingreso')}
            >
              <Text style={[styles.toggleTxt, chartType === 'ingreso' && styles.toggleTxtActive]}>Ingresos</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.chartWrap}>
          {chartData.length === 0 ? (
            <Text style={styles.emptyChart}>Aún no hay {chartType === 'gasto' ? 'gastos' : 'ingresos'} este mes.</Text>
          ) : (
            <>
              <PieChart
                data={chartData}
                width={screenWidth - 72}
                height={200}
                chartConfig={{ color: () => COLORS.ink }}
                accessor="population"
                backgroundColor="transparent"
                paddingLeft="60"
                hasLegend={false}
                center={[0, 0]}
              />
              <View style={styles.catBreakdown}>
                {chartData.map((row) => {
                  const pct = totalChart > 0 ? Math.round((row.population / totalChart) * 100) : 0;
                  return (
                    <View key={row.name + row.color} style={styles.catRow}>
                      <View style={[styles.catDot, { backgroundColor: row.color }]} />
                      <Text style={styles.catName} numberOfLines={1}>{row.name}</Text>
                      <Text style={styles.catPct}>{pct}%</Text>
                      <Text style={styles.catAmt}>{formatMoney(row.population)}</Text>
                    </View>
                  );
                })}
                <View style={styles.catTotalRow}>
                  <Text style={styles.catTotalLabel}>Total</Text>
                  <Text style={styles.catTotalAmt}>{formatMoney(totalChart)}</Text>
                </View>
              </View>
            </>
          )}
        </View>

        <Text style={styles.sectionTitle}>Metas de ahorro</Text>
        {activeGoals.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🎯</Text>
            <Text style={styles.emptyTxt}>
              Crea una meta en Ahorros para ver el progreso aquí.
            </Text>
          </View>
        ) : (
          <View style={styles.savingsBlock}>
            {activeGoals.map((g) => {
              const saved = savingsTotals[g.id] || 0;
              const target = g.target_amount || 0;
              const progress = target > 0 ? saved / target : 0;
              const remaining = Math.max(0, target - saved);
              return (
                <View key={g.id} style={styles.goalCard}>
                  {g.image_uri ? (
                    <Image source={{ uri: g.image_uri }} style={styles.goalImage} />
                  ) : null}
                  <View style={styles.goalBody}>
                    <Text style={styles.goalTitle}>{g.title}</Text>
                    {g.target_date ? (
                      <Text style={styles.goalDate}>Meta: {formatShortDate(g.target_date)}</Text>
                    ) : null}
                    <Text style={styles.goalAmt}>
                      {formatMoney(saved)}
                      {target > 0 ? (
                        <Text style={styles.goalTarget}> / {formatMoney(target)}</Text>
                      ) : null}
                    </Text>
                    {target > 0 ? (
                      <>
                        <ProgressBar progress={progress} />
                        <Text style={styles.goalProgressTxt}>
                          {Math.round(Math.min(progress, 1) * 100)}%
                          {remaining > 0
                            ? ` · faltan ${formatMoney(remaining)}`
                            : ' · ¡meta alcanzada!'}
                        </Text>
                      </>
                    ) : (
                      <Text style={styles.goalProgressTxt}>Sin valor objetivo definido</Text>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        )}

      </ScrollView>

      <TouchableOpacity style={styles.fab} onPress={() => setModalVisible(true)}>
        <Text style={styles.fabTxt}>+</Text>
      </TouchableOpacity>

      <AddMovementModal visible={modalVisible} onClose={() => setModalVisible(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 100 },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: COLORS.ink, marginBottom: 14 },
  toggleGroup: { flexDirection: 'row', backgroundColor: COLORS.paperDim, borderRadius: 20, padding: 3, gap: 2 },
  toggleBtn: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 16 },
  toggleBtnActive: { backgroundColor: COLORS.navy },
  toggleTxt: { fontSize: 12, fontWeight: '600', color: COLORS.inkSoft },
  toggleTxtActive: { color: COLORS.paper },
  chartWrap: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: COLORS.line,
    borderRadius: 14,
    padding: 16,
    marginBottom: 22,
    alignItems: 'center',
  },
  emptyChart: { textAlign: 'center', color: COLORS.inkSoft, fontSize: 13, paddingVertical: 40 },
  catBreakdown: { width: '100%', marginTop: 8, gap: 10 },
  catRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  catDot: { width: 10, height: 10, borderRadius: 5 },
  catName: { flex: 1, fontSize: 13, fontWeight: '600', color: COLORS.ink },
  catPct: { fontSize: 12, fontWeight: '600', color: COLORS.inkSoft, minWidth: 36, textAlign: 'right' },
  catAmt: { fontSize: 13, fontWeight: '700', color: COLORS.ink, minWidth: 88, textAlign: 'right' },
  catTotalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.line,
  },
  catTotalLabel: { fontSize: 13, fontWeight: '700', color: COLORS.inkSoft },
  catTotalAmt: { fontSize: 14, fontWeight: '700', color: COLORS.navy },
  savingsBlock: { gap: 14 },
  goalCard: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: COLORS.line,
    borderRadius: 14,
    overflow: 'hidden',
  },
  goalImage: { width: '100%', height: 160, backgroundColor: COLORS.paperDim },
  goalBody: { padding: 14 },
  goalTitle: { fontSize: 16, fontWeight: '700', color: COLORS.ink },
  goalDate: { fontSize: 12, color: COLORS.inkSoft, marginTop: 4 },
  goalAmt: { fontSize: 20, fontWeight: '700', color: COLORS.gold, marginTop: 8, marginBottom: 10 },
  goalTarget: { fontSize: 14, fontWeight: '500', color: COLORS.inkSoft },
  goalProgressTxt: { fontSize: 12, color: COLORS.inkSoft, marginTop: 8 },
  emptyState: {
    alignItems: 'center',
    padding: 28,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: COLORS.line,
    borderRadius: 14,
  },
  emptyIcon: { fontSize: 28, marginBottom: 8 },
  emptyTxt: { fontSize: 13, color: COLORS.inkSoft, textAlign: 'center', lineHeight: 18 },
  formula: {
    marginTop: 20,
    fontSize: 11,
    color: COLORS.inkSoft,
    lineHeight: 17,
    textAlign: 'center',
  },
  fab: {
    position: 'absolute', bottom: 24, right: 24, width: 56, height: 56, borderRadius: 28,
    backgroundColor: COLORS.gold, alignItems: 'center', justifyContent: 'center',
    elevation: 4, shadowColor: '#000', shadowOpacity: 0.3, shadowOffset: { width: 0, height: 3 }, shadowRadius: 6,
  },
  fabTxt: { fontSize: 28, color: COLORS.navy, lineHeight: 30 },
});
