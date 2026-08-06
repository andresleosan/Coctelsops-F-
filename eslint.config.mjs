import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const config = [
  ...nextVitals,
  ...nextTypescript,
  {
    files: ["src/app/layout.tsx"],
    rules: {
      "@next/next/no-page-custom-font": "off",
    },
  },
  {
    rules: {
      // Mantener las reglas de React Compiler fuera del gate hasta migrar estos patrones existentes.
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/static-components": "off",
      "react-hooks/purity": "off",
      "react-hooks/use-memo": "off",
    },
  },
  {
    ignores: ["qa/**", ".tmp/**", ".superpowers/**"],
  },
];

export default config;
