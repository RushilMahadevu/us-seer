"use client";

import React, { createContext, useContext, useState } from "react";

interface SimpleModeContextValue {
  isSimpleMode: boolean;
  toggleSimpleMode: () => void;
}

const SimpleModeContext = createContext<SimpleModeContextValue>({
  isSimpleMode: false,
  toggleSimpleMode: () => {},
});

export function SimpleModeProvider({ children }: { children: React.ReactNode }) {
  const [isSimpleMode, setIsSimpleMode] = useState(false);
  const toggleSimpleMode = () => setIsSimpleMode((prev) => !prev);

  return (
    <SimpleModeContext.Provider value={{ isSimpleMode, toggleSimpleMode }}>
      {children}
    </SimpleModeContext.Provider>
  );
}

export function useSimpleMode() {
  return useContext(SimpleModeContext);
}
