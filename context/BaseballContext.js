import React, { createContext, useContext } from 'react';
import { useBaseball } from '../hooks/useBaseball';

// 🌟 TRUCO: Este comentario le dice a VS Code que este contexto puede contener cualquier cosa (any)
// Esto eliminará los errores de "type 'never'" en todos los archivos donde uses el contexto.
/** @type {React.Context<any>} */
const BaseballContext = createContext(null);

export const BaseballProvider = ({ children }) => {
    const baseball = useBaseball();

    // Usamos el operador spread {...baseball} para asegurarnos de que 
    // cada función (incluyendo relevoPitcher) sea una propiedad directa del value
    return (
        <BaseballContext.Provider value={{ ...baseball }}>
            {children}
        </BaseballContext.Provider>
    );
};

export const useBaseballContext = () => {
    const context = useContext(BaseballContext);
    if (!context) {
        throw new Error("useBaseballContext debe ser usado dentro de un BaseballProvider");
    }
    return context;
};