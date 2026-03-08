import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as Speech from 'expo-speech';
import { useEffect, useState } from "react";
import { Alert } from "react-native";

export const useBaseball = () => {
  const initialState = {
    homeScore: 0, awayScore: 0, strikes: 0, balls: 0, outs: 0,
    currentInning: 1, isHomeBatting: false,
    homeInnings: Array(9).fill(0), awayInnings: Array(9).fill(0),
    bases: { first: null, second: null, third: null },
    isGameOver: false,
    reserva: { away: [], home: [] } // <-- AÑADIDO: Estado para las reservas
  };

  const [game, setGame] = useState(initialState);
  const [lineups, setLineups] = useState({ away: [], home: [] });
  const [indices, setIndices] = useState({ away: 0, home: 0 });
  const [statsAcumuladas, setStatsAcumuladas] = useState({ away: [], home: [] });
  const [activePitchers, setActivePitchers] = useState({
    away: { name: "PITCHER V", count: 0, hits: 0, k: 0, bb: 0 },
    home: { name: "PITCHER L", count: 0, hits: 0, k: 0, bb: 0 },
  });
  const [pitchersHistory, setPitchersHistory] = useState([]);
  const [teamAbbr, setTeamAbbr] = useState({ away: "VIS", home: "LOC" });
  const [history, setHistory] = useState([]);
  const [partidasGuardadas, setPartidasGuardadas] = useState([]);

  // --- VOZ ---
  const anunciarBateador = (nombre) => {
    if (!nombre || game.isGameOver) return;
    Speech.stop();
    const nombreLimpio = nombre.split(',')[0].toLowerCase();
    Speech.speak(`Ahora batea: ${nombreLimpio}`, { language: 'es-ES', pitch: 1.0, rate: 0.9 });
  };

  // --- PERSISTENCIA ---
  const persistirTodo = async (g, l, idx, ap, ph, abbr, sa) => {
    try {
      const data = { game: g, lineups: l, indices: idx, activePitchers: ap, pitchersHistory: ph, teamAbbr: abbr, statsAcumuladas: sa };
      await AsyncStorage.setItem("russo_pro_backup", JSON.stringify(data));
    } catch (e) { console.log("Error persistiendo datos", e); }
  };

  // --- EXPORTAR PDF ---
  const exportarPDF = async () => {
    try {
      const generarFilasBateo = (team) => (lineups[team] || []).map(b => `
        <tr>
          <td style="text-align:left;">${b.name} ${b.isSub ? "<b>(S)</b>" : ""}</td>
          <td>${b.pos}</td>
          <td>${b.ab}</td>
          <td>${b.h}</td>
          <td>${b.k}</td>
          <td>${b.avg}</td>
        </tr>
      `).join('');

      const generarFilasPitching = () => {
        const actuales = [
          { ...activePitchers.away, team: teamAbbr.away },
          { ...activePitchers.home, team: teamAbbr.home }
        ];
        const todos = [...pitchersHistory, ...actuales];
        return todos.map(p => `
          <tr>
            <td style="text-align:left;">${p.name}</td>
            <td>${p.team}</td>
            <td>${p.count}</td>
            <td>${p.hits}</td>
            <td>${p.k}</td>
            <td>${p.bb}</td>
          </tr>
        `).join('');
      };

      // --- AÑADIDO: Función para imprimir reservas en el PDF ---
      const generarReserva = (team) => {
        const suplentes = game.reserva?.[team];
        if (!suplentes || suplentes.length === 0) return "";
        return `<div style="font-size: 10px; margin-top: 5px; color: #555;"><b>Reservas/Asistencia:</b> ${suplentes.join(', ')}</div>`;
      };

      const htmlContent = `
        <html>
          <head>
            <style>
              body { font-family: 'Helvetica'; padding: 20px; color: #333; }
              h1 { text-align: center; color: #06b6d4; margin-bottom: 2px; }
              table { width: 100%; border-collapse: collapse; margin-bottom: 5px; }
              th, td { border: 1px solid #ccc; padding: 8px; text-align: center; font-size: 10px; }
              th { background-color: #f2f2f2; font-weight: bold; }
              .section-title { background-color: #334155; color: white; padding: 5px; font-size: 12px; font-weight: bold; margin-top: 15px; }
            </style>
          </head>
          <body>
            <h1>REPORTE DE JUEGO</h1>
            <p align="center"><strong>${teamAbbr.away} vs ${teamAbbr.home}</strong><br/>${new Date().toLocaleString()}</p>
            <table>
              <tr><th>EQUIPO</th>${game.awayInnings.map((_, i) => `<th>${i + 1}</th>`).join('')}<th>R</th></tr>
              <tr><td>${teamAbbr.away}</td>${game.awayInnings.map(r => `<td>${r}</td>`).join('')}<td><strong>${game.awayScore}</strong></td></tr>
              <tr><td>${teamAbbr.home}</td>${game.homeInnings.map(r => `<td>${r}</td>`).join('')}<td><strong>${game.homeScore}</strong></td></tr>
            </table>
            <div class="section-title">LANZADORES</div>
            <table><tr><th>PITCHER</th><th>EQ</th><th>P</th><th>H</th><th>K</th><th>BB</th></tr>${generarFilasPitching()}</table>
            <div class="section-title">BATEO ${teamAbbr.away}</div>
            <table><tr><th>JUGADOR</th><th>POS</th><th>AB</th><th>H</th><th>K</th><th>AVG</th></tr>${generarFilasBateo('away')}</table>
            ${generarReserva('away')}
            <div class="section-title">BATEO ${teamAbbr.home}</div>
            <table><tr><th>JUGADOR</th><th>POS</th><th>AB</th><th>H</th><th>K</th><th>AVG</th></tr>${generarFilasBateo('home')}</table>
            ${generarReserva('home')}
          </body>
        </html>`;

      const { uri } = await Print.printToFileAsync({ html: htmlContent });
      await Sharing.shareAsync(uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf' });
    } catch (e) { Alert.alert("Error", "No se pudo generar el PDF"); }
  };

  // --- LÓGICA DE INNINGS ---
  const handleInningChange = (nG, nL, nIdx) => {
    const isBottom = nG.isHomeBatting;
    if (!isBottom && nG.currentInning >= 9 && nG.homeScore > nG.awayScore) { finalizarJuego(nG, teamAbbr.home); return nG; }
    if (isBottom) {
      if (nG.currentInning >= 9 && nG.homeScore !== nG.awayScore) { finalizarJuego(nG, nG.homeScore > nG.awayScore ? teamAbbr.home : teamAbbr.away); return nG; }
      nG.currentInning++;
      if (nG.currentInning > nG.homeInnings.length) { nG.homeInnings.push(0); nG.awayInnings.push(0); }
    }
    nG.isHomeBatting = !nG.isHomeBatting;
    nG.outs = 0; nG.balls = 0; nG.strikes = 0;
    nG.bases = { first: null, second: null, third: null };
    const nextSide = nG.isHomeBatting ? "home" : "away";
    setTimeout(() => anunciarBateador(nL[nextSide][nIdx[nextSide]].name), 2500);
    return nG;
  };

  const finalizarJuego = (nG, ganador) => {
    const nGFinal = { ...nG, isGameOver: true };
    setGame(nGFinal);
    guardarPartidaNueva(nGFinal);
    Alert.alert("Fin del Juego", `Ganador: ${ganador}\nEl juego se ha guardado en Archivos.`);
  };

  // --- NUEVA FUNCIÓN: SUSTITUIR JUGADOR ---
  const realizarCambioJugador = (indexToReplace, newName, newPos) => {
    // Guardamos el historial antes de cambiar por si el usuario le da a "UNDO"
    setHistory(prev => [...prev, JSON.parse(JSON.stringify({ game, lineups, indices, activePitchers, statsAcumuladas }))]);
    
    const teamToChange = game.isHomeBatting ? "home" : "away";
    const newLineups = { ...lineups };
    
    // Obtenemos al jugador actual para mantener sus estadísticas previas si lo deseas, 
    // pero usualmente un sustituto entra con stats en cero.
    newLineups[teamToChange][indexToReplace] = {
      name: newName.trim().toUpperCase(),
      pos: newPos,
      ab: 0,
      h: 0,
      k: 0,
      avg: ".000",
      isSub: true // Marca para saber que entró de cambio
    };

    // Quitamos al jugador de la lista de reservas si es que estaba ahí
    const nG = { ...game };
    if (nG.reserva[teamToChange]) {
      nG.reserva[teamToChange] = nG.reserva[teamToChange].filter(n => n.toUpperCase() !== newName.trim().toUpperCase());
    }

    setLineups(newLineups);
    setGame(nG);
    persistirTodo(nG, newLineups, indices, activePitchers, pitchersHistory, teamAbbr, statsAcumuladas);
  };

  // --- ACCIÓN PRINCIPAL ---
  const registerAction = (action, playSound = () => { }) => {
    if (game.isGameOver) return;
    setHistory(prev => [...prev, JSON.parse(JSON.stringify({ game, lineups, indices, activePitchers, statsAcumuladas }))]);
    let nG = { ...game }, nIdx = { ...indices }, nL = JSON.parse(JSON.stringify(lineups));
    const pSide = game.isHomeBatting ? "away" : "home", bSide = game.isHomeBatting ? "home" : "away";
    let nP = { ...activePitchers[pSide], count: activePitchers[pSide].count + 1 }, runs = 0;
    const batter = nL[bSide][nIdx[bSide]];

    const moveRunners = (bases, isWalk = false) => {
      let b = { ...nG.bases }; const order = ["first", "second", "third"];
      if (isWalk) {
        if (b.first) { if (b.second) { if (b.third) runs++; b.third = b.second; } b.second = b.first; }
        b.first = { name: batter.name };
      } else {
        ["third", "second", "first"].forEach((pos) => {
          if (b[pos]) { let i = order.indexOf(pos); if (i + bases >= 3) { runs++; b[pos] = null; } else { b[order[i + bases]] = b[pos]; b[pos] = null; } }
        });
        if (bases < 4) b[order[bases - 1]] = { name: batter.name }; else runs++;
      }
      return b;
    };

    let turnoTerminado = false;
    if (action === "ball") { nG.balls++; if (nG.balls >= 4) { nP.bb++; nG.balls = 0; nG.strikes = 0; nG.bases = moveRunners(1, true); turnoTerminado = true; } }
    else if (action === "strike" || action === "k") {
      nG.strikes++;
      if (nG.strikes >= 3 || action === "k") { playSound('strikeout'); nG.balls = 0; nG.strikes = 0; nG.outs++; nP.k++; batter.ab++; batter.k++; turnoTerminado = true; }
      else playSound('strike');
    } else {
      nG.balls = 0; nG.strikes = 0; batter.ab++;
      const hitsMap = { hit: 1, double: 2, triple: 3, hr: 4 };
      if (hitsMap[action]) { nP.hits++; batter.h++; nG.bases = moveRunners(hitsMap[action]); playSound(action === 'hr' ? 'hr' : 'hit'); }
      else { nG.outs++; playSound('out'); }
      batter.avg = (batter.h / (batter.ab || 1)).toFixed(3).replace(/^0/, ""); turnoTerminado = true;
    }

    if (runs > 0) {
      const i = nG.currentInning - 1;
      if (nG.isHomeBatting) { nG.homeScore += runs; nG.homeInnings[i] += runs; } else { nG.awayScore += runs; nG.awayInnings[i] += runs; }
    }
    if (turnoTerminado && !nG.isGameOver) {
      nIdx[bSide] = (nIdx[bSide] + 1) % nL[bSide].length;
      if (nG.outs >= 3) nG = handleInningChange(nG, nL, nIdx); else setTimeout(() => anunciarBateador(nL[bSide][nIdx[bSide]].name), 1000);
    }
    const nAP = { ...activePitchers, [pSide]: nP };
    setGame(nG); setIndices(nIdx); setLineups(nL); setActivePitchers(nAP);
    persistirTodo(nG, nL, nIdx, nAP, pitchersHistory, teamAbbr, statsAcumuladas);
  };

  const limpiarBaseManualmente = (base, sumout = false, playSound = () => { }) => {
    setHistory(prev => [...prev, JSON.parse(JSON.stringify({ game, lineups, indices, activePitchers, statsAcumuladas }))]);
    let nG = { ...game }; nG.bases[base] = null;
    if (sumout) { nG.outs++; playSound('out'); if (nG.outs >= 3) nG = handleInningChange(nG, lineups, indices); }
    setGame(nG); persistirTodo(nG, lineups, indices, activePitchers, pitchersHistory, teamAbbr, statsAcumuladas);
  };

  const relevoPitcher = (newName) => {
    const pSide = game.isHomeBatting ? "away" : "home";
    const nuevoHistorial = [...pitchersHistory, { ...activePitchers[pSide], team: teamAbbr[pSide], finalInning: game.currentInning }];
    const nuevosActivos = { ...activePitchers, [pSide]: { name: newName.toUpperCase(), count: 0, hits: 0, k: 0, bb: 0 } };
    setPitchersHistory(nuevoHistorial); setActivePitchers(nuevosActivos);
    persistirTodo(game, lineups, indices, nuevosActivos, nuevoHistorial, teamAbbr, statsAcumuladas);
  };

  const deshacerJugada = () => {
    if (history.length === 0) return;
    const last = history[history.length - 1];
    setGame(last.game); setLineups(last.lineups); setIndices(last.indices); setActivePitchers(last.activePitchers); setStatsAcumuladas(last.statsAcumuladas || { away: [], home: [] });
    setHistory(prev => prev.slice(0, -1)); persistirTodo(last.game, last.lineups, last.indices, last.activePitchers, pitchersHistory, teamAbbr, last.statsAcumuladas);
  };

  const iniciarJuego = (config) => {
    const parse = (t) => (t || "").split("\n").filter(n => n.trim()).map((line, idx) => {
      const [nombre, posicion] = line.split(",");
      return { name: nombre.trim().toUpperCase(), pos: (posicion || "BD").trim().toUpperCase(), ab: 0, h: 0, k: 0, avg: ".000", orderPos: idx + 1 };
    });
    const newAbbr = { away: (config.awayAbbr || "VIS").toUpperCase(), home: (config.homeAbbr || "LOC").toUpperCase() };
    const newAP = { away: { name: (config.awayPitcher || "PITCHER V").toUpperCase(), count: 0, hits: 0, k: 0, bb: 0 }, home: { name: (config.homePitcher || "PITCHER L").toUpperCase(), count: 0, hits: 0, k: 0, bb: 0 } };
    const newL = { away: parse(config.awayLineup), home: parse(config.homeLineup) };
    
    // --- AÑADIDO: Guardar las reservas que vienen del modal ---
    const newReserva = { 
      away: config.awayReserva || [], 
      home: config.homeReserva || [] 
    };

    const newGameState = { ...initialState, reserva: newReserva };

    setGame(newGameState); setLineups(newL); setIndices({ away: 0, home: 0 }); setActivePitchers(newAP); setTeamAbbr(newAbbr); setPitchersHistory([]); setHistory([]); setStatsAcumuladas({ away: [], home: [] });
    persistirTodo(newGameState, newL, { away: 0, home: 0 }, newAP, [], newAbbr, { away: [], home: [] });
    setTimeout(() => anunciarBateador(newL.away[0].name), 1000);
  };

  const guardarPartidaNueva = async (customGame = null) => {
    try {
      const gToSave = customGame || game;
      const res = await AsyncStorage.getItem('@lista_partidas');
      const lista = res ? JSON.parse(res) : [];
      const entrada = {
        id: Date.now().toString(),
        nombre: `${teamAbbr.away} vs ${teamAbbr.home}`,
        fecha: new Date().toLocaleString(),
        payload: { game: gToSave, lineups, indices, activePitchers, pitchersHistory, teamAbbr, statsAcumuladas }
      };
      lista.push(entrada);
      await AsyncStorage.setItem('@lista_partidas', JSON.stringify(lista));
      setPartidasGuardadas([...lista]);
      if (!customGame) Alert.alert("Éxito", "Partida guardada.");
    } catch (e) { console.log(e); }
  };

  const cargarUnaPartida = async (p) => {
    const datos = p?.payload || p;
    if (!datos || !datos.game) return Alert.alert("Error", "Datos no válidos.");
    try {
      setGame(datos.game); setLineups(datos.lineups); setIndices(datos.indices);
      setActivePitchers(datos.activePitchers); setPitchersHistory(datos.pitchersHistory || []);
      setTeamAbbr(datos.teamAbbr); setStatsAcumuladas(datos.statsAcumuladas || { away: [], home: [] });
      setHistory([]);
      await persistirTodo(datos.game, datos.lineups, datos.indices, datos.activePitchers, datos.pitchersHistory, datos.teamAbbr, datos.statsAcumuladas);
      Alert.alert("Éxito", `Partida: ${p.nombre || (datos.teamAbbr.away + " vs " + datos.teamAbbr.home)}`);
    } catch (e) { Alert.alert("Error", "Fallo al procesar."); }
  };

  const eliminarPartida = async (id) => {
    const res = await AsyncStorage.getItem('@lista_partidas');
    const nuevaLista = (res ? JSON.parse(res) : []).filter(p => p.id !== id);
    await AsyncStorage.setItem('@lista_partidas', JSON.stringify(nuevaLista));
    setPartidasGuardadas(nuevaLista);
  };

  useEffect(() => {
    const cargarTodo = async () => {
      const saved = await AsyncStorage.getItem("russo_pro_backup");
      if (saved) {
        const p = JSON.parse(saved);
        setGame(p.game); setLineups(p.lineups); setIndices(p.indices); setActivePitchers(p.activePitchers);
        setPitchersHistory(p.pitchersHistory || []); setTeamAbbr(p.teamAbbr); setStatsAcumuladas(p.statsAcumuladas || { away: [], home: [] });
      }
      const res = await AsyncStorage.getItem('@lista_partidas');
      if (res) setPartidasGuardadas(JSON.parse(res));
    };
    cargarTodo();
  }, []);

  return { game, lineups, indices, activePitchers, teamAbbr, pitchersHistory, statsAcumuladas, partidasGuardadas, registerAction, iniciarJuego, relevoPitcher, deshacerJugada, guardarPartidaNueva, cargarUnaPartida, eliminarPartida, exportarPDF, anunciarBateador, limpiarBaseManualmente, realizarCambioJugador };
};