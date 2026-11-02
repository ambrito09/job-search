import { QueryClient } from "@tanstack/react-query";
import { expect, test } from "vitest";
import { resetSession, type User } from "./session";

const user = (id: number, name: string): User => ({ id, email: `${name}@x.com`, role: "CANDIDATE", name });

test("resetSession descarta lo cacheado de la cuenta anterior y deja solo la sesión nueva", () => {
  const qc = new QueryClient();
  qc.setQueryData(["me"], user(1, "ana"));
  qc.setQueryData(["myApplications"], [{ id: 1 }]);
  qc.setQueryData(["positions", "q=react"], { items: [] });
  qc.setQueryData(["position", "7"], { id: 7 });

  resetSession(qc, user(2, "luis"));

  expect(qc.getQueryData(["me"])).toEqual(user(2, "luis"));
  expect(qc.getQueryData(["myApplications"])).toBeUndefined();
  expect(qc.getQueryData(["positions", "q=react"])).toBeUndefined();
  expect(qc.getQueryData(["position", "7"])).toBeUndefined();
});

test("resetSession(null) (cerrar sesión) deja la sesión en null y vacía el resto", () => {
  const qc = new QueryClient();
  qc.setQueryData(["me"], user(1, "ana"));
  qc.setQueryData(["myApplications"], [{ id: 1 }]);
  resetSession(qc, null);
  expect(qc.getQueryData(["me"])).toBeNull();
  expect(qc.getQueryData(["myApplications"])).toBeUndefined();
});
