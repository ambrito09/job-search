import type { Mode } from "@app/shared";

export type Position = {
  id: number;
  title: string;
  description: string;
  location: string;
  mode: Mode;
  status: "OPEN" | "CLOSED";
  createdAt: string;
  company: { id: number; name: string };
};

export type MyApplication = {
  id: number;
  positionId: number;
  message: string | null;
  createdAt: string;
  position: Position;
};

export type MyPosition = Position & { _count: { applications: number } };

export type Applicant = {
  id: number;
  message: string | null;
  createdAt: string;
  candidate: { id: number; name: string; email: string };
};

export type PositionPage = { items: Position[]; total: number; limit: number; offset: number };

export const modeLabels: Record<Mode, string> = { ONSITE: "Presencial", HYBRID: "Híbrido", REMOTE: "Remoto" };
