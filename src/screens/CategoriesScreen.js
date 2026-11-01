import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFinance } from '../context/FinanceContext';
import AddCategoryModal from '../components/AddCategoryModal';
import {
  COLORS,
  SYSTEM_CATEGORY_IDS,
  SYSTEM_CAT_TABS,
  SYSTEM_CAT_HINTS,
  CAT_SALDO_ANTERIOR,
  CAT_AHORRO,
  CAT_DEUDA_PAGO,
  CAT_PRESTAMO,
  CAT_COBRO_PRESTAMO,
  CAT_DEUDA_RECIBIDA,
} from '../theme';

const FIXED_ORDER_GASTO = [CAT_SALDO_ANTERIOR, CAT_AHORRO, CAT_DEUDA_PAGO, CAT_PRESTAMO];
const FIXED_ORDER_INGRESO = [CAT_SALDO_ANTERIOR, CAT_AHORRO, CAT_COBRO_PRESTAMO, CAT_DEUDA_RECIBIDA];

export default function CategoriesScreen() {
  const insets = useSafeAreaInsets();
  const { categories, movements, deleteCategory } = useFinance();
  const [type, setType] = useState('gasto');
  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState(null);

  const order = type === 'ingreso' ? FIXED_ORDER_INGRESO : FIXED_ORDER_GASTO;
  const systemCats = order
    .map((id) => categories.find((c) => c.id === id))
    .filter(Boolean)
    .filter((c) => {
      const tabs = SYSTEM_CAT_TABS[c.id] || [c.type];
      return tabs.includes(type);
    });

  const filtered = categories.filter(
    (c) => c.type === type && !c.locked && !SYSTEM_CATEGORY_IDS.includes(c.id)
  );

  function openNew() {
    setEditing(null);
    setModalVisible(true);
  }

  function openEdit(cat) {
    setEditing(cat);
    setModalVisible(true);
  }

  function closeModal() {
    setModalVisible(false);
    setEditing(null);
  }

  function handleDelete(cat) {
    if (cat.locked || SYSTEM_CATEGORY_IDS.includes(cat.id)) {
      Alert.alert('No se puede eliminar', 'Esta categoría es del sistema y no se puede modificar.');
      return;
    }
    const used = movements.some((m) => m.category_id === cat.id);
    Alert.alert(
      'Eliminar categoría',
      used
        ? 'Esta categoría tiene movimientos registrados este mes. ¿Eliminarla de todas formas?'
        : '¿Eliminar esta categoría?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Eliminar', style: 'destructive', onPress: () => deleteCategory(cat.id) },
      ]
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.paper }}>
      <View style={[styles.topHeader, { paddingTop: insets.top + 16 }]}>
        <Text style={styles.title}>Categorías</Text>
        <View style={styles.toggleGroup}>
          <TouchableOpacity
            style={[styles.toggleBtn, type === 'gasto' && styles.toggleBtnActive]}
            onPress={() => setType('gasto')}
          >
            <Text style={[styles.toggleTxt, type === 'gasto' && styles.toggleTxtActive]}>Gastos</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleBtn, type === 'ingreso' && styles.toggleBtnActive]}
            onPress={() => setType('ingreso')}
          >
            <Text style={[styles.toggleTxt, type === 'ingreso' && styles.toggleTxtActive]}>Ingresos</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.grid}>
        <Text style={styles.sectionLabel}>Del sistema (fijas)</Text>
        {systemCats.map((c) => (
          <View key={c.id} style={[styles.catCard, styles.catCardFull, { borderLeftColor: c.color }]}>
            <View style={[styles.catIcon, { backgroundColor: `${c.color}22` }]}>
              <Text style={{ fontSize: 16 }}>{c.icon}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.catName}>{c.name}</Text>
              <Text style={styles.lockedHint}>
                {SYSTEM_CAT_HINTS[c.id] || 'Categoría fija del sistema'}
              </Text>
            </View>
            <View style={[styles.colorSwatch, { backgroundColor: c.color }]} />
            <Text style={styles.lockBadge}>Fija</Text>
          </View>
        ))}

        <Text style={[styles.sectionLabel, { marginTop: 10 }]}>Tus categorías</Text>
        <Text style={styles.editHint}>Toca para editar · mantén presionado para eliminar.</Text>
        {filtered.map((c) => (
          <TouchableOpacity
            key={c.id}
            style={[styles.catCard, { borderLeftColor: c.color }]}
            onPress={() => openEdit(c)}
            onLongPress={() => handleDelete(c)}
            delayLongPress={350}
            activeOpacity={0.75}
          >
            <View style={[styles.catIcon, { backgroundColor: `${c.color}22` }]}>
              <Text style={{ fontSize: 16 }}>{c.icon}</Text>
            </View>
            <View style={styles.catBody}>
              <Text style={styles.catName} numberOfLines={2}>{c.name}</Text>
              <View style={[styles.colorBar, { backgroundColor: c.color }]} />
            </View>
            <View style={[styles.colorSwatch, { backgroundColor: c.color }]} />
          </TouchableOpacity>
        ))}
        <TouchableOpacity style={styles.addCard} onPress={openNew}>
          <Text style={styles.addTxt}>+  Agregar</Text>
        </TouchableOpacity>
      </ScrollView>

      <AddCategoryModal
        visible={modalVisible}
        onClose={closeModal}
        initialType={type}
        editing={editing}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  topHeader: { backgroundColor: COLORS.navy, paddingHorizontal: 20, paddingBottom: 20 },
  title: { color: COLORS.paper, fontSize: 20, fontWeight: '700', marginBottom: 14 },
  toggleGroup: { flexDirection: 'row', backgroundColor: COLORS.navySoft, borderRadius: 20, padding: 3, gap: 2, alignSelf: 'flex-start' },
  toggleBtn: { paddingVertical: 6, paddingHorizontal: 14, borderRadius: 16 },
  toggleBtnActive: { backgroundColor: COLORS.gold },
  toggleTxt: { fontSize: 12, fontWeight: '600', color: '#8B96AC' },
  toggleTxtActive: { color: COLORS.navy },
  grid: { padding: 20, flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingBottom: 40 },
  sectionLabel: {
    width: '100%',
    fontSize: 11,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: COLORS.inkSoft,
    marginBottom: 2,
  },
  editHint: {
    width: '100%',
    fontSize: 12,
    color: COLORS.inkSoft,
    marginBottom: 4,
  },
  catCard: {
    width: '47%',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: COLORS.line,
    borderLeftWidth: 5,
    borderRadius: 12,
    padding: 12,
    paddingRight: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  catCardFull: { width: '100%' },
  catIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  catBody: { flex: 1, gap: 6, paddingRight: 4 },
  catName: { fontSize: 13, fontWeight: '600', color: COLORS.ink },
  colorBar: { height: 4, borderRadius: 2, width: '100%', maxWidth: 56 },
  colorSwatch: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: 'rgba(0,0,0,0.12)',
  },
  lockedHint: { fontSize: 11, color: COLORS.inkSoft, marginTop: 2 },
  lockBadge: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.gold,
    backgroundColor: COLORS.paperDim,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    overflow: 'hidden',
  },
  addCard: {
    width: '47%', borderWidth: 1.5, borderColor: COLORS.line, borderStyle: 'dashed', borderRadius: 12,
    alignItems: 'center', justifyContent: 'center', padding: 14,
  },
  addTxt: { fontSize: 13, color: COLORS.inkSoft, fontWeight: '600' },
});
