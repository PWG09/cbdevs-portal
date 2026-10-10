"use client";

import { useEffect, useMemo, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { getAuthClient, getDbClient } from "@/lib/firebase";
import type { Project } from "@/lib/types";

/**
 * Loads only projects returned by the authenticated user's database queries.
 * Demo fixtures must never be used as a fallback in the client portal.
 */
export function useClientProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [live, setLive] = useState(false);

  useEffect(() => {
    const auth = getAuthClient();
    const db = getDbClient();

    if (!auth || !db) {
      setProjects([]);
      setLoading(false);
      setLive(false);
      return;
    }

    let cleanups: Array<() => void> = [];
    let uidProjects: Project[] = [];
    let emailProjects: Project[] = [];
    let uidLoaded = false;
    let emailLoaded = true;
    let generation = 0;

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      cleanups.forEach((cleanup) => cleanup());
      cleanups = [];
      generation += 1;
      const activeGeneration = generation;
      uidProjects = [];
      emailProjects = [];
      uidLoaded = false;
      emailLoaded = !user?.email;

      setProjects([]);
      setLoading(Boolean(user));
      setLive(false);

      if (!user) {
        setLoading(false);
        return;
      }

      const sync = () => {
        if (activeGeneration !== generation) return;

        const unique = new Map<string, Project>();
        for (const project of [...uidProjects, ...emailProjects]) {
          unique.set(project.id, project);
        }

        setProjects(
          [...unique.values()].sort((a, b) =>
            (a.estimatedDelivery ?? "").localeCompare(b.estimatedDelivery ?? "")
          )
        );
        setLive(uidLoaded && emailLoaded);
        setLoading(!(uidLoaded && emailLoaded));
      };

      cleanups.push(
        onSnapshot(
          query(collection(db, "projects"), where("clientUid", "==", user.uid)),
          (snapshot) => {
            uidProjects = snapshot.docs.map((document) => ({
              id: document.id,
              ...document.data(),
            })) as Project[];
            uidLoaded = true;
            sync();
          },
          (error) => {
            console.error("[Projects] Could not load projects by user ID.", {
              code: error.code,
            });
            uidLoaded = true;
            sync();
          }
        )
      );

      if (user.email) {
        cleanups.push(
          onSnapshot(
            query(collection(db, "projects"), where("clientEmail", "==", user.email)),
            (snapshot) => {
              emailProjects = snapshot.docs.map((document) => ({
                id: document.id,
                ...document.data(),
              })) as Project[];
              emailLoaded = true;
              sync();
            },
            (error) => {
              console.error("[Projects] Could not load projects by account email.", {
                code: error.code,
              });
              emailLoaded = true;
              sync();
            }
          )
        );
      } else {
        sync();
      }
    });

    return () => {
      generation += 1;
      cleanups.forEach((cleanup) => cleanup());
      unsubscribeAuth();
    };
  }, []);

  const currentProject = useMemo(() => projects[0] ?? null, [projects]);

  return { projects, currentProject, loading, live };
}
