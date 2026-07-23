import { createContext } from 'react'

// Fichier séparé du provider : Fast Refresh exige qu'un module n'exporte
// que des composants ou que des non-composants, jamais un mélange.
export const AppCtx = createContext(null)
