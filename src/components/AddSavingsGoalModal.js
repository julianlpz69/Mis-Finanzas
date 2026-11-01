import React, { useEffect, useState } from 'react';
import {
  Modal, View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, Image, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { useFinance } from '../context/FinanceContext';
import DateField from './DateField';
import { COLORS, uid, formatAmountInput, parseAmountInput } from '../theme';

async function persistImage(uri) {
  if (!uri) return null;
  const dir = `${FileSystem.documentDirectory}savings/`;
  const info = await FileSystem.getInfoAsync(dir);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  }
  const dest = `${dir}${uid()}.jpg`;
  await FileSystem.copyAsync({ from: uri, to: dest });
  return dest;
}

export default function AddSavingsGoalModal({ visible, onClose, editing = null }) {
  const insets = useSafeAreaInsets();
  const { addSavingsGoal, updateSavingsGoal } = useFinance();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [imageUri, setImageUri] = useState(null);

  useEffect(() => {
    if (visible) {
      setTitle(editing?.title || '');
      setDescription(editing?.description || '');
      setTargetAmount(
        editing?.target_amount ? formatAmountInput(String(Math.round(editing.target_amount))) : ''
      );
      setTargetDate(editing?.target_date || '');
      setImageUri(editing?.image_uri || null);
    }
  }, [visible, editing]);

  async function pickImage() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permiso necesario', 'Necesitamos acceso a tus fotos para la meta de ahorro.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsEditing: true,
      aspect: [16, 10],
    });
    if (!result.canceled && result.assets?.[0]?.uri) {
      setImageUri(result.assets[0].uri);
    }
  }

  async function handleSave() {
    if (!title.trim()) {
      Alert.alert('Falta el nombre', 'Ej: Comprar una moto, Viaje, Emergencias.');
      return;
    }
    const target = parseAmountInput(targetAmount);
    if (!target || target <= 0) {
      Alert.alert('Valor objetivo', 'Indica cuánto quieres ahorrar (mayor a 0).');
      return;
    }
    if (targetDate && !/^\d{4}-\d{2}-\d{2}$/.test(targetDate)) {
      Alert.alert('Fecha inválida', 'Usa AAAA-MM-DD o déjala vacía.');
      return;
    }

    let storedUri = imageUri;
    if (imageUri && (!editing || imageUri !== editing.image_uri)) {
      try {
        storedUri = await persistImage(imageUri);
      } catch {
        storedUri = editing?.image_uri || null;
      }
    }

    const payload = {
      title: title.trim(),
      description: description.trim(),
      imageUri: storedUri,
      targetAmount: target,
      targetDate: targetDate || null,
    };

    if (editing) {
      await updateSavingsGoal({
        ...payload,
        id: editing.id,
        active: !!editing.active,
      });
    } else {
      await addSavingsGoal({
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
            <Text style={styles.title}>{editing ? 'Editar meta' : 'Nueva meta de ahorro'}</Text>

            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <TouchableOpacity style={styles.imageBox} onPress={pickImage}>
                {imageUri ? (
                  <Image source={{ uri: imageUri }} style={styles.image} />
                ) : (
                  <Text style={styles.imagePlaceholder}>Imagen opcional</Text>
                )}
              </TouchableOpacity>

              <Text style={styles.label}>Nombre</Text>
              <TextInput
                style={styles.input}
                placeholder="Ej: Comprar una moto"
                value={title}
                onChangeText={setTitle}
              />

              <Text style={styles.label}>Valor objetivo</Text>
              <TextInput
                style={styles.input}
                placeholder="15.000.000"
                keyboardType="number-pad"
                value={targetAmount}
                onChangeText={(t) => setTargetAmount(formatAmountInput(t))}
              />

              <Text style={styles.label}>Fecha objetivo (opcional)</Text>
              <DateField
                value={targetDate}
                onChange={setTargetDate}
                placeholder="Sin fecha objetivo"
                optional
              />

              <Text style={styles.label}>Descripción (opcional)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="¿Para qué estás ahorrando?"
                value={description}
                onChangeText={setDescription}
                multiline
              />

              <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
                <Text style={styles.saveTxt}>{editing ? 'Guardar cambios' : 'Crear meta'}</Text>
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
  title: { fontSize: 19, fontWeight: '700', color: COLORS.ink, marginBottom: 14 },
  imageBox: {
    height: 140,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: COLORS.line,
    borderStyle: 'dashed',
    backgroundColor: '#fff',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  image: { width: '100%', height: '100%' },
  imagePlaceholder: { color: COLORS.inkSoft, fontSize: 13 },
  label: { fontSize: 11.5, textTransform: 'uppercase', letterSpacing: 0.6, color: COLORS.inkSoft, marginTop: 12, marginBottom: 6 },
  input: { borderWidth: 1.5, borderColor: COLORS.line, borderRadius: 10, padding: 12, fontSize: 15, backgroundColor: '#fff', color: COLORS.ink },
  textArea: { minHeight: 70, textAlignVertical: 'top' },
  saveBtn: { marginTop: 20, marginBottom: 8, backgroundColor: COLORS.navy, borderRadius: 12, padding: 14, alignItems: 'center' },
  saveTxt: { color: COLORS.paper, fontWeight: '700', fontSize: 14.5 },
});
