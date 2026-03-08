import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    FlatList,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useBaseballContext } from '../context/BaseballContext';

export default function ListaPartidas() {
    const [partidas, setPartidas] = useState([]);
    const { cargarUnaPartida, eliminarPartida } = useBaseballContext();
    const router = useRouter();

    // Cargar la lista desde el almacenamiento local
    const obtenerPartidas = async () => {
        try {
            const res = await AsyncStorage.getItem('@lista_partidas');
            if (res) {
                setPartidas(JSON.parse(res).reverse()); // Reverse para ver la más reciente arriba
            }
        } catch (e) {
            console.log("Error al obtener partidas");
        }
    };

    useEffect(() => {
        obtenerPartidas();
    }, []);

    const handleSeleccion = (item) => {
        Alert.alert(
            "Gestionar Partida",
            `${item.nombre}\nGuardado el: ${item.fecha} a las ${item.hora}`,
            [
                {
                    text: "📂 ABRIR",
                    onPress: () => {
                        cargarUnaPartida(item.payload);
                        router.replace('/');
                    }
                },
                {
                    text: "🗑️ ELIMINAR",
                    style: "destructive",
                    onPress: () => {
                        Alert.alert("Confirmar", "¿Borrar esta partida permanentemente?", [
                            { text: "No" },
                            {
                                text: "Sí, Eliminar",
                                onPress: async () => {
                                    await eliminarPartida(item.id);
                                    obtenerPartidas(); // Refrescar la lista
                                }
                            }
                        ]);
                    }
                },
                { text: "Cancelar", style: "cancel" }
            ]
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()}>
                    <Text style={styles.backText}>← VOLVER</Text>
                </TouchableOpacity>
                <Text style={styles.title}>HISTORIAL</Text>
            </View>

            <FlatList
                data={partidas}
                keyExtractor={(item) => item.id}
                contentContainerStyle={{ padding: 20 }}
                renderItem={({ item }) => (
                    <TouchableOpacity
                        style={styles.card}
                        onPress={() => handleSeleccion(item)}
                    >
                        <View>
                            <Text style={styles.cardName}>{item.nombre}</Text>
                            <Text style={styles.cardDetails}>{item.fecha} • {item.hora}</Text>
                        </View>
                        <Text style={styles.arrow}>〉</Text>
                    </TouchableOpacity>
                )}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyText}>No hay partidas guardadas</Text>
                    </View>
                }
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000' },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#1f2937'
    },
    backText: { color: '#06b6d4', fontWeight: 'bold', marginRight: 20 },
    title: { color: '#fff', fontSize: 18, fontWeight: '900', letterSpacing: 1 },
    card: {
        backgroundColor: '#111827',
        padding: 20,
        borderRadius: 15,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#1f2937',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center'
    },
    cardName: { color: '#fff', fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
    cardDetails: { color: '#6b7280', fontSize: 12 },
    arrow: { color: '#374151', fontSize: 20 },
    emptyContainer: { marginTop: 100, alignItems: 'center' },
    emptyText: { color: '#4b5563', fontSize: 16 }
});