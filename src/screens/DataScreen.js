import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { useFinance } from '../context/FinanceContext';
import { COLORS } from '../theme';

function stamp() {
  return new Date().toISOString().slice(0, 10);
}

export default function DataScreen() {
  const insets = useSafeAreaInsets();
  const {
    categories,
    createBackup,
    restoreBackup,
    prepareSqliteExport,
    restoreFromSqliteFile,
  } = useFinance();
  const [busy, setBusy] = useState(false);

  async function exportJson() {
    try {
      setBusy(true);
      const data = await createBackup();
      const path = `${FileSystem.cacheDirectory}mis-finanzas-backup-${stamp()}.json`;
      await FileSystem.writeAsStringAsync(path, JSON.stringify(data, null, 2));

      if (!(await Sharing.isAvailableAsync())) {
        Alert.alert('Listo', `Respaldo guardado en:\n${path}`);
        return;
      }
      await Sharing.shareAsync(path, {
        mimeType: 'application/json',
        dialogTitle: 'Exportar respaldo JSON',
        UTI: 'public.json',
      });
    } catch (e) {
      Alert.alert('Error al exportar', e.message || 'No se pudo crear el respaldo.');
    } finally {
      setBusy(false);
    }
  }

  async function exportSqlite() {
    try {
      setBusy(true);
      const dbPath = await prepareSqliteExport();
      const info = await FileSystem.getInfoAsync(dbPath);
      if (!info.exists) {
        Alert.alert('No encontrado', 'No se encontró el archivo de base de datos.');
        return;
      }

      const path = `${FileSystem.cacheDirectory}mis-finanzas-${stamp()}.db`;
      await FileSystem.copyAsync({ from: dbPath, to: path });

      if (!(await Sharing.isAvailableAsync())) {
        Alert.alert('Listo', `SQLite guardado en:\n${path}`);
        return;
      }
      await Sharing.shareAsync(path, {
        mimeType: 'application/x-sqlite3',
        dialogTitle: 'Exportar base SQLite',
        UTI: 'public.database',
      });
    } catch (e) {
      Alert.alert('Error al exportar', e.message || 'No se pudo exportar el SQLite.');
    } finally {
      setBusy(false);
    }
  }

  function confirmImport(message, action) {
    Alert.alert(
      'Importar datos',
      message,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Importar', style: 'destructive', onPress: action },
      ]
    );
  }

  async function importJson() {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/json', 'text/json', '*/*'],
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets?.length) return;

      const asset = result.assets[0];
      confirmImport(
        'Esto reemplazará todas las categorías y movimientos actuales por el contenido del archivo JSON. ¿Continuar?',
        async () => {
          try {
            setBusy(true);
            const raw = await FileSystem.readAsStringAsync(asset.uri);
            const data = JSON.parse(raw);
            await restoreBackup(data);
            Alert.alert(
              'Importación lista',
              `Se restauraron ${data.categories?.length || 0} categorías y ${data.movements?.length || 0} movimientos.`
            );
          } catch (e) {
            Alert.alert('Error al importar', e.message || 'El archivo no es un respaldo válido.');
          } finally {
            setBusy(false);
          }
        }
      );
    } catch (e) {
      Alert.alert('Error', e.message || 'No se pudo abrir el archivo.');
    }
  }

  async function importSqlite() {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['*/*'],
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets?.length) return;

      const asset = result.assets[0];
      const name = (asset.name || '').toLowerCase();
      if (name && !name.endsWith('.db') && !name.endsWith('.sqlite') && !name.endsWith('.sqlite3')) {
        Alert.alert(
          'Archivo dudoso',
          'El archivo no parece ser una base SQLite (.db). ¿Importarlo de todas formas?',
          [
            { text: 'Cancelar', style: 'cancel' },
            {
              text: 'Importar',
              style: 'destructive',
              onPress: () => doImportSqlite(asset.uri),
            },
          ]
        );
        return;
      }

      confirmImport(
        'Esto reemplazará toda la base de datos actual por el archivo SQLite seleccionado. ¿Continuar?',
        () => doImportSqlite(asset.uri)
      );
    } catch (e) {
      Alert.alert('Error', e.message || 'No se pudo abrir el archivo.');
    }
  }

  async function doImportSqlite(uri) {
    try {
      setBusy(true);
      await restoreFromSqliteFile(uri);
      Alert.alert('Importación lista', 'La base SQLite se restauró correctamente.');
    } catch (e) {
      Alert.alert('Error al importar', e.message || 'No se pudo restaurar el SQLite.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.paper }}>
      <View style={[styles.topHeader, { paddingTop: insets.top + 16 }]}>
        <Text style={styles.title}>Datos</Text>
        <Text style={styles.subtitle}>
          Lleva tu información a otro celular exportando un respaldo e importándolo allá.
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.statsCard}>
          <Text style={styles.statsLabel}>Estado actual</Text>
          <Text style={styles.statsValue}>{categories.length} categorías guardadas</Text>
          <Text style={styles.statsHint}>
            Recomendado: exporta JSON (más fácil de restaurar). El archivo .db es la base SQLite cruda.
          </Text>
        </View>

        <Text style={styles.sectionTitle}>Exportar</Text>
        <TouchableOpacity style={styles.primaryBtn} onPress={exportJson} disabled={busy}>
          <Text style={styles.primaryBtnTxt}>Exportar respaldo JSON</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryBtn} onPress={exportSqlite} disabled={busy}>
          <Text style={styles.secondaryBtnTxt}>Exportar archivo SQLite (.db)</Text>
        </TouchableOpacity>

        <Text style={styles.sectionTitle}>Importar</Text>
        <Text style={styles.warning}>
          Importar reemplaza los datos actuales de esta app en el celular.
        </Text>
        <TouchableOpacity style={styles.primaryBtn} onPress={importJson} disabled={busy}>
          <Text style={styles.primaryBtnTxt}>Importar respaldo JSON</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryBtn} onPress={importSqlite} disabled={busy}>
          <Text style={styles.secondaryBtnTxt}>Importar archivo SQLite (.db)</Text>
        </TouchableOpacity>

        {busy ? (
          <View style={styles.busyRow}>
            <ActivityIndicator color={COLORS.gold} />
            <Text style={styles.busyTxt}>Procesando…</Text>
          </View>
        ) : null}
      </ScrollView>
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
  content: { padding: 20, paddingBottom: 40 },
  statsCard: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: COLORS.line,
    borderRadius: 14,
    padding: 16,
    marginBottom: 22,
  },
  statsLabel: {
    fontSize: 11,
    letterSpacing: 1,
    color: COLORS.inkSoft,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  statsValue: { fontSize: 16, fontWeight: '700', color: COLORS.ink, marginBottom: 8 },
  statsHint: { fontSize: 12.5, color: COLORS.inkSoft, lineHeight: 18 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: COLORS.ink, marginBottom: 12, marginTop: 4 },
  warning: { fontSize: 12.5, color: COLORS.rust, marginBottom: 12, lineHeight: 18 },
  primaryBtn: {
    backgroundColor: COLORS.navy,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    marginBottom: 10,
  },
  primaryBtnTxt: { color: COLORS.paper, fontWeight: '700', fontSize: 14.5 },
  secondaryBtn: {
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: COLORS.line,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    marginBottom: 18,
  },
  secondaryBtnTxt: { color: COLORS.ink, fontWeight: '600', fontSize: 14 },
  busyRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 8 },
  busyTxt: { color: COLORS.inkSoft, fontSize: 13 },
});
