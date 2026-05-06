import { createContext, useContext, useEffect, useState } from "react";
import { useGetSalon, getGetSalonQueryKey } from "@workspace/api-client-react";

export interface ColorPalette {
  id: string;
  name: string;
  description: string;
  primary: string;
  secondary: string;
  sidebar: string;
  sidebarAccent: string;
  previewColors: [string, string, string];
}

export const PALETTES: ColorPalette[] = [
  {
    id: "rose",
    name: "Rosa Profundo",
    description: "Clássico e feminino",
    primary: "338 60% 38%",
    secondary: "35 70% 58%",
    sidebar: "336 42% 20%",
    sidebarAccent: "336 42% 28%",
    previewColors: ["hsl(338,60%,38%)", "hsl(35,70%,58%)", "hsl(336,42%,20%)"],
  },
  {
    id: "lavender",
    name: "Lavanda",
    description: "Suave e sofisticado",
    primary: "270 55% 42%",
    secondary: "320 45% 62%",
    sidebar: "272 45% 18%",
    sidebarAccent: "272 45% 26%",
    previewColors: ["hsl(270,55%,42%)", "hsl(320,45%,62%)", "hsl(272,45%,18%)"],
  },
  {
    id: "coral",
    name: "Coral & Ouro",
    description: "Vibrante e moderno",
    primary: "12 80% 48%",
    secondary: "42 80% 55%",
    sidebar: "10 55% 20%",
    sidebarAccent: "10 55% 28%",
    previewColors: ["hsl(12,80%,48%)", "hsl(42,80%,55%)", "hsl(10,55%,20%)"],
  },
  {
    id: "emerald",
    name: "Esmeralda",
    description: "Elegante e natural",
    primary: "152 58% 32%",
    secondary: "35 70% 55%",
    sidebar: "155 50% 15%",
    sidebarAccent: "155 50% 22%",
    previewColors: ["hsl(152,58%,32%)", "hsl(35,70%,55%)", "hsl(155,50%,15%)"],
  },
  {
    id: "sapphire",
    name: "Safira",
    description: "Sofisticado e marcante",
    primary: "218 68% 42%",
    secondary: "270 50% 62%",
    sidebar: "220 55% 18%",
    sidebarAccent: "220 55% 26%",
    previewColors: ["hsl(218,68%,42%)", "hsl(270,50%,62%)", "hsl(220,55%,18%)"],
  },
  {
    id: "burgundy",
    name: "Borgonha",
    description: "Luxuoso e atemporal",
    primary: "355 65% 30%",
    secondary: "22 65% 55%",
    sidebar: "355 55% 14%",
    sidebarAccent: "355 55% 22%",
    previewColors: ["hsl(355,65%,30%)", "hsl(22,65%,55%)", "hsl(355,55%,14%)"],
  },
  {
    id: "peach",
    name: "Pêssego",
    description: "Delicado e acolhedor",
    primary: "20 85% 50%",
    secondary: "350 70% 65%",
    sidebar: "18 60% 22%",
    sidebarAccent: "18 60% 30%",
    previewColors: ["hsl(20,85%,50%)", "hsl(350,70%,65%)", "hsl(18,60%,22%)"],
  },
  {
    id: "copper",
    name: "Cobre & Vinho",
    description: "Quente e marcante",
    primary: "25 75% 42%",
    secondary: "350 60% 35%",
    sidebar: "22 55% 18%",
    sidebarAccent: "22 55% 26%",
    previewColors: ["hsl(25,75%,42%)", "hsl(350,60%,35%)", "hsl(22,55%,18%)"],
  },
  {
    id: "champagne",
    name: "Champanhe",
    description: "Elegância dourada",
    primary: "42 65% 40%",
    secondary: "30 80% 62%",
    sidebar: "40 48% 18%",
    sidebarAccent: "40 48% 26%",
    previewColors: ["hsl(42,65%,40%)", "hsl(30,80%,62%)", "hsl(40,48%,18%)"],
  },
  {
    id: "teal",
    name: "Turquesa",
    description: "Refrescante e moderno",
    primary: "175 62% 32%",
    secondary: "320 55% 58%",
    sidebar: "178 50% 14%",
    sidebarAccent: "178 50% 22%",
    previewColors: ["hsl(175,62%,32%)", "hsl(320,55%,58%)", "hsl(178,50%,14%)"],
  },
  {
    id: "nude",
    name: "Nude & Bege",
    description: "Minimalista e chique",
    primary: "30 38% 42%",
    secondary: "15 50% 60%",
    sidebar: "28 30% 20%",
    sidebarAccent: "28 30% 28%",
    previewColors: ["hsl(30,38%,42%)", "hsl(15,50%,60%)", "hsl(28,30%,20%)"],
  },
  {
    id: "midnight",
    name: "Meia-Noite & Ouro",
    description: "Luxo e exclusividade",
    primary: "240 50% 28%",
    secondary: "42 82% 55%",
    sidebar: "240 45% 12%",
    sidebarAccent: "240 45% 20%",
    previewColors: ["hsl(240,50%,28%)", "hsl(42,82%,55%)", "hsl(240,45%,12%)"],
  },
];

// ── helpers ──────────────────────────────────────────────────────────────────

export function hexToHsl(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

export function hslToHex(hslStr: string): string {
  const parts = hslStr.match(/(\d+(?:\.\d+)?)/g);
  if (!parts || parts.length < 3) return "#7c3aed";
  const h = parseFloat(parts[0]) / 360;
  const s = parseFloat(parts[1]) / 100;
  const l = parseFloat(parts[2]) / 100;
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1/6) return p + (q - p) * 6 * t;
    if (t < 1/2) return q;
    if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
    return p;
  };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const r = Math.round(hue2rgb(p, q, h + 1/3) * 255);
  const g = Math.round(hue2rgb(p, q, h) * 255);
  const b = Math.round(hue2rgb(p, q, h - 1/3) * 255);
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

function deriveSidebar(primaryHsl: string, lightness: number): string {
  const parts = primaryHsl.match(/(\d+(?:\.\d+)?)/g);
  if (!parts || parts.length < 3) return `0 0% ${lightness}%`;
  return `${parts[0]} ${Math.min(parseFloat(parts[1]), 55)}% ${lightness}%`;
}

export function buildCustomPalette(primaryHex: string, secondaryHex: string): ColorPalette {
  const primaryHsl = hexToHsl(primaryHex);
  const secondaryHsl = hexToHsl(secondaryHex);
  return {
    id: "custom",
    name: "Personalizado",
    description: "Suas cores únicas",
    primary: primaryHsl,
    secondary: secondaryHsl,
    sidebar: deriveSidebar(primaryHsl, 18),
    sidebarAccent: deriveSidebar(primaryHsl, 26),
    previewColors: [primaryHex, secondaryHex, hslToHex(deriveSidebar(primaryHsl, 18))],
  };
}

export function applyPalette(palette: ColorPalette) {
  const root = document.documentElement;
  root.style.setProperty("--primary", palette.primary);
  root.style.setProperty("--secondary", palette.secondary);
  root.style.setProperty("--accent", palette.secondary);
  root.style.setProperty("--ring", palette.primary);
  root.style.setProperty("--sidebar", palette.sidebar);
  root.style.setProperty("--sidebar-accent", palette.sidebarAccent);
}

// ── Context ───────────────────────────────────────────────────────────────────

interface ThemeContextValue {
  activePaletteId: string;
  palettes: ColorPalette[];
  customPrimaryHex: string;
  customSecondaryHex: string;
  setPalette: (id: string) => void;
  applyAndSaveCustom: (primaryHex: string, secondaryHex: string) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  activePaletteId: "rose",
  palettes: PALETTES,
  customPrimaryHex: "#7c3aed",
  customSecondaryHex: "#f59e0b",
  setPalette: () => {},
  applyAndSaveCustom: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [activePaletteId, setActivePaletteId] = useState("rose");
  const [customPrimaryHex, setCustomPrimaryHex] = useState("#7c3aed");
  const [customSecondaryHex, setCustomSecondaryHex] = useState("#f59e0b");

  const { data: salon } = useGetSalon({
    query: { queryKey: getGetSalonQueryKey(), retry: false }
  });

  useEffect(() => {
    if (!salon) return;

    const savedCustomPrimary = localStorage.getItem("bella_custom_primary");
    const savedCustomSecondary = localStorage.getItem("bella_custom_secondary");
    if (savedCustomPrimary) setCustomPrimaryHex(savedCustomPrimary);
    if (savedCustomSecondary) setCustomSecondaryHex(savedCustomSecondary);

    if (salon.primaryColor) {
      const matched = PALETTES.find(p => p.primary === salon.primaryColor);
      if (matched) {
        setActivePaletteId(matched.id);
        applyPalette(matched);
        return;
      }
      // custom palette stored in DB
      if (salon.primaryColor && !matched) {
        const primHex = hslToHex(salon.primaryColor);
        const secHex = salon.secondaryColor ? hslToHex(salon.secondaryColor) : customSecondaryHex;
        setCustomPrimaryHex(primHex);
        setCustomSecondaryHex(secHex);
        setActivePaletteId("custom");
        applyPalette(buildCustomPalette(primHex, secHex));
        return;
      }
    }

    const savedId = localStorage.getItem("bella_palette") || "rose";
    const saved = PALETTES.find(p => p.id === savedId) || PALETTES[0];
    setActivePaletteId(saved.id);
    applyPalette(saved);
  }, [salon?.primaryColor, salon?.secondaryColor]);

  useEffect(() => {
    if (salon?.name) {
      document.title = `${salon.name} — Luminee`;
    }
  }, [salon?.name]);

  const setPalette = (id: string) => {
    const palette = PALETTES.find(p => p.id === id);
    if (!palette) return;
    setActivePaletteId(id);
    applyPalette(palette);
    localStorage.setItem("bella_palette", id);
  };

  const applyAndSaveCustom = (primaryHex: string, secondaryHex: string) => {
    const palette = buildCustomPalette(primaryHex, secondaryHex);
    setActivePaletteId("custom");
    setCustomPrimaryHex(primaryHex);
    setCustomSecondaryHex(secondaryHex);
    applyPalette(palette);
    localStorage.setItem("bella_palette", "custom");
    localStorage.setItem("bella_custom_primary", primaryHex);
    localStorage.setItem("bella_custom_secondary", secondaryHex);
  };

  return (
    <ThemeContext.Provider value={{
      activePaletteId, palettes: PALETTES,
      customPrimaryHex, customSecondaryHex,
      setPalette, applyAndSaveCustom
    }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
