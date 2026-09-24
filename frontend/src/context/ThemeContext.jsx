import { createContext,useContext,useEffect,useState } from 'react'

const ThemeContext=createContext(null)
const palettes={
  violet:{accent:'#7c5cff',accent2:'#21d4a3'},
  ocean:{accent:'#3b82f6',accent2:'#22d3ee'},
  emerald:{accent:'#10b981',accent2:'#84cc16'},
  sunset:{accent:'#f97316',accent2:'#ec4899'}
}

export function ThemeProvider({children}){
  const [mode,setMode]=useState(()=>localStorage.getItem('livepoll_theme_mode')||'system')
  const [accent,setAccent]=useState(()=>localStorage.getItem('livepoll_accent')||'violet')
  useEffect(()=>{
    localStorage.setItem('livepoll_theme_mode',mode)
    const root=document.documentElement
    root.dataset.theme=mode
  },[mode])
  useEffect(()=>{
    localStorage.setItem('livepoll_accent',accent)
    const p=palettes[accent]||palettes.violet
    document.documentElement.style.setProperty('--accent',p.accent)
    document.documentElement.style.setProperty('--accent-2',p.accent2)
  },[accent])
  return <ThemeContext.Provider value={{mode,setMode,accent,setAccent,palettes}}>{children}</ThemeContext.Provider>
}
export function useTheme(){return useContext(ThemeContext)}
