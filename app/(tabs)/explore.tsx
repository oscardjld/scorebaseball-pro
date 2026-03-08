import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useBaseballContext } from '../../context/BaseballContext';

export default function ExploreScreen() {
  const { lineups, pitchersHistory, teamAbbr, activePitchers, statsAcumuladas } = useBaseballContext();

  const renderTable = (teamKey: 'away' | 'home') => {
    // 1. Unimos activos y retirados
    const todos = [...(statsAcumuladas[teamKey] || []), ...(lineups[teamKey] || [])];

    // 2. Ordenamos por turno al bate (orderPos) 
    // Si tienen el mismo orderPos, el que entró después (isSub) va debajo
    const listaOrdenada = todos.sort((a, b) => {
      if (a.orderPos !== b.orderPos) return a.orderPos - b.orderPos;
      return a.entroInning ? 1 : -1;
    });

    return (
      <View style={styles.table}>
        <View style={styles.tableHeader}>
          <Text style={[styles.headerCell, { flex: 0.5 }]}>#</Text>
          <Text style={[styles.headerCell, { flex: 3, textAlign: 'left' }]}>BATEADOR ({teamAbbr[teamKey]})</Text>
          <Text style={styles.headerCell}>POS</Text>
          <Text style={styles.headerCell}>VB</Text>
          <Text style={styles.headerCell}>H</Text>
          <Text style={styles.headerCell}>AVG</Text>
        </View>

        {listaOrdenada.length > 0 ? (
          listaOrdenada.map((player, i) => (
            <View key={i} style={[
              styles.tableRow,
              player.salioInning && { backgroundColor: '#161b22', opacity: 0.7 }
            ]}>
              {/* Indicador de Turno o Sustitución */}
              <Text style={[styles.cell, { flex: 0.5, color: '#4b5563' }]}>
                {player.isSub ? "↳" : player.orderPos}
              </Text>

              <View style={{ flex: 3 }}>
                <Text style={[styles.cell, { color: '#fff', textAlign: 'left', fontWeight: player.salioInning ? '400' : 'bold' }]}>
                  {player.name}
                </Text>
                {player.salioInning && (
                  <Text style={{ color: '#ef4444', fontSize: 7, fontWeight: 'bold' }}>
                    SALIÓ INN {player.salioInning}
                  </Text>
                )}
                {player.isSub && !player.salioInning && (
                  <Text style={{ color: '#10b981', fontSize: 7, fontWeight: 'bold' }}>
                    ENTRÓ INN {player.entroInning}
                  </Text>
                )}
              </View>

              {/* Columna de Posición (Dinámica) */}
              <Text style={[styles.cell, { color: '#fbbf24' }]}>{player.pos || '--'}</Text>

              <Text style={styles.cell}>{player.ab}</Text>
              <Text style={styles.cell}>{player.h}</Text>
              <Text style={[styles.cell, { color: '#06b6d4' }]}>{player.avg}</Text>
            </View>
          ))
        ) : (
          <Text style={styles.noData}>No hay lineup cargado</Text>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={{ padding: 15 }}>
        <Text style={styles.sectionTitle}>ESTADÍSTICAS DE BATEO</Text>

        {renderTable('away')}
        <View style={{ height: 25 }} />
        {renderTable('home')}

        <Text style={[styles.sectionTitle, { marginTop: 35 }]}>HISTORIAL DE LANZADORES</Text>
        <View style={styles.pitcherList}>
          {/* Pitchers Activos */}
          {['away', 'home'].map((side) => {
            const p = activePitchers[side];
            return (
              <View key={`active-${side}`} style={[styles.pitcherCard, { borderColor: '#10b981' }]}>
                <View>
                  <Text style={styles.pName}>{p.name} (ACT)</Text>
                  <Text style={styles.pTeam}>{teamAbbr[side]}</Text>
                </View>
                <View style={styles.pStats}>
                  <Text style={styles.pStatItem}>P: {p.count}</Text>
                  <Text style={styles.pStatItem}>H: {p.hits}</Text>
                  <Text style={styles.pStatItem}>K: {p.k}</Text>
                  <Text style={styles.pStatItem}>BB: {p.bb}</Text>
                </View>
              </View>
            );
          })}

          {/* Historial de Relevos */}
          {pitchersHistory.map((p, i) => (
            <View key={`hist-${i}`} style={styles.pitcherCard}>
              <View>
                <Text style={styles.pName}>{p.name}</Text>
                <Text style={styles.pTeam}>{p.team} (INN {p.finalInning})</Text>
              </View>
              <View style={styles.pStats}>
                <Text style={styles.pStatItem}>P: {p.count}</Text>
                <Text style={styles.pStatItem}>H: {p.hits}</Text>
                <Text style={styles.pStatItem}>K: {p.k}</Text>
                <Text style={styles.pStatItem}>BB: {p.bb}</Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#050505' },
  sectionTitle: { color: '#06b6d4', fontSize: 20, fontWeight: '900', marginBottom: 15, fontStyle: 'italic' },
  table: { backgroundColor: '#111827', borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: '#1f2937' },
  tableHeader: { flexDirection: 'row', backgroundColor: '#1f2937', padding: 10 },
  headerCell: { color: '#4b5563', fontSize: 10, fontWeight: 'bold', flex: 1, textAlign: 'center' },
  tableRow: { flexDirection: 'row', padding: 12, borderBottomWidth: 1, borderBottomColor: '#1f2937', alignItems: 'center' },
  cell: { color: '#9ca3af', fontSize: 11, flex: 1, textAlign: 'center', fontWeight: '600' },
  pitcherList: { gap: 10 },
  pitcherCard: { backgroundColor: '#111827', padding: 15, borderRadius: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: '#1f2937' },
  pName: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
  pTeam: { color: '#06b6d4', fontSize: 9, fontWeight: 'bold' },
  pStats: { flexDirection: 'row', gap: 10 },
  pStatItem: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
  noData: { color: '#374151', fontSize: 12, fontStyle: 'italic', padding: 20, textAlign: 'center' }
});