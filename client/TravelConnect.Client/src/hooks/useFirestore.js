import { useState, useEffect, useCallback } from "react";
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  orderBy as fbOrderBy,
  limit as fbLimit,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../services/firebase";

export function useCollection(collectionName, options = {}) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const buildQuery = useCallback(() => {
    let q = collection(db, collectionName);
    const constraints = [];
    if (options.filters) {
      for (const f of options.filters) {
        if (f.value !== undefined && f.value !== null && f.value !== "") {
          constraints.push(where(f.field, f.op || "==", f.value));
        }
      }
    }
    if (options.orderByField) {
      constraints.push(fbOrderBy(options.orderByField, options.orderDir || "desc"));
    }
    if (options.limitTo) {
      constraints.push(fbLimit(options.limitTo));
    }
    return constraints.length > 0 ? query(q, ...constraints) : q;
  }, [collectionName, JSON.stringify(options.filters), options.orderByField, options.orderDir, options.limitTo]);

  useEffect(() => {
    setLoading(true);
    const q = buildQuery();
    const unsub = onSnapshot(
      q,
      (snap) => {
        setData(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoading(false);
        setError(null);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );
    return unsub;
  }, [buildQuery]);

  const add = async (record) => {
    try {
      const now = serverTimestamp();
      const docRef = await addDoc(collection(db, collectionName), {
        ...record,
        createdAt: now,
        updatedAt: now,
      });
      return { success: true, id: docRef.id };
    } catch (err) {
      return { success: false, errors: [err.message] };
    }
  };

  const update = async (id, record) => {
    try {
      await updateDoc(doc(db, collectionName, id), {
        ...record,
        updatedAt: serverTimestamp(),
      });
      return { success: true };
    } catch (err) {
      return { success: false, errors: [err.message] };
    }
  };

  const remove = async (id) => {
    try {
      await deleteDoc(doc(db, collectionName, id));
      return { success: true };
    } catch (err) {
      return { success: false, errors: [err.message] };
    }
  };

  return { data, loading, error, add, update, remove };
}

export function useDocument(collectionName, docId) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!docId) { setLoading(false); return; }
    setLoading(true);
    const unsub = onSnapshot(
      doc(db, collectionName, docId),
      (snap) => {
        setData(snap.exists() ? { id: snap.id, ...snap.data() } : null);
        setLoading(false);
      },
      (err) => { setError(err.message); setLoading(false); }
    );
    return unsub;
  }, [collectionName, docId]);

  const update = async (record) => {
    try {
      await updateDoc(doc(db, collectionName, docId), {
        ...record,
        updatedAt: serverTimestamp(),
      });
      return { success: true };
    } catch (err) {
      return { success: false, errors: [err.message] };
    }
  };

  return { data, loading, error, update };
}
