import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Dimensions,
  Modal,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';

import { useBaseballContext } from "../../context/BaseballContext";
import { useAudio } from "../../hooks/useAudio";

const { width } = Dimensions.get('window');

// --- CONSTANTES ---
const POSICIONES = ["P", "C", "1B", "2B", "3B", "SS", "LF", "CF", "RF", "BD", "CE"];

const LedIndicator = ({ active, color, label, max = 3 }) => (
  <View style={styles.ledContainer}>
    <Text style={styles.ledLabel}>{label}</Text>
    <View style={styles.ledRow}>
      {[...Array(max)].map((_, i) => (
        <View
          key={i}
          style={[
            styles.ledCircle,
            {
              backgroundColor: i < active ? color : "#111827",
              shadowColor: color,
              elevation: i < active ? 10 : 0,
            },
          ]}
        />
      ))}
    </View>
  </View>
);

export default function BaseballScreen() {
  const router = useRouter();
  const { playSound } = useAudio();

  // --- ESTADOS LOCALES ---
  const [modalVisible, setModalVisible] = useState(false);
  const [nuevoNombre, setNuevoNombre] = useState("");
  const [posElegida, setPosElegida] = useState("BD");
  const [showInningOverlay, setShowInningOverlay] = useState(false);

  // --- REFERENCIA PARA ANIMACIÓN FADE ---
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const {
    game,
    registerAction,
    teamAbbr,
    lineups,
    indices,
    activePitchers,
    deshacerJugada,
    guardarPartidaNueva,
    realizarCambioJugador,
    limpiarBaseManualmente,
    anunciarBateador,
    exportarPDF, // <--- AÑADIDO: Extraemos la función del contexto
  } = useBaseballContext();

  // --- DETECTAR CAMBIO DE INNING CON ANIMACIÓN FADE IN/OUT ---
  useEffect(() => {
    if (game.isGameOver) return;

    setShowInningOverlay(true);

    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.delay(2000),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setShowInningOverlay(false);
    });
  }, [game.currentInning, game.isHomeBatting]);

  const battingTeam = game.isHomeBatting ? "home" : "away";
  const pitchingTeam = game.isHomeBatting ? "away" : "home";

  const currentIndex = indices[battingTeam];
  const currentBatter = lineups[battingTeam]?.[currentIndex] || {
    name: "ESPERANDO LINEUP", h: 0, ab: 0, avg: ".000", pos: ""
  };

  const currentP = activePitchers[pitchingTeam] || {
    name: "PITCHER", count: 0, hits: 0, k: 0, bb: 0
  };

  // --- MANEJO DE ACCIONES ---
  const handleAction = (act) => {
    registerAction(act, playSound);
  };

  const handleBasePress = (baseName, label) => {
    if (!game.bases[baseName]) return;

    Alert.alert(
      `Corredor: ${game.bases[baseName].name}`,
      `¿Qué sucedió en ${label}?`,
      [
        {
          text: "Out en Base", onPress: () => {
            limpiarBaseManualmente(baseName, true, playSound);
          }, style: "destructive"
        },
        { text: "Error / Quitar", onPress: () => limpiarBaseManualmente(baseName, false) },
        { text: "Cancelar", style: "cancel" }
      ]
    );
  };

  const handleSustitucion = () => {
    setNuevoNombre("");
    setPosElegida(currentBatter.pos || "BD");
    setModalVisible(true);
  };

  const confirmarSustitucion = () => {
    if (nuevoNombre.trim()) {
      realizarCambioJugador(currentIndex, nuevoNombre, posElegida);
      setModalVisible(false);
      setTimeout(() => anunciarBateador(nuevoNombre), 500);
    } else {
      Alert.alert("Error", "Debes ingresar un nombre.");
    }
  };

  const getInningLabel = () => {
    if (game.currentInning > 9) return "EXTRA INNING";
    const sufijos = ["", "er", "do", "er", "to", "to", "to", "mo", "vo", "no"];
    return `${game.currentInning}${sufijos[game.currentInning] || "to"} Inning`;
  };

  const RunnerTag = ({ name, basePos }) => {
    if (!name) return null;
    const lastName = name.split(' ').pop();
    return (
      <View style={[styles.runnerTag, styles[`tag${basePos}`]]}>
        <Text style={styles.runnerTagText} numberOfLines={1}>{lastName}</Text>
      </View>
    );
  };

  const getPitcherColor = (count) => {
    if (count > 85) return "#ef4444";
    if (count > 65) return "#fbbf24";
    return "#10b981";
  };

  const handleNuevoJuego = () => {
    Alert.alert("Nuevo Juego", "¿Deseas configurar un nuevo partido?", [
      { text: "Cancelar", style: "cancel" },
      { text: "Configurar", onPress: () => router.push('/modal') }
    ]);
  };

  const handleGuardarMenu = () => {
    Alert.alert(
      "Gestión de Partida", 
      "Selecciona una opción para tus archivos", 
      [
        { 
          text: "💾 Guardar Partida Actual", 
          onPress: () => guardarPartidaNueva() 
        },
        { 
          text: "📂 Ver Historial / Abrir", 
          onPress: () => router.push('/lista-partidas') 
        },
        { 
          text: "📄 Generar Reporte PDF", 
          onPress: () => exportarPDF() 
        },
        { 
          text: "❌ SALIR", // <--- Botón de cerrar/atrás
          style: "cancel", // Esto le da un diseño diferente en iOS y permite cerrar el Alert
        }
      ],
      { cancelable: true } // Esto permite que si el usuario toca fuera del cuadro, también se cierre
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* --- OVERLAY DE CAMBIO DE INNING --- */}
      {showInningOverlay && !game.isGameOver && (
        <Animated.View style={[styles.inningOverlay, { opacity: fadeAnim }]}>
          <View style={styles.inningCard}>
            <Text style={styles.inningCardSub}>{game.isHomeBatting ? "PARTE BAJA" : "PARTE ALTA"}</Text>
            <Text style={styles.inningCardMain}>{getInningLabel()}</Text>
            <View style={styles.inningCardDivider} />
            <Text style={styles.inningCardTeams}>{teamAbbr.away} vs {teamAbbr.home}</Text>
          </View>
        </Animated.View>
      )}
                                                  
      {/* MODAL DE SUSTITUCIÓN */}
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Sustitución de Bateador</Text>
            <Text style={styles.modalSubtitle}>Turno #{currentIndex + 1} en el Lineup</Text>

            <View style={styles.infoBanner}>
              <Text style={styles.infoText}>Selecciona un jugador de reserva o escribe un nombre nuevo:</Text>
            </View>

            {/* --- NUEVA SECCIÓN: LISTA DE RESERVAS --- */}
            {game.reserva?.[battingTeam]?.length > 0 && (
              <View style={{ marginBottom: 15 }}>
                <Text style={styles.posLabel}>RESERVAS DISPONIBLES:</Text>
                <View style={styles.posGrid}>
                  {game.reserva[battingTeam].map((reservaName, idx) => (
                    <TouchableOpacity
                      key={idx}
                      onPress={() => setNuevoNombre(reservaName)}
                      style={[
                        styles.posBadge,
                        nuevoNombre === reservaName && styles.posBadgeActive
                      ]}
                    >
                      <Text style={[styles.posBadgeText, nuevoNombre === reservaName && { color: '#000' }]}>
                        {reservaName}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            <TextInput
              style={styles.modalInput}
              value={nuevoNombre}
              onChangeText={setNuevoNombre}
              placeholder="NOMBRE DEL SUSTITUTO"
              placeholderTextColor="#4b5563"
              autoCapitalize="characters"
            />

            <Text style={styles.posLabel}>POSICIÓN DEFENSIVA:</Text>
            <View style={styles.posGrid}>
              {POSICIONES.map((p) => (
                <TouchableOpacity
                  key={p}
                  onPress={() => setPosElegida(p)}
                  style={[
                    styles.posBadge,
                    posElegida === p && styles.posBadgeActive
                  ]}
                >
                  <Text style={[styles.posBadgeText, posElegida === p && { color: '#000' }]}>{p}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: '#1f2937' }]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.modalBtnTextCancel}>CANCELAR</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: '#06b6d4' }]}
                onPress={confirmarSustitucion}
              >
                <Text style={styles.modalBtnTextConfirm}>CONFIRMAR</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>

        {/* 1. CENTRO DE MANDO ACTUALIZADO */}
        <View style={[styles.managementBar, { marginTop: 10 }]}>
          <TouchableOpacity style={styles.manageBtn} onPress={handleNuevoJuego}>
            <Text style={styles.manageBtnText}>🆕 NUEVO</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.manageBtn} onPress={handleGuardarMenu}>
            <Text style={styles.manageBtnText}>📁 ARCHIVOS</Text>
          </TouchableOpacity>
          {/* BOTÓN PDF AÑADIDO DIRECTAMENTE EN LA BARRA */}
          <TouchableOpacity
            style={[styles.manageBtn, { borderColor: '#06b6d4' }]}
            onPress={() => exportarPDF()}
          >
            <Text style={[styles.manageBtnText, { color: '#06b6d4' }]}>📄 PDF</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.manageBtn, { borderColor: '#ef4444' }]} onPress={deshacerJugada}>
            <Text style={[styles.manageBtnText, { color: '#ef4444' }]}>↩ UNDO</Text>
          </TouchableOpacity>
        </View>

        {/* 2. TV SCORE BAR */}
        <View style={styles.tvHeader}>
          <View style={styles.tvScoreContainer}>
            <View style={[styles.tvTeamBox, !game.isHomeBatting && styles.tvActiveSide]}>
              <Text style={styles.tvAbbrText}>{teamAbbr.away}</Text>
              <Text style={styles.tvScoreText}>{game.awayScore}</Text>
            </View>
            <View style={styles.tvInningBox}>
              <Text style={styles.tvInningText}>{game.isHomeBatting ? "▼" : "▲"}{game.currentInning}</Text>
            </View>
            <View style={[styles.tvTeamBox, game.isHomeBatting && styles.tvActiveSide]}>
              <Text style={styles.tvScoreText}>{game.homeScore}</Text>
              <Text style={styles.tvAbbrText}>{teamAbbr.home}</Text>
            </View>
          </View>
        </View>

        {/* 3. SCOREBOARD DINÁMICO */}
        <View style={styles.scoreboard}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View>
              <View style={styles.scoreRow}>
                <Text style={styles.scoreInningLabel}>INN</Text>
                <View style={styles.scoreGrid}>
                  {game.awayInnings.map((_, i) => (
                    <Text key={i} style={[styles.gridNum, game.currentInning === (i + 1) && { color: "#06b6d4", fontWeight: 'bold' }]}>
                      {i + 1}
                    </Text>
                  ))}
                  <Text style={styles.gridTotalLabel}>R</Text>
                </View>
              </View>
              {['away', 'home'].map((side) => (
                <View key={side} style={styles.scoreRow}>
                  <Text style={[styles.teamAbbr, ((side === 'away' && !game.isHomeBatting) || (side === 'home' && game.isHomeBatting)) && { color: side === 'home' ? "#06b6d4" : "#ef4444" }]}>
                    {teamAbbr[side]}
                  </Text>
                  <View style={styles.scoreGrid}>
                    {game[`${side}Innings`].map((r, i) => (
                      <Text key={i} style={styles.gridNum}>{r}</Text>
                    ))}
                    <Text style={styles.gridTotal}>{game[`${side}Score`]}</Text>
                  </View>
                </View>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* 4. LEDs + DIAMANTE */}
        <View style={styles.middleSection}>
          <View style={styles.ledsBox}>
            <LedIndicator active={game.balls} color="#fbbf24" label="BALL" max={3} />
            <LedIndicator active={game.strikes} color="#ef4444" label="STRIKE" max={2} />
            <LedIndicator active={game.outs} color="#ffffff" label="OUT" max={2} />
          </View>

          <View style={styles.diamondContainer}>
            <View style={styles.diamond}>
              <TouchableOpacity
                onPress={() => handleBasePress('second', '2da Base')}
                style={[styles.base, styles.posSecond, game.bases.second && styles.baseActive]}
              />
              <RunnerTag name={game.bases.second?.name} basePos="Second" />

              <TouchableOpacity
                onPress={() => handleBasePress('third', '3ra Base')}
                style={[styles.base, styles.posThird, game.bases.third && styles.baseActive]}
              />
              <RunnerTag name={game.bases.third?.name} basePos="Third" />

              <TouchableOpacity
                onPress={() => handleBasePress('first', '1ra Base')}
                style={[styles.base, styles.posFirst, game.bases.first && styles.baseActive]}
              />
              <RunnerTag name={game.bases.first?.name} basePos="First" />
            </View>
          </View>
        </View>

        {/* 5. SECCIÓN DUELO */}
        <View style={styles.duelSection}>
          <TouchableOpacity
            style={[styles.playerBox, { borderLeftColor: game.isHomeBatting ? "#06b6d4" : "#ef4444" }]}
            onPress={handleSustitucion}
          >
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                <Text style={styles.bannerLabel}>
                  #{currentIndex + 1} - {game.isHomeBatting ? "HOME" : "AWAY"} BATTER
                </Text>
                {currentBatter.pos ? <Text style={styles.posIndicator}>{currentBatter.pos}</Text> : null}
              </View>
              <Text style={styles.playerName}>
                {currentBatter.name} {currentBatter.isSub ? "*(S)" : ""} 🔄
              </Text>
              <Text style={styles.playerStats}>
                H:{currentBatter.h} | VB:{currentBatter.ab} | AVG:{currentBatter.avg}
              </Text>
            </View>
          </TouchableOpacity>

          {/* ESTE ES EL VIEW CAMBIADO A TOUCHABLEOPACITY PARA EL PITCHER */}
          <TouchableOpacity 
            style={[styles.playerBox, { borderLeftColor: "#10b981", marginTop: 10 }]}
            onPress={() => router.push('/relevo')}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.bannerLabel}>LANZADOR ACTUAL</Text>
              <Text style={styles.playerName}>{currentP.name}</Text>
              <Text style={styles.playerStats}>P:{currentP.count} | H:{currentP.hits} | K:{currentP.k} | BB:{currentP.bb}</Text>
            </View>
            <View style={[styles.miniCircle, { borderColor: getPitcherColor(currentP.count) }]}>
              <Text style={[styles.miniCircleText, { color: getPitcherColor(currentP.count) }]}>{currentP.count}</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* 6. BOTONERA DE ACCIÓN */}
        <View style={styles.controlsGrid}>
          {["ball", "strike", "hit", "double", "triple", "hr", "out", "k"].map((act) => (
            <TouchableOpacity
              key={act}
              style={[
                styles.actionBtn,
                act === "hr" && { backgroundColor: "#06b6d4" },
                (act === "out" || act === "k") && { backgroundColor: "#450a0a" }
              ]}
              onPress={() => handleAction(act)}
            >
              <Text style={[styles.actionBtnText, act === "hr" && { color: "#000" }]}>{act.toUpperCase()}</Text>
            </TouchableOpacity>
          ))}

          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: "#10b981", width: "95%", marginTop: 5 }]}
            onPress={() => router.push('/relevo')}
          >
            <Text style={[styles.actionBtnText, { color: "#000" }]}>🔄 REGISTRAR RELEVO</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#050505" },
  tvHeader: { paddingVertical: 12, alignItems: 'center' },
  tvScoreContainer: { flexDirection: 'row', backgroundColor: '#000', borderRadius: 6, overflow: 'hidden', borderWidth: 1, borderColor: '#374151' },
  tvTeamBox: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, paddingVertical: 5, gap: 12 },
  tvActiveSide: { backgroundColor: '#1f2937' },
  tvAbbrText: { color: '#fff', fontSize: 16, fontWeight: '900' },
  tvScoreText: { color: '#06b6d4', fontSize: 20, fontWeight: '900' },
  tvInningBox: { backgroundColor: '#374151', paddingHorizontal: 10, justifyContent: 'center', alignItems: 'center' },
  tvInningText: { color: '#fff', fontSize: 13, fontWeight: 'bold' },
  managementBar: { flexDirection: 'row', gap: 6, marginBottom: 5, justifyContent: 'center', paddingHorizontal: 10 },
  manageBtn: { backgroundColor: "#111827", paddingHorizontal: 8, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: '#374151', flex: 1, alignItems: 'center' },
  manageBtnText: { color: "#fff", fontSize: 9, fontWeight: "900" },
  scoreboard: { backgroundColor: "rgba(17, 24, 39, 0.5)", marginHorizontal: 15, padding: 12, borderRadius: 15, borderWidth: 1, borderColor: "#1f2937" },
  scoreRow: { flexDirection: "row", alignItems: "center", marginBottom: 4 },
  scoreInningLabel: { width: 50, fontSize: 10, color: "#4b5563", fontWeight: "bold" },
  teamAbbr: { width: 50, fontSize: 14, color: "#6b7280", fontWeight: "bold" },
  scoreGrid: { flexDirection: "row", flex: 1, paddingLeft: 10 },
  gridNum: { color: "#4b5563", fontSize: 11, width: 25, textAlign: "center" },
  gridTotal: { color: "#fff", fontSize: 14, fontWeight: "bold", width: 35, textAlign: "right" },
  gridTotalLabel: { color: "#06b6d4", fontSize: 11, width: 35, textAlign: "right", fontWeight: "bold" },
  middleSection: { flexDirection: "row", paddingVertical: 15, justifyContent: "space-around", alignItems: "center" },
  ledsBox: { gap: 10 },
  ledContainer: { alignItems: "center" },
  ledLabel: { color: "#4b5563", fontSize: 9, fontWeight: "bold", marginBottom: 4 },
  ledRow: { flexDirection: "row", gap: 6 },
  ledCircle: { width: 14, height: 14, borderRadius: 7, borderWidth: 1, borderColor: "#000" },
  diamondContainer: { width: 140, height: 140, justifyContent: "center", alignItems: "center" },
  diamond: { width: 80, height: 80, transform: [{ rotate: "45deg" }], borderWidth: 2, borderColor: "#1f2937" },
  base: { position: "absolute", width: 22, height: 22, backgroundColor: "#111827", borderWidth: 1, borderColor: "#374151" },
  baseActive: { backgroundColor: "#06b6d4", borderColor: "#fff" },
  posSecond: { top: -11, left: -11 },
  posThird: { bottom: -11, left: -11 },
  posFirst: { top: -11, right: -11 },
  runnerTag: {
    position: 'absolute',
    backgroundColor: '#fff',
    paddingHorizontal: 4,
    borderRadius: 3,
    transform: [{ rotate: '-45deg' }],
    minWidth: 40,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#06b6d4'
  },
  runnerTagText: { fontSize: 8, color: '#000', fontWeight: 'bold' },
  tagFirst: { top: -25, right: -35 },
  tagSecond: { top: -35, left: -25 },
  tagThird: { bottom: -25, left: -35 },
  duelSection: { marginHorizontal: 15 },
  playerBox: { backgroundColor: "rgba(17, 24, 39, 0.8)", padding: 15, borderRadius: 12, borderLeftWidth: 5, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  bannerLabel: { color: "#4b5563", fontSize: 8, fontWeight: "bold", letterSpacing: 1 },
  posIndicator: { color: "#fbbf24", fontSize: 9, fontWeight: "bold", backgroundColor: "#000", paddingHorizontal: 4, borderRadius: 3 },
  playerName: { color: "#fff", fontSize: 18, fontWeight: "900", marginVertical: 2 },
  playerStats: { color: "#6b7280", fontSize: 11, fontWeight: "bold" },
  miniCircle: { width: 42, height: 42, borderRadius: 21, borderWidth: 2, justifyContent: 'center', alignItems: 'center' },
  miniCircleText: { fontSize: 14, fontWeight: 'bold' },
  controlsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, padding: 15, justifyContent: "center" },
  actionBtn: { backgroundColor: "#1f2937", width: "22.5%", paddingVertical: 15, borderRadius: 12, alignItems: "center" },
  actionBtnText: { color: "#fff", fontSize: 10, fontWeight: "900" },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#111827', width: '92%', padding: 20, borderRadius: 25, borderWidth: 1, borderColor: '#374151' },
  modalTitle: { color: '#06b6d4', fontSize: 20, fontWeight: '900', textAlign: 'center' },
  modalSubtitle: { color: '#9ca3af', fontSize: 12, textAlign: 'center', marginBottom: 15 },
  infoBanner: { backgroundColor: 'rgba(6, 182, 212, 0.1)', padding: 10, borderRadius: 10, marginBottom: 15, borderWidth: 1, borderColor: 'rgba(6, 182, 212, 0.2)' },
  infoText: { color: '#06b6d4', fontSize: 11, textAlign: 'center', fontWeight: 'bold' },
  modalInput: { backgroundColor: '#000', color: '#fff', padding: 15, borderRadius: 12, borderWidth: 1, borderColor: '#06b6d4', fontSize: 18, textAlign: 'center', marginBottom: 20 },
  posLabel: { color: '#6b7280', fontSize: 11, fontWeight: 'bold', marginBottom: 10, textTransform: 'uppercase' },
  posGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginBottom: 25 },
  posBadge: { backgroundColor: '#000', paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10, minWidth: 50, alignItems: 'center', borderWidth: 1, borderColor: '#374151' },
  posBadgeActive: { backgroundColor: '#06b6d4', borderColor: '#fff' },
  posBadgeText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
  modalButtons: { flexDirection: 'row', gap: 12 },
  modalBtn: { flex: 1, paddingVertical: 15, borderRadius: 12, alignItems: 'center' },
  modalBtnTextCancel: { color: '#ef4444', fontWeight: 'bold', fontSize: 13 },
  modalBtnTextConfirm: { color: '#000', fontWeight: 'bold', fontSize: 13 },
  inningOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  inningCard: {
    backgroundColor: '#111827',
    padding: 30,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#06b6d4',
    alignItems: 'center',
    width: width * 0.8,
    shadowColor: "#06b6d4",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 15,
    elevation: 20,
  },
  inningCardSub: { color: '#9ca3af', fontSize: 12, fontWeight: 'bold', letterSpacing: 2 },
  inningCardMain: { color: '#fff', fontSize: 32, fontWeight: '900', marginVertical: 10, textAlign: 'center' },
  inningCardDivider: { width: '100%', height: 1, backgroundColor: '#374151', marginVertical: 15 },
  inningCardTeams: { color: '#06b6d4', fontSize: 16, fontWeight: 'bold' },
});
