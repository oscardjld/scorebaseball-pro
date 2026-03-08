import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

// --- ESTA ES LA LÍNEA QUE FALTABA ---
import { useBaseballContext } from "../context/BaseballContext";

export default function RelevoScreen() {
    const router = useRouter();

    // Ahora extraemos los datos del Contexto Global (compartido con index.tsx)
    const { relevoPitcher, game, teamAbbr } = useBaseballContext();
    const [name, setName] = useState("");

    // Determinamos qué equipo está lanzando actualmente para mostrarlo en pantalla
    const pitchingTeam = game.isHomeBatting ? "away" : "home";
    const equipoNombre = teamAbbr[pitchingTeam] || "EQUIPO";

    const handleRelevo = () => {
        if (name.trim().length < 2) return;

        // Ejecutamos la lógica de relevo del contexto
        relevoPitcher(name.trim());

        // Volvemos atrás; al usar Contexto, la pantalla principal ya tendrá el nuevo nombre
        router.back();
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.container}
        >
            <View style={styles.card}>
                <View style={styles.accentBar} />

                <Text style={styles.title}>🔄 CAMBIO DE PITCHER</Text>
                <Text style={styles.subtitle}>NUEVO LANZADOR PARA: {equipoNombre}</Text>

                <TextInput
                    style={styles.input}
                    placeholder="NOMBRE DEL LANZADOR"
                    placeholderTextColor="#4b5563"
                    autoFocus
                    value={name}
                    onChangeText={setName}
                    autoCapitalize="characters"
                />

                <TouchableOpacity
                    style={[styles.btn, { opacity: name.length < 2 ? 0.5 : 1 }]}
                    onPress={handleRelevo}
                    disabled={name.length < 2}
                >
                    <Text style={styles.btnText}>CONFIRMAR RELEVO</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.cancelBtn}
                    onPress={() => router.back()}
                >
                    <Text style={styles.cancelText}>CANCELAR Y VOLVER</Text>
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.95)",
        justifyContent: "center",
        padding: 25,
    },
    card: {
        backgroundColor: "#111827",
        padding: 30,
        borderRadius: 25,
        borderWidth: 1,
        borderColor: "#374151",
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.5,
        shadowRadius: 15,
        elevation: 20,
    },
    accentBar: {
        width: 50,
        height: 4,
        backgroundColor: "#10b981",
        borderRadius: 2,
        marginBottom: 20,
    },
    title: {
        color: "#fff",
        fontSize: 20,
        fontWeight: "900",
        marginBottom: 5,
        letterSpacing: 1,
    },
    subtitle: {
        color: "#06b6d4",
        fontSize: 12,
        fontWeight: "bold",
        marginBottom: 30,
        letterSpacing: 1,
    },
    input: {
        backgroundColor: "#050505",
        color: "#fff",
        padding: 20,
        borderRadius: 15,
        width: "100%",
        marginBottom: 25,
        borderWidth: 1,
        borderColor: "#4b5563",
        textAlign: "center",
        fontSize: 20,
        fontWeight: "bold",
    },
    btn: {
        backgroundColor: "#10b981",
        padding: 20,
        borderRadius: 15,
        width: "100%",
        alignItems: "center",
        shadowColor: "#10b981",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
    },
    btnText: {
        color: "#000",
        fontWeight: "900",
        fontSize: 16,
        letterSpacing: 1,
    },
    cancelBtn: {
        marginTop: 25,
        padding: 10,
    },
    cancelText: {
        color: "#6b7280",
        fontSize: 12,
        fontWeight: "bold",
        letterSpacing: 1,
    },
});
