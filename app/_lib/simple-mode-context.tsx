"use client";

import React, { createContext, useContext, useState } from "react";

interface SimpleModeContextValue {
  isSimpleMode: boolean;
  toggleSimpleMode: () => void;
  setIsSimpleMode: React.Dispatch<React.SetStateAction<boolean>>;
}

const SimpleModeContext = createContext<SimpleModeContextValue>({
  isSimpleMode: false,
  toggleSimpleMode: () => {},
  setIsSimpleMode: () => {},
});

export function SimpleModeProvider({ children }: { children: React.ReactNode }) {
  const [isSimpleMode, setIsSimpleMode] = useState(false);
  const toggleSimpleMode = () => setIsSimpleMode((prev) => !prev);

  return (
    <SimpleModeContext.Provider value={{ isSimpleMode, toggleSimpleMode, setIsSimpleMode }}>
      {children}
    </SimpleModeContext.Provider>
  );
}

export function useSimpleMode() {
  return useContext(SimpleModeContext);
}
