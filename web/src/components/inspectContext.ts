import { createContext, useContext } from "react";

/** When a page provides this, line ids open beside the answer instead of leaving the page. */
export const InspectContext = createContext<((line: string) => void) | null>(null);
export const useInspect = () => useContext(InspectContext);
