/**
 * Tweakcn Theme Configuration Engine (Developer / Backend Utility)
 * 
 * You can paste raw Tweakcn CSS output or CSS custom properties here to easily update 
 * the site's theme variables.
 */

export const PRESET_THEMES = [
  {
    name: "Zinc Classic",
    css: `:root {
  --primary: 240 5.9% 10%;
  --primary-foreground: 0 0% 98%;
  --background: 0 0% 100%;
  --foreground: 240 10% 3.9%;
  --card: 0 0% 100%;
  --card-foreground: 240 10% 3.9%;
  --accent: 240 4.8% 95.9%;
  --accent-foreground: 240 5.9% 10%;
  --border: 240 5.9% 90%;
  --ring: 240 5.9% 10%;
  --radius: 0.5rem;
}`,
  },
  {
    name: "Midnight Cyber",
    css: `:root {
  --primary: 263.4 70% 50.4%;
  --primary-foreground: 210 40% 98%;
  --background: 224 71.4% 4.1%;
  --foreground: 210 40% 98%;
  --card: 224 71.4% 6.5%;
  --card-foreground: 210 40% 98%;
  --accent: 215 27.9% 16.9%;
  --accent-foreground: 210 40% 98%;
  --border: 215 27.9% 16.9%;
  --ring: 263.4 70% 50.4%;
  --radius: 0.75rem;
}`,
  },
  {
    name: "Emerald Health",
    css: `:root {
  --primary: 158.1 64.4% 31.6%;
  --primary-foreground: 355.7 100% 97.3%;
  --background: 150 30% 98%;
  --foreground: 160 50% 10%;
  --card: 0 0% 100%;
  --card-foreground: 160 50% 10%;
  --accent: 152 40% 92%;
  --accent-foreground: 158.1 64.4% 31.6%;
  --border: 150 20% 88%;
  --ring: 158.1 64.4% 31.6%;
  --radius: 0.5rem;
}`,
  },
  {
    name: "Rose Dusk",
    css: `:root {
  --primary: 346.8 77.2% 49.8%;
  --primary-foreground: 355.7 100% 97.3%;
  --background: 345 20% 98%;
  --foreground: 345 50% 10%;
  --card: 0 0% 100%;
  --card-foreground: 345 50% 10%;
  --accent: 345 30% 92%;
  --accent-foreground: 346.8 77.2% 49.8%;
  --border: 345 20% 88%;
  --ring: 346.8 77.2% 49.8%;
  --radius: 0.75rem;
}`,
  },
  {
    name: "Oceanic Blue",
    css: `:root {
  --primary: 221.2 83.2% 53.3%;
  --primary-foreground: 210 40% 98%;
  --background: 210 40% 98%;
  --foreground: 222.2 84% 4.9%;
  --card: 0 0% 100%;
  --card-foreground: 222.2 84% 4.9%;
  --accent: 210 40% 93.8%;
  --accent-foreground: 222.2 47.4% 11.2%;
  --border: 214.3 31.8% 91.4%;
  --ring: 221.2 83.2% 53.3%;
  --radius: 0.5rem;
}`,
  },
  {
    name: "Amber Dark",
    css: `:root {
  --primary: 37.7 92.1% 50.2%;
  --primary-foreground: 26 83.3% 14.1%;
  --background: 20 14.3% 4.1%;
  --foreground: 60 9.1% 97.8%;
  --card: 20 14.3% 7.5%;
  --card-foreground: 60 9.1% 97.8%;
  --accent: 12 6.5% 15.1%;
  --accent-foreground: 60 9.1% 97.8%;
  --border: 12 6.5% 15.1%;
  --ring: 37.7 92.1% 50.2%;
  --radius: 0.5rem;
}`,
  },
];

/**
 * Parses raw Tweakcn CSS output and applies declarations to document.documentElement
 */
export function applyTweakcnCSS(rawCSS: string) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;

  const regex = /--([a-zA-Z0-9-]+)\s*:\s*([^;]+);/g;
  let match;
  while ((match = regex.exec(rawCSS)) !== null) {
    const varName = `--${match[1].trim()}`;
    const varValue = match[2].trim();
    root.style.setProperty(varName, varValue);
  }
}
