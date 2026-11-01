import React, { useEffect, useMemo, useState } from 'react';
import {
  Modal, View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useFinance } from '../context/FinanceContext';
import { COLORS, ICONS, PALETTE_COLORS, uid } from '../theme';

export default function AddCategoryModal({
  visible,
  onClose,
  initialType = 'gasto',
  editing = null,
}) {
  const { addCategory, updateCategory } = useFinance();
  const [type, setType] = useState(initialType);
  const [name, setName] = useState('');
  const [icon, setIcon] = useState(ICONS[0]);
  const [color, setColor] = useState(PALETTE_COLORS[0]);

  const isEditing = !!editing;
  const colorOptions = useMemo(() => {
    if (editing?.color && !PALETTE_COLORS.includes(editing.color)) {
      return [editing.color, ...PALETTE_COLORS];
    }
    return PALETTE_COLORS;
  }, [editing]);

  useEffect(() => {
    if (!visible) return;
    if (editing) {
      setType(editing.type === 'ingreso' ? 'ingreso' : 'gasto');
      setName(editing.name || '');
      setIcon(editing.icon || ICONS[0]);
      setColor(editing.color || PALETTE_COLORS[0]);
    } else {
      setType(initialType);
      setName('');
      setIcon(ICONS[0]);
      setColor(PALETTE_COLORS[0]);
    }
  }, [visible, initialType, editing]);

  async function handleSave() {
    if (!name.trim()) {
      Alert.alert('Falta el nombre', 'Ponle un nombre a la categoría.');
      return;
    }
    if (isEditing) {
      await updateCategory({
        id: editing.id,
        type,
        name: name.trim(),
        icon,
        color,
      });
    } else {
      await addCategory({ id: uid(), type, name: name.trim(), icon, color });
    }
    onClose();
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ width: '100%' }}>
          <View style={styles.sheet}>
            <View style={styles.handle} />
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Text style={styles.closeTxt}>✕</Text>
            </TouchableOpacity>
            <Text style={styles.title}>{isEditing ? 'Editar categoría' : 'Nueva categoría'}</Text>
            {isEditing ? (
              <Text style={styles.hint}>
                Los movimientos siguen unidos a esta categoría; solo cambia cómo se ve.
              </Text>
            ) : null}

            <View style={styles.typeToggle}>
              <TouchableOpacity
                style={[styles.typeBtn, type === 'gasto' && styles.typeBtnGastoActive]}
                onPress={() => setType('gasto')}
              >
                <Text style={[styles.typeTxt, type === 'gasto' && { color: COLORS.rust }]}>Gasto</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.typeBtn, type === 'ingreso' && styles.typeBtnIngresoActive]}
                onPress={() => setType('ingreso')}
              >
                <Text style={[styles.typeTxt, type === 'ingreso' && { color: COLORS.forest }]}>Ingreso</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>Nombre</Text>
            <TextInput style={styles.input} placeholder="Ej: Mascotas" value={name} onChangeText={setName} />

            <Text style={styles.label}>Ícono</Text>
            <ScrollView style={{ maxHeight: 160 }}>
              <View style={styles.iconGrid}>
                {ICONS.map((ic) => (
                  <TouchableOpacity
                    key={ic}
                    style={[styles.iconOpt, icon === ic && styles.iconOptSelected]}
                    onPress={() => setIcon(ic)}
                  >
                    <Text style={{ fontSize: 17 }}>{ic}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <Text style={styles.label}>Color</Text>
            <Text style={styles.colorHint}>Estos colores son solo para tus categorías (las fijas usan otros).</Text>
            <View style={styles.colorRow}>
              {colorOptions.map((c) => (
                <TouchableOpacity
                  key={c}
                  style={[styles.colorOpt, { backgroundColor: c }, color === c && styles.colorOptSelected]}
                  onPress={() => setColor(c)}
                />
              ))}
            </View>

            <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
              <Text style={styles.saveTxt}>{isEditing ? 'Guardar cambios' : 'Guardar categoría'}</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(22,34,59,0.6)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: COLORS.paper, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '88%' },
  handle: { width: 36, height: 4, backgroundColor: COLORS.line, borderRadius: 2, alignSelf: 'center', marginBottom: 14 },
  closeBtn: { position: 'absolute', top: 16, right: 16, padding: 4, zIndex: 2 },
  closeTxt: { fontSize: 18, color: COLORS.inkSoft },
  title: { fontSize: 19, fontWeight: '700', color: COLORS.ink, marginBottom: 8 },
  hint: { fontSize: 12.5, color: COLORS.inkSoft, marginBottom: 12, lineHeight: 18 },
  typeToggle: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  typeBtn: { flex: 1, padding: 11, borderRadius: 10, borderWidth: 1.5, borderColor: COLORS.line, alignItems: 'center', backgroundColor: '#fff' },
  typeBtnGastoActive: { borderColor: COLORS.rust, backgroundColor: '#FBEEE9' },
  typeBtnIngresoActive: { borderColor: COLORS.forest, backgroundColor: '#EAF3EE' },
  typeTxt: { fontSize: 13.5, fontWeight: '600', color: COLORS.inkSoft },
  label: { fontSize: 11.5, textTransform: 'uppercase', letterSpacing: 0.6, color: COLORS.inkSoft, marginTop: 12, marginBottom: 6 },
  colorHint: { fontSize: 12, color: COLORS.inkSoft, marginBottom: 8, lineHeight: 16, marginTop: -2 },
  input: { borderWidth: 1.5, borderColor: COLORS.line, borderRadius: 10, padding: 12, fontSize: 15, backgroundColor: '#fff', color: COLORS.ink },
  iconGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  iconOpt: {
    width: '12.6%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center',
    borderRadius: 9, borderWidth: 1.5, borderColor: COLORS.line, backgroundColor: '#fff', marginBottom: 6,
  },
  iconOptSelected: { borderColor: COLORS.gold, backgroundColor: COLORS.paperDim },
  colorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  colorOpt: { width: 30, height: 30, borderRadius: 15, borderWidth: 2, borderColor: 'transparent' },
  colorOptSelected: { borderColor: COLORS.navy, borderWidth: 3 },
  saveBtn: { marginTop: 20, backgroundColor: COLORS.navy, borderRadius: 12, padding: 14, alignItems: 'center' },
  saveTxt: { color: COLORS.paper, fontWeight: '700', fontSize: 14.5 },
});
