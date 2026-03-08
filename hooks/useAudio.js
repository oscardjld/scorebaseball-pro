import { Audio } from 'expo-av';
import { LogBox } from 'react-native';

// Silenciamos el aviso de deprecación para que no ensucie tu consola
LogBox.ignoreLogs(['Expo AV has been deprecated']);

export const useAudio = () => {
    // 1. Mapeo de archivos de audio
    const soundMap = {
        playball: require('../assets/sounds/playball.mp3'),
        hit: require('../assets/sounds/hit.mp3'),
        hr: require('../assets/sounds/hr.mp3'),
        strike: require('../assets/sounds/strike.mp3'),
        strikeout: require('../assets/sounds/strikeout.mp3'),
        out: require('../assets/sounds/out.mp3'),
        tap: require('../assets/sounds/tap.mp3'),
    };

    const playSound = async (type) => {
        // Validación de existencia
        if (!soundMap[type]) {
            console.warn(`⚠️ El sonido tipo "${type}" no está configurado.`);
            return;
        }

        try {
            // Configuración para que suene incluso en modo silencio
            await Audio.setAudioModeAsync({
                playsInSilentModeIOS: true,
                staysActiveInBackground: false,
                shouldDuckAndroid: true,
            });

            // En expo-av se usa createAsync
            const { sound } = await Audio.Sound.createAsync(
                soundMap[type],
                { shouldPlay: true, volume: 1.0 }
            );

            // IMPORTANTE: Liberar la memoria cuando el sonido termine
            sound.setOnPlaybackStatusUpdate((status) => {
                if (status.didJustFinish) {
                    sound.unloadAsync();
                }
            });

            console.log(`🔊 Reproduciendo (expo-av): ${type}`);

        } catch (error) {
            console.log(`❌ ERROR DE AUDIO en "${type}":`, error.message);
        }
    };

    const startBgMusic = async () => { };
    const stopBgMusic = async () => { };

    return { playSound, startBgMusic, stopBgMusic };
};