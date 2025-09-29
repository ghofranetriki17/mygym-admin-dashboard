// src/pages/Users.jsx
import React, { useEffect, useMemo, useState } from "react";
import { usersAPI } from "../services/api";

// Helpers
const ROLES = ["admin", "user"]; // adapte si tu as d’autres rôles (ex: "coach")

const fmtDateTime = (iso) =>
  iso
    ? new Intl.DateTimeFormat("fr-FR", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(iso))
    : "—";

// Petit composant statut "vérifié"
function VerifiedBadge({ at }) {
  const verified = !!at;
  return (
    <span
      className={[
        "inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full border",
        verified
          ? "text-emerald-600 border-emerald-300 bg-emerald-50 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-800"
          : "text-amber-600 border-amber-300 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800",
      ].join(" ")}
      title={verified ? `Vérifié le ${fmtDateTime(at)}` : "Non vérifié"}
    >
      <span className="inline-block w-2 h-2 rounded-full" style={{ background: verified ? "#10B981" : "#F59E0B" }} />
      {verified ? "Vérifié" : "Non vérifié"}
    </span>
  );
}

// ------- Modale Formulaire (Create / Edit) -------
function UserFormModal({ open, onClose, onSaved, initial }) {
  const isEdit = !!initial?.id;
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    name: "",
    email: "",
    role: "user",
    password: "",
    password_confirmation: "",
  });

  useEffect(() => {
    if (!open) return;
    setError("");
    setSaving(false);
    if (isEdit) {
      setForm({
        name: initial?.name ?? "",
        email: initial?.email ?? "",
        role: initial?.role ?? "user",
        password: "",
        password_confirmation: "",
      });
    } else {
      setForm({
        name: "",
        email: "",
        role: "user",
        password: "",
        password_confirmation: "",
      });
    }
  }, [open, isEdit, initial]);

  const handleChange = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const submit = async (e) => {
    e?.preventDefault?.();
    setSaving(true);
    setError("");
    try {
      const payload = {
        name: (form.name || "").trim(),
        email: (form.email || "").trim(),
        role: form.role,
      };
      // En création: password requis. En édition: on l'envoie uniquement s’il est rempli
      if (isEdit) {
        if (form.password) {
          if (form.password !== form.password_confirmation) {
            setSaving(false);
            return setError("Les mots de passe ne correspondent pas.");
          }
          payload.password = form.password;
          payload.password_confirmation = form.password_confirmation;
        }
        await usersAPI.update(initial.id, payload);
      } else {
        if (!form.password) {
          setSaving(false);
          return setError("Le mot de passe est obligatoire pour la création.");
        }
        if (form.password !== form.password_confirmation) {
          setSaving(false);
          return setError("Les mots de passe ne correspondent pas.");
        }
        payload.password = form.password;
        payload.password_confirmation = form.password_confirmation;
        await usersAPI.create(payload);
      }
      onSaved?.();
      onClose?.();
    } catch (e2) {
      console.error(e2);
      const msg =
        e2?.response?.data?.message ||
        e2?.response?.data?.errors
          ? Object.values(e2.response.data.errors).flat().join(" / ")
          : isEdit
          ? "Échec de la mise à jour."
          : "Échec de la création.";
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white dark:bg-[#0B0B0B] rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xl p-6">
        <div className="flex items-start justify-between">
          <h2 className="text-xl font-bold">{isEdit ? "Modifier l’utilisateur" : "Créer un utilisateur"}</h2>
          <button onClick={onClose} className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800">✕</button>
        </div>

        {error && (
          <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-red-700 text-sm">{error}</div>
        )}

        <form onSubmit={submit} className="mt-4 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Nom</label>
            <input
              className="w-full rounded-lg border p-2 bg-white dark:bg-[#0B0B0B] border-gray-300 dark:border-gray-700"
              value={form.name}
              onChange={(e) => handleChange("name", e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              type="email"
              className="w-full rounded-lg border p-2 bg-white dark:bg-[#0B0B0B] border-gray-300 dark:border-gray-700"
              value={form.email}
              onChange={(e) => handleChange("email", e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Rôle</label>
            <select
              className="w-full rounded-lg border p-2 bg-white dark:bg-[#0B0B0B] border-gray-300 dark:border-gray-700"
              value={form.role}
              onChange={(e) => handleChange("role", e.target.value)}
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          {/* Mot de passe */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                {isEdit ? "Nouveau mot de passe (optionnel)" : "Mot de passe"}
              </label>
              <input
                type="password"
                className="w-full rounded-lg border p-2 bg-white dark:bg-[#0B0B0B] border-gray-300 dark:border-gray-700"
                value={form.password}
                onChange={(e) => handleChange("password", e.target.value)}
                {...(isEdit ? {} : { required: true })}
                minLength={6}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Confirmation</label>
              <input
                type="password"
                className="w-full rounded-lg border p-2 bg-white dark:bg-[#0B0B0B] border-gray-300 dark:border-gray-700"
                value={form.password_confirmation}
                onChange={(e) => handleChange("password_confirmation", e.target.value)}
                {...(isEdit ? {} : { required: true })}
                minLength={6}
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-800"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 rounded-lg text-white hover:opacity-90"
              style={{ backgroundColor: "#FF3B30" }}
            >
              {saving ? (isEdit ? "Mise à jour…" : "Création…") : isEdit ? "Mettre à jour" : "Créer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ------- Page principale -------
export default function Users() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [users, setUsers] = useState([]);
  const [q, setQ] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");

  // tri
  const [sortBy, setSortBy] = useState("created_at");
  const [sortDir, setSortDir] = useState("desc");

  // pagination simple (client)
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);

  // modales
  const [openForm, setOpenForm] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const fetchUsers = async () => {
    setLoading(true);
    setErr("");
    try {
      // On essaye de passer les params; si backend ne gère pas, on filtrera côté client
      const data = await usersAPI.list({ q, role: roleFilter !== "ALL" ? roleFilter : undefined });
      setUsers(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      setErr("Échec du chargement des utilisateurs.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    let arr = [...users];
    // fallback filtre client
    if (roleFilter !== "ALL") {
      arr = arr.filter((u) => (u.role || "").toLowerCase() === roleFilter.toLowerCase());
    }
    if (q.trim()) {
      const needle = q.toLowerCase();
      arr = arr.filter((u) => {
        const name = (u.name || "").toLowerCase();
        const email = (u.email || "").toLowerCase();
        const role = (u.role || "").toLowerCase();
        return name.includes(needle) || email.includes(needle) || role.includes(needle);
      });
    }
    // tri
    arr.sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;
      const va =
        sortBy === "name" ? (a.name || "")
        : sortBy === "email" ? (a.email || "")
        : sortBy === "role" ? (a.role || "")
        : (a.created_at || "");
      const vb =
        sortBy === "name" ? (b.name || "")
        : sortBy === "email" ? (b.email || "")
        : sortBy === "role" ? (b.role || "")
        : (b.created_at || "");
      if (va < vb) return -1 * dir;
      if (va > vb) return 1 * dir;
      return 0;
    });
    return arr;
  }, [users, q, roleFilter, sortBy, sortDir]);

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const pageSafe = Math.min(page, totalPages);
  const paginated = useMemo(() => {
    const start = (pageSafe - 1) * perPage;
    return filtered.slice(start, start + perPage);
  }, [filtered, pageSafe, perPage]);

  const toggleSort = (key) => {
    if (sortBy === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(key);
      setSortDir("asc");
    }
  };

  const onCreate = () => { setEditTarget(null); setOpenForm(true); };
  const onEdit = (u) => { setEditTarget(u); setOpenForm(true); };

  const onDelete = async (u) => {
    const ok = window.confirm(`Supprimer l’utilisateur « ${u.name} » ?`);
    if (!ok) return;
    setDeletingId(u.id);
    try {
      await usersAPI.delete(u.id);
      await fetchUsers();
    } catch (e) {
      console.error(e);
      alert(e?.response?.data?.message || "Échec de la suppression.");
    } finally {
      setDeletingId(null);
    }
  };

  const copyText = async (txt, label = "Texte") => {
    try {
      await navigator.clipboard.writeText(String(txt ?? ""));
      // mini toast
      alert(`${label} copié`);
    } catch {
      alert("Copie impossible.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Utilisateurs</h1>
          <p className="text-gray-500">Gérez les comptes et leurs rôles.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onCreate}
            className="px-3 py-2 rounded-lg text-white"
            style={{ backgroundColor: "#FF3B30" }}
          >
            + Nouvel utilisateur
          </button>
          <button
            onClick={fetchUsers}
            className="px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-800"
          >
            Rafraîchir
          </button>
        </div>
      </div>

      {/* Toolbar: recherche + filtres + page size */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <input
          className="w-full rounded-lg border p-2 bg-white dark:bg-[#0B0B0B] border-gray-300 dark:border-gray-700"
          placeholder="Rechercher nom / email / rôle…"
          value={q}
          onChange={(e) => { setQ(e.target.value); setPage(1); }}
        />
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600 w-24">Rôle</label>
          <select
            className="flex-1 rounded-lg border p-2 bg-white dark:bg-[#0B0B0B] border-gray-300 dark:border-gray-700"
            value={roleFilter}
            onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
          >
            <option value="ALL">Tous</option>
            {ROLES.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600 w-24">Par page</label>
          <select
            className="flex-1 rounded-lg border p-2 bg-white dark:bg-[#0B0B0B] border-gray-300 dark:border-gray-700"
            value={perPage}
            onChange={(e) => { setPerPage(Number(e.target.value)); setPage(1); }}
          >
            {[10, 20, 50, 100].map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Erreur */}
      {err ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-red-700">{err}</div>
      ) : null}

      {/* Table */}
      {loading ? (
        <div className="py-16 text-center text-gray-500">Chargement des utilisateurs…</div>
      ) : (
        <div className="overflow-x-auto border border-gray-200 dark:border-gray-800 rounded-xl">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800/60">
              <tr className="text-left">
                <Th label="ID" onClick={() => toggleSort("id")} active={sortBy === "id"} dir={sortDir} />
                <Th label="Nom" onClick={() => toggleSort("name")} active={sortBy === "name"} dir={sortDir} />
                <Th label="Email" onClick={() => toggleSort("email")} active={sortBy === "email"} dir={sortDir} />
                <Th label="Vérification" />
                <Th label="Rôle" onClick={() => toggleSort("role")} active={sortBy === "role"} dir={sortDir} />
                <Th label="Créé le" onClick={() => toggleSort("created_at")} active={sortBy === "created_at"} dir={sortDir} />
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-gray-500">Aucun résultat</td>
                </tr>
              ) : (
                paginated.map((u) => (
                  <tr key={u.id} className="border-t border-gray-100 dark:border-gray-800">
                    <td className="px-4 py-3 font-mono text-xs">{u.id}</td>
                    <td className="px-4 py-3">{u.name}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span>{u.email}</span>
                        <button
                          className="text-xs px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800"
                          title="Copier l’email"
                          onClick={() => copyText(u.email, "Email")}
                        >
                          Copier
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <VerifiedBadge at={u.email_verified_at} />
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={[
                          "inline-flex items-center px-2 py-1 rounded border text-xs",
                          u.role === "admin"
                            ? "border-brand-400 text-brand-600 bg-brand-50 dark:bg-brand-500/10 dark:text-brand-300 dark:border-brand-800"
                            : "border-gray-300 text-gray-600 bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700",
                        ].join(" ")}
                      >
                        {u.role || "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3">{fmtDateTime(u.created_at)}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <button
                          className="px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800"
                          onClick={() => onEdit(u)}
                        >
                          Éditer
                        </button>
                        <button
                          className="px-3 py-1.5 rounded-lg bg-red-600 text-white hover:opacity-90 disabled:opacity-60"
                          onClick={() => onDelete(u)}
                          disabled={deletingId === u.id}
                        >
                          {deletingId === u.id ? "Suppression…" : "Supprimer"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-500">
          {total === 0
            ? "0 élément"
            : `${(pageSafe - 1) * perPage + 1}–${Math.min(pageSafe * perPage, total)} sur ${total}`}
        </div>
        <div className="flex items-center gap-2">
          <button
            className="px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 disabled:opacity-50"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={pageSafe <= 1}
          >
            ◀ Précédent
          </button>
          <span className="text-sm">
            Page {pageSafe} / {totalPages}
          </span>
          <button
            className="px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 disabled:opacity-50"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={pageSafe >= totalPages}
          >
            Suivant ▶
          </button>
        </div>
      </div>

      {/* Modale Create/Edit */}
      <UserFormModal
        open={openForm}
        onClose={() => setOpenForm(false)}
        onSaved={fetchUsers}
        initial={editTarget || undefined}
      />
    </div>
  );
}

function Th({ label, onClick, active, dir }) {
  return (
    <th className="px-4 py-3 select-none">
      <button
        type="button"
        onClick={onClick}
        className="inline-flex items-center gap-1 hover:underline"
        title={onClick ? "Cliquer pour trier" : undefined}
      >
        <span>{label}</span>
        {onClick ? (
          <span className="text-xs opacity-70">{active ? (dir === "asc" ? "▲" : "▼") : "↕"}</span>
        ) : null}
      </button>
    </th>
  );
}
