// Default export: a single-file React app you can drop into Vite (src/App.jsx)
// It renders a properties table + classify form and talks to your backend.
// Base URL is taken from window.API_URL or ?api=... query param; fallback http://localhost:8080

import React, { useEffect, useMemo, useState } from "react";

export default function App() {
  const apiFromQuery = new URLSearchParams(window.location.search).get("api");
  const API = import.meta.env.VITE_API_URL || "http://localhost:8080";

  const [state, setState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [input, setInput] = useState("");
  const [prediction, setPrediction] = useState(null);
  const [sending, setSending] = useState(false);

  async function getState() {
    const res = await fetch(`${API}/api/state`);
    if (!res.ok) throw new Error(`Failed to load state: ${res.status}`);
    return res.json();
  }
  async function check(properties) {
    const res = await fetch(`${API}/api/check`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ properties }),
    });
    if (!res.ok) throw new Error(`Failed to check: ${res.status}`);
    return res.json();
  }
  async function feedback(input, predicted, correct) {
    const res = await fetch(`${API}/api/feedback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ input, predicted, correct }),
    });
    if (!res.ok) throw new Error(`Failed to send feedback: ${res.status}`);
    return res.json();
  }
  async function train(className, properties) {
    const res = await fetch(`${API}/api/train`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ className, properties }),
    });
    if (!res.ok) throw new Error(`Failed to train: ${res.status}`);
    return res.json();
  }

  async function load() {
    try {
      setLoading(true);
      setError("");
      const data = await getState();
      setState(data);
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const t = setInterval(load, 4000);
    return () => clearInterval(t);
  }, []);

  const allProps = useMemo(() => {
    if (!state) return [];
    const set = new Set([
      ...(state.object1?.properties || []),
      ...(state.object2?.properties || []),
      ...(state.generalClass || []),
      ...(state.noneClass || []),
    ]);
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [state]);

  const inputList = useMemo(() =>
    input
      .split(/[\s,]+/)
      .map((s) => s.trim())
      .filter(Boolean),
  [input]);

  async function onClassify() {
    try {
      setSending(true);
      const res = await check(inputList);
      setPrediction(res.predicted);
    } catch (e) {
      alert(e.message || String(e));
    } finally {
      setSending(false);
    }
  }

  async function onConfirm(correct) {
    if (!prediction) return;
    try {
      setSending(true);
      await feedback(inputList, prediction, correct);
      if (!correct && state) {
        const className = prompt(`Enter correct class name (e.g. "${state.object1.name}" or "${state.object2.name}"):`);
        if (className) {
          await train(className, inputList);
        }
      }
      setInput("");
      setPrediction(null);
      await load();
    } catch (e) {
      alert(e.message || String(e));
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <div className="max-w-5xl mx-auto p-6">
        <header className="mb-6">
          <h1 className="text-2xl font-bold">Self-Learning Classifier — React UI</h1>
          <p className="text-sm text-gray-600">API: <code>{API}</code></p>
        </header>

        {loading && <p>Loading…</p>}
        {error && <p className="text-red-600">{error}</p>}

        {state && (
          <>
            <section className="mb-8">
              <h2 className="text-lg font-semibold mb-2">Properties table</h2>
              <div className="overflow-x-auto border rounded-2xl">
                <table className="min-w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-50">
                      <Th>Property</Th>
                      <Th>{state.object1.name}</Th>
                      <Th>{state.object2.name}</Th>
                      <Th>General</Th>
                      <Th>None</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {allProps.map((p) => (
                      <tr key={p} className="odd:bg-white even:bg-gray-50">
                        <Td className="font-medium">{p}</Td>
                        <Td>{mark(state.object1.properties, p)}</Td>
                        <Td>{mark(state.object2.properties, p)}</Td>
                        <Td>{mark(state.generalClass, p)}</Td>
                        <Td>{mark(state.noneClass, p)}</Td>
                      </tr>
                    ))}
                    {!allProps.length && (
                      <tr>
                        <Td colSpan={5}>No properties yet</Td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-2">Try classify</h2>
              <div className="flex gap-2 items-center">
                <input
                  placeholder="Enter properties separated by spaces or commas"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  className="flex-1 px-3 py-2 border rounded-xl"
                />
                <button onClick={onClassify} disabled={!inputList.length || sending} className="px-4 py-2 rounded-xl border bg-gray-900 text-white disabled:opacity-60">
                  Classify
                </button>
              </div>

              {prediction && (
                <div className="mt-3 p-3 border rounded-2xl">
                  <div className="mb-2">Prediction: <b>{prediction}</b></div>
                  <div className="flex gap-2">
                    <button onClick={() => onConfirm(true)} disabled={sending} className="px-4 py-2 rounded-xl border bg-gray-900 text-white disabled:opacity-60">Yes</button>
                    <button onClick={() => onConfirm(false)} disabled={sending} className="px-4 py-2 rounded-xl border">No</button>
                  </div>
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
}

function Th({ children }) {
  return <th className="text-left px-3 py-2 border-b">{children}</th>;
}
function Td({ children, className = "", ...rest }) {
  return (
    <td className={`px-3 py-2 border-b ${className}`} {...rest}>
      {children}
    </td>
  );
}
function mark(list, prop) {
  return Array.isArray(list) && list.includes(prop) ? "✓" : "";
}
