import { useRouter } from "expo-router";
import { useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
// --- IMPORTACIONES DE CONTEXTO Y AUDIO ---
import { useBaseballContext } from "../context/BaseballContext";
import { useAudio } from "../hooks/useAudio";

// Las 9 posiciones estándar en el orden del Lineup
const POSICIONES_BASE = ["C", "1B", "2B", "3B", "SS", "LF", "CF", "RF", "BD"];

export default function ModalScreen() {
  const router = useRouter();
  const { iniciarJuego }: any = useBaseballContext();
  const { playSound } = useAudio();

  // Estados generales del partido
  const [form, setForm] = useState({
    aN: "", aA: "VIS", aP: "",
    hN: "", hA: "LOC", hP: "",
  });

  // Estados para los Lineups (Arrays de 9 espacios vacíos)
  const [awayLineup, setAwayLineup] = useState(Array(9).fill(""));
  const [homeLineup, setHomeLineup] = useState(Array(9).fill(""));

  // Estados para las Reservas
  const [awayReserva, setAwayReserva] = useState("");
  const [homeReserva, setHomeReserva] = useState("");

  // Manejador dinámico para el Lineup
  const handleLineupChange = (team: string, index: number, value: string) => {
    if (team === 'away') {
      const newL = [...awayLineup];
      newL[index] = value;
      setAwayLineup(newL);
    } else {
      const newL = [...homeLineup];
      newL[index] = value;
      setHomeLineup(newL);
    }
  };

  const handlePlay = async () => {
    if (!form.aA || !form.hA) {
      Alert.alert("Atención", "Por favor ingresa las siglas de los equipos.");
      return;
    }

    // 1. Construir el string del lineup uniendo el nombre escrito con la posición fija
    const awayLineupStr = awayLineup
      .map((name, i) => `${name.trim() || 'JUGADOR ' + (i + 1)}, ${POSICIONES_BASE[i]}`)
      .join('\n');
      
    const homeLineupStr = homeLineup
      .map((name, i) => `${name.trim() || 'JUGADOR ' + (i + 1)}, ${POSICIONES_BASE[i]}`)
      .join('\n');

    // 2. Convertir las reservas (separadas por coma o salto de línea) en un Array
    const parseReservas = (texto: string) => texto.split(/[\n,]+/).map((n: string) => n.trim()).filter((n: string) => n);

    // 3. Iniciar Juego
    iniciarJuego({
      awayAbbr: form.aA.trim().toUpperCase(),
      homeAbbr: form.hA.trim().toUpperCase(),
      awayPitcher: form.aP.trim() || "PITCHER V",
      homePitcher: form.hP.trim() || "PITCHER L",
      awayLineup: awayLineupStr,
      homeLineup: homeLineupStr,
      // Pasamos las reservas para que el Hook las guarde en el historial
      awayReserva: parseReservas(awayReserva),
      homeReserva: parseReservas(homeReserva),
    });

    try {
      playSound('playball');
    } catch (error) {
      console.log("Audio de playball no disponible");
    }

    router.replace('/');
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 50 }}>
      <Text style={styles.title}>CONFIGURAR PARTIDO</Text>

      {/* --- TARJETA EQUIPO VISITANTE --- */}
      <View style={[styles.card, styles.cardAway]}>
        <View style={styles.cardHeader}>
          <Text style={styles.labelAway}>EQUIPO VISITANTE</Text>
          <View style={styles.badgeAway}><Text style={styles.badgeText}>VIS</Text></View>
        </View>

        <TextInput
          style={styles.input}
          placeholder="Nombre del Equipo (Opcional)"
          placeholderTextColor="#4b5563"
          onChangeText={(t) => setForm({ ...form, aN: t })}
        />

        <View style={styles.row}>
          <TextInput
            style={[styles.input, { flex: 0.4 }]}
            placeholder="Siglas"
            maxLength={3}
            placeholderTextColor="#4b5563"
            autoCapitalize="characters"
            value={form.aA}
            onChangeText={(t) => setForm({ ...form, aA: t })}
          />
          <TextInput
            style={[styles.input, { flex: 0.6, marginLeft: 10 }]}
            placeholder="Pitcher Inicial"
            placeholderTextColor="#4b5563"
            onChangeText={(t) => setForm({ ...form, aP: t })}
          />
        </View>

        <View style={styles.divider} />
        <Text style={styles.helperText}>LINEUP TITULAR (9 Bateadores):</Text>
        
        {/* Generador automático de los 9 campos */}
        {POSICIONES_BASE.map((pos, i) => (
          <View key={`away-${i}`} style={styles.lineupRow}>
            <View style={styles.posBadgeContainer}>
              <Text style={styles.posBadgeLabel}>{pos}</Text>
            </View>
            <TextInput
              style={styles.lineupInput}
              placeholder={`Bateador ${i + 1}`}
              placeholderTextColor="#374151"
              autoCapitalize="characters"
              value={awayLineup[i]}
              onChangeText={(t) => handleLineupChange('away', i, t)}
            />
          </View>
        ))}

        <Text style={[styles.helperText, { marginTop: 15 }]}>RESERVAS / ASISTENCIA:</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          multiline
          placeholder="Nombres separados por coma (Ej: Luis, Pedro, Carlos)"
          placeholderTextColor="#4b5563"
          autoCapitalize="characters"
          value={awayReserva}
          onChangeText={setAwayReserva}
        />
      </View>

      <View style={styles.versusContainer}>
        <Text style={styles.versusText}>VS</Text>
      </View>

      {/* --- TARJETA EQUIPO LOCAL --- */}
      <View style={[styles.card, styles.cardHome]}>
        <View style={styles.cardHeader}>
          <Text style={styles.labelHome}>EQUIPO LOCAL</Text>
          <View style={styles.badgeHome}><Text style={styles.badgeText}>LOC</Text></View>
        </View>

        <TextInput
          style={styles.input}
          placeholder="Nombre del Equipo (Opcional)"
          placeholderTextColor="#4b5563"
          onChangeText={(t) => setForm({ ...form, hN: t })}
        />

        <View style={styles.row}>
          <TextInput
            style={[styles.input, { flex: 0.4 }]}
            placeholder="Siglas"
            maxLength={3}
            placeholderTextColor="#4b5563"
            autoCapitalize="characters"
            value={form.hA}
            onChangeText={(t) => setForm({ ...form, hA: t })}
          />
          <TextInput
            style={[styles.input, { flex: 0.6, marginLeft: 10 }]}
            placeholder="Pitcher Inicial"
            placeholderTextColor="#4b5563"
            onChangeText={(t) => setForm({ ...form, hP: t })}
          />
        </View>

        <View style={styles.divider} />
        <Text style={styles.helperText}>LINEUP TITULAR (9 Bateadores):</Text>

        {/* Generador automático de los 9 campos */}
        {POSICIONES_BASE.map((pos, i) => (
          <View key={`home-${i}`} style={styles.lineupRow}>
            <View style={styles.posBadgeContainer}>
              <Text style={styles.posBadgeLabel}>{pos}</Text>
            </View>
            <TextInput
              style={styles.lineupInput}
              placeholder={`Bateador ${i + 1}`}
              placeholderTextColor="#374151"
              autoCapitalize="characters"
              value={homeLineup[i]}
              onChangeText={(t) => handleLineupChange('home', i, t)}
            />
          </View>
        ))}

        <Text style={[styles.helperText, { marginTop: 15 }]}>RESERVAS / ASISTENCIA:</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          multiline
          placeholder="Nombres separados por coma (Ej: Luis, Pedro, Carlos)"
          placeholderTextColor="#4b5563"
          autoCapitalize="characters"
          value={homeReserva}
          onChangeText={setHomeReserva}
        />
      </View>

      <TouchableOpacity style={styles.btn} onPress={handlePlay}>
        <Text style={styles.btnText}>⚾ EMPEZAR JUEGO</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000", padding: 15 },
  title: { color: "#fff", fontSize: 24, fontWeight: "900", textAlign: "center", marginVertical: 20, fontStyle: 'italic' },

  card: {
    backgroundColor: "#111827",
    padding: 15,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#1f2937",
  },
  cardAway: { borderLeftWidth: 6, borderLeftColor: "#ef4444" },
  cardHome: { borderLeftWidth: 6, borderLeftColor: "#06b6d4" },

  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  row: { flexDirection: 'row', width: '100%' },

  labelAway: { color: "#ef4444", fontSize: 16, fontWeight: "900", letterSpacing: 1 },
  labelHome: { color: "#06b6d4", fontSize: 16, fontWeight: "900", letterSpacing: 1 },

  badgeAway: { backgroundColor: '#ef4444', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 5 },
  badgeHome: { backgroundColor: '#06b6d4', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 5 },
  badgeText: { color: '#000', fontSize: 10, fontWeight: 'bold' },

  input: { backgroundColor: "#000", color: "#fff", padding: 12, borderRadius: 10, marginBottom: 10, borderWidth: 1, borderColor: "#1f2937" },
  
  divider: { height: 1, backgroundColor: "#374151", marginVertical: 15 },
  helperText: { color: '#9ca3af', fontSize: 12, marginBottom: 10, fontWeight: 'bold', letterSpacing: 1 },
  
  // Estilos nuevos para las filas de Lineup
  lineupRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  posBadgeContainer: { 
    backgroundColor: '#374151', 
    width: 45, 
    height: 40, 
    justifyContent: 'center', 
    alignItems: 'center',
    borderTopLeftRadius: 8,
    borderBottomLeftRadius: 8,
  },
  posBadgeLabel: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  lineupInput: { 
    flex: 1, 
    backgroundColor: '#000', 
    color: '#fff', 
    height: 40, 
    paddingHorizontal: 15,
    borderTopRightRadius: 8,
    borderBottomRightRadius: 8,
    borderWidth: 1, 
    borderColor: "#1f2937",
    borderLeftWidth: 0,
  },
  
  textArea: { height: 80, textAlignVertical: 'top' },

  versusContainer: { alignItems: 'center', marginVertical: 15 },
  versusText: { color: '#374151', fontSize: 18, fontWeight: "900", fontStyle: 'italic' },

  btn: { backgroundColor: "#06b6d4", padding: 18, borderRadius: 15, alignItems: "center", marginTop: 20, marginBottom: 60, shadowColor: '#06b6d4', elevation: 10 },
  btnText: { color: "#000", fontWeight: "900", fontSize: 18, letterSpacing: 2 },
});