"use client";

import { createContext, useContext } from "react";

export interface Viewer {
  userId: string;
  email: string;
  /** Staff account allowed into the portal without a client record (UX only; RLS still applies). */
  isGlobalAdmin: boolean;
}

export const ViewerContext = createContext<Viewer | null>(null);

export function useViewer(): Viewer | null {
  return useContext(ViewerContext);
}
