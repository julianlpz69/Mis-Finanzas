import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { COLORS, MONTH_NAMES } from '../theme';

function parseISODate(iso) {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return new Date();
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function toISODate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatDisplayDate(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-').map(Number);
  return `${d} de ${MONTH_NAMES[m - 1]} ${y}`;
}

export default function DateField({
  value,
  onChange,
  placeholder = 'Elegir fecha',
  optional = false,
}) {
  const [open, setOpen] = useState(false);
  const dateObj = parseISODate(value);

  function handleChange(event, selected) {
    if (Platform.OS === 'android') {
      setOpen(false);
      if (event.type === 'dismissed') return;
    }
    if (selected) onChange(toISODate(selected));
  }

  return (
    <View>
      <View style={styles.row}>
        <TouchableOpacity
          style={[styles.field, !value && styles.fieldEmpty, optional && value ? styles.fieldFlex : null]}
          onPress={() => setOpen(true)}
          activeOpacity={0.75}
        >
          <Text style={[styles.value, !value && styles.placeholder]}>
            {value ? formatDisplayDate(value) : placeholder}
          </Text>
          <Text style={styles.hint}>Calendario</Text>
        </TouchableOpacity>
        {optional && value ? (
          <TouchableOpacity style={styles.clearBtn} onPress={() => onChange('')} activeOpacity={0.75}>
            <Text style={styles.clearTxt}>Quitar</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {open ? (
        Platform.OS === 'ios' ? (
          <View style={styles.iosBox}>
            <DateTimePicker
              value={dateObj}
              mode="date"
              display="spinner"
              onChange={handleChange}
              locale="es-CO"
            />
            <TouchableOpacity style={styles.doneBtn} onPress={() => setOpen(false)}>
              <Text style={styles.doneTxt}>Listo</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <DateTimePicker
            value={dateObj}
            mode="date"
            display="default"
            onChange={handleChange}
          />
        )
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  field: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1.5,
    borderColor: COLORS.line,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: '#fff',
  },
  fieldFlex: { flex: 1 },
  fieldEmpty: { borderStyle: 'dashed' },
  value: { fontSize: 15, color: COLORS.ink, fontWeight: '600', flexShrink: 1 },
  placeholder: { color: COLORS.inkSoft, fontWeight: '500' },
  hint: { fontSize: 11.5, color: COLORS.inkSoft, marginLeft: 8 },
  clearBtn: {
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: COLORS.line,
    backgroundColor: '#fff',
  },
  clearTxt: { fontSize: 12.5, color: COLORS.rust, fontWeight: '600' },
  iosBox: {
    marginTop: 8,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: COLORS.line,
    backgroundColor: '#fff',
    overflow: 'hidden',
  },
  doneBtn: {
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.line,
  },
  doneTxt: { color: COLORS.navy, fontWeight: '700', fontSize: 14.5 },
});
