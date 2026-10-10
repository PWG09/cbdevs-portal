"use client";

import { useEffect, useMemo, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { getAuthClient, getDbClient } from "@/lib/firebase";
import { mockProjects } from "@/lib/mock-data";
import type { Project } from "@/lib/types";

export function useClientProjects() {
  const [projects, setProjects] = useState<Project[]>(mockProjects.filter(p => p.clientUid === "demo-client"));
  const [loading, setLoading] = useState(true);
  const [live, setLive] = useState(false);

  useEffect(() => {
    const auth = getAuthClient();
    const db = getDbClient();

    if (!auth || !db) {
      setLoading(false);
      return;
    }

    let cleanups: Array<() => void> = [];

    const unsubscribeAuth = onAuthStateChanged(auth, user => {
      cleanups.forEach(cleanup => cleanup());
      cleanups = [];

      if (!user) {
        setProjects([]);
        setLoading(false);
        setLive(false);
        return;
      }

      const byId = new Map<string, Project>();
      const sync = (items: Project[]) => {
        items.forEach(item => byId.set(item.id, item));
        setProjects([...byId.values()].sort((a, b) => a.estimatedDelivery.localeCompare(b.estimatedDelivery)));
        setLive(true);
        setLoading(false);
      };

      cleanups = [
        onSnapshot(
          query(collection(db, "projects"), where("clientUid", "==", user.uid)),
          snap => sync(snap.docs.map(d => ({ id: d.id, ...d.data() })) as Project[]),
          () => {
            setLive(false);
            setLoading(false);
          }
        ),
      ];

      if (user.email) {
        cleanups.push(
          onSnapshot(
            query(collection(db, "projects"), where("clientEmail", "==", user.email)),
            snap => sync(snap.docs.map(d => ({ id: d.id, ...d.data() })) as Project[]),
            () => {
              setLive(false);
              setLoading(false);
            }
          )
        );
      }

    });

    return () => {
      cleanups.forEach(cleanup => cleanup());
      unsubscribeAuth();
    };
  }, []);

  const currentProject = useMemo(() => projects[0] ?? null, [projects]);

  return { projects, currentProject, loading, live };
}

