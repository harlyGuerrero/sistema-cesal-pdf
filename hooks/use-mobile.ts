import * as React from "react"

const MOBILE_BREAKPOINT = 768
const QUERY = `(max-width: ${MOBILE_BREAKPOINT - 1}px)`

function subscribe(onChange: () => void) {
  const mql = window.matchMedia(QUERY)
  mql.addEventListener("change", onChange)
  return () => mql.removeEventListener("change", onChange)
}

// Antes leía window.innerWidth en el estado inicial: en el servidor daba
// false y en un celular true, y el menú lateral se dibujaba distinto en cada
// lado (error de hidratación). useSyncExternalStore usa el valor del
// servidor (false) durante la hidratación y después pasa al real sin error.
export function useIsMobile() {
  return React.useSyncExternalStore(
    subscribe,
    () => window.matchMedia(QUERY).matches,
    () => false
  )
}
