"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Archive, Download, Eye, EyeOff, FileSpreadsheet, KeyRound, Pencil, Search, ShieldBan, Trash2, UserPlus, X } from "lucide-react";
import { useI18n } from "@/components/LocaleProvider";

interface SchoolClass { id: string; name: string }
interface Student { id: string; firstName: string; lastName: string; username: string; className: string; isActive: boolean; archivedAt: string | null; passwordAvailable: boolean; tests: number; createdAt: string }
interface StudentRow { firstName: string; lastName: string; className: string }
interface Account { student: string; className: string; username: string; temporaryPassword: string }

export function StudentManager({ classes, students }: { classes: SchoolClass[]; students: Student[] }) {
  const router = useRouter();
  const { locale } = useI18n();
  const ui = locale === "uz" ? {
    eyebrow: "Foydalanuvchilar", title: "O‘quvchilar", subtitle: "Akkaunt yarating, saqlangan parollarni ko‘ring va kirishni boshqaring.",
    add: "O‘quvchi qo‘shish", first: "Ism", last: "Familiya", selectClass: "Sinfni tanlang", create: "Akkaunt yaratish", creating: "Yaratilmoqda...",
    import: "Excel yoki CSV importi", importHelp: "Ustunlar: Ism · Familiya · Sinf. Importdan oldin ma’lumotlarni tekshirasiz.", search: "Ism, login yoki sinf bo‘yicha qidirish",
    allClasses: "Barcha sinflar", current: "Joriy", archived: "Arxiv", allStatuses: "Barcha holatlar", student: "O‘quvchi", class: "Sinf", username: "Login", password: "Parol", status: "Holat", tests: "Testlar", actions: "Amallar",
    active: "Faol", blocked: "Bloklangan", archivedStatus: "Arxivda", empty: "Bu filtrlarga mos o‘quvchilar yo‘q.", edit: "Ma’lumotlarni tahrirlash", cancel: "Bekor qilish", save: "Saqlash", saving: "Saqlanmoqda...", downloadAll: "Barcha login va parollar",
  } : {
    eyebrow: "Пользователи", title: "Ученики", subtitle: "Создавайте аккаунты, просматривайте сохранённые пароли и управляйте доступом.",
    add: "Добавить ученика", first: "Имя", last: "Фамилия", selectClass: "Выберите класс", create: "Создать аккаунт", creating: "Создание...",
    import: "Импорт Excel или CSV", importHelp: "Столбцы: Имя · Фамилия · Класс. Перед импортом данные можно проверить.", search: "Поиск по имени, логину или классу",
    allClasses: "Все классы", current: "Текущие", archived: "Архив", allStatuses: "Все статусы", student: "Ученик", class: "Класс", username: "Логин", password: "Пароль", status: "Статус", tests: "Тесты", actions: "Действия",
    active: "Активен", blocked: "Заблокирован", archivedStatus: "В архиве", empty: "Нет учеников по выбранным фильтрам.", edit: "Редактирование данных", cancel: "Отмена", save: "Сохранить", saving: "Сохранение...", downloadAll: "Все логины и пароли",
  };
  const [query, setQuery] = useState("");
  const [classFilter, setClassFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("current");
  const [preview, setPreview] = useState<StudentRow[]>([]);
  const [previewErrors, setPreviewErrors] = useState<string[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, string>>({});
  const [passwordLoadingId, setPasswordLoadingId] = useState<string | null>(null);
  const [editing, setEditing] = useState<Student | null>(null);

  const filtered = useMemo(() => students.filter((student) => {
    const haystack = `${student.firstName} ${student.lastName} ${student.username} ${student.className}`.toLowerCase();
    const statusMatches = statusFilter === "all" || (statusFilter === "archived" ? Boolean(student.archivedAt) : !student.archivedAt);
    return haystack.includes(query.toLowerCase()) && (classFilter === "all" || student.className === classFilter) && statusMatches;
  }), [classFilter, query, statusFilter, students]);

  async function createStudents(rows: StudentRow[]) {
    setPending(true);
    setMessage("");
    const response = await fetch("/api/admin/students", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ rows }) });
    const data = (await response.json()) as { accounts?: Account[]; errors?: Array<{ message: string }>; error?: string };
    setPending(false);
    if (!response.ok) { setMessage(data.error ?? "Something went wrong. Try again."); return; }
    setAccounts(data.accounts ?? []);
    setPreview([]);
    setMessage(`${data.accounts?.length ?? 0} account(s) created. Passwords remain available to the administrator.`);
    router.refresh();
  }

  async function addStudent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    await createStudents([{ firstName: String(form.get("firstName") ?? ""), lastName: String(form.get("lastName") ?? ""), className: String(form.get("className") ?? "") }]);
    formElement.reset();
  }

  async function readFile(file: File) {
    setPreview([]);
    setPreviewErrors([]);
    setMessage("");
    if (file.size > 5 * 1024 * 1024) { setPreviewErrors(["The file is too large. Maximum size is 5 MB."]); return; }
    let rows: string[][];
    if (file.name.toLowerCase().endsWith(".csv")) {
      rows = parseCsv(await file.text());
    } else {
      const excelModule = await import("exceljs");
      const workbook = new excelModule.default.Workbook();
      await workbook.xlsx.load(await file.arrayBuffer());
      const sheet = workbook.worksheets[0];
      rows = [];
      if (sheet) {
        for (let rowIndex = 1; rowIndex <= sheet.rowCount; rowIndex += 1) {
          const row = sheet.getRow(rowIndex);
          const values: string[] = [];
          for (let columnIndex = 1; columnIndex <= Math.max(3, sheet.columnCount); columnIndex += 1) values.push(row.getCell(columnIndex).text.trim());
          rows.push(values);
        }
      }
    }
    if (!rows.length) { setPreviewErrors(["The file is empty."]); return; }
    const headers = rows[0].map((value) => String(value).trim().toLowerCase());
    const firstIndex = headers.findIndex((value) => ["first name", "firstname", "имя"].includes(value));
    const lastIndex = headers.findIndex((value) => ["last name", "lastname", "фамилия"].includes(value));
    const classIndex = headers.findIndex((value) => ["class", "класс"].includes(value));
    if ([firstIndex, lastIndex, classIndex].some((index) => index < 0)) { setPreviewErrors(["Required columns: First Name, Last Name, Class."]); return; }
    const knownClasses = new Set(classes.map((item) => item.name.toUpperCase()));
    const valid: StudentRow[] = [];
    const errors: string[] = [];
    rows.slice(1).forEach((row, rowIndex) => {
      const firstName = String(row[firstIndex] ?? "").trim();
      const lastName = String(row[lastIndex] ?? "").trim();
      const className = String(row[classIndex] ?? "").trim().toUpperCase();
      if (!firstName && !lastName && !className) return;
      if (!firstName || !lastName) errors.push(`Row ${rowIndex + 2}: first and last name are required.`);
      else if (!knownClasses.has(className)) errors.push(`Row ${rowIndex + 2}: class ${className || "is missing"} does not exist.`);
      else valid.push({ firstName, lastName, className });
    });
    setPreview(valid);
    setPreviewErrors(errors);
  }

  async function downloadAccounts() {
    if (!accounts.length) return;
    const excelModule = await import("exceljs");
    const workbook = new excelModule.default.Workbook();
    const sheet = workbook.addWorksheet("Accounts");
    sheet.columns = [
      { header: "Student", key: "student", width: 28 },
      { header: "Class", key: "className", width: 12 },
      { header: "Username", key: "username", width: 24 },
      { header: "Password", key: "temporaryPassword", width: 24 },
    ];
    accounts.forEach((account) => sheet.addRow(account));
    sheet.getRow(1).font = { bold: true };
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([new Uint8Array(buffer)], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "nova-type-accounts.xlsx";
    link.click();
    URL.revokeObjectURL(url);
  }

  async function resetPassword(student: Student) {
    if (!window.confirm(`Reset password for ${student.firstName} ${student.lastName}?`)) return;
    const response = await fetch(`/api/admin/students/${student.id}/reset-password`, { method: "POST" });
    const data = (await response.json()) as { temporaryPassword?: string; error?: string };
    if (!response.ok || !data.temporaryPassword) { setMessage(data.error ?? "Something went wrong. Try again."); return; }
    setAccounts([{ student: `${student.firstName} ${student.lastName}`, className: student.className, username: student.username, temporaryPassword: data.temporaryPassword }]);
    setVisiblePasswords((current) => ({ ...current, [student.id]: data.temporaryPassword as string }));
    setMessage(`Password reset for ${student.username}. The student can continue using it without changing it.`);
    router.refresh();
  }

  async function togglePassword(student: Student) {
    if (visiblePasswords[student.id]) {
      setVisiblePasswords((current) => {
        const next = { ...current };
        delete next[student.id];
        return next;
      });
      return;
    }
    setPasswordLoadingId(student.id);
    setMessage("");
    const response = await fetch(`/api/admin/students/${student.id}/password`, { cache: "no-store" });
    const data = (await response.json()) as { password?: string; error?: string };
    setPasswordLoadingId(null);
    if (!response.ok || !data.password) {
      setMessage(data.error ?? "Something went wrong. Try again.");
      return;
    }
    setVisiblePasswords((current) => ({ ...current, [student.id]: data.password as string }));
  }

  async function toggleStatus(student: Student) {
    const verb = student.isActive ? "block" : "activate";
    if (!window.confirm(`${verb[0].toUpperCase() + verb.slice(1)} ${student.firstName} ${student.lastName}?`)) return;
    const response = await fetch(`/api/admin/students/${student.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isActive: !student.isActive }) });
    if (!response.ok) { setMessage("Something went wrong. Try again."); return; }
    router.refresh();
  }

  async function saveStudent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing) return;
    setPending(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    const response = await fetch(`/api/admin/students/${editing.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        firstName: form.get("firstName"),
        lastName: form.get("lastName"),
        username: form.get("username"),
        className: form.get("className"),
      }),
    });
    const data = (await response.json()) as { error?: string };
    setPending(false);
    if (!response.ok) { setMessage(data.error ?? "Something went wrong. Try again."); return; }
    setEditing(null);
    setMessage("Student details updated.");
    router.refresh();
  }

  async function archiveStudent(student: Student) {
    if (!window.confirm(`Archive ${student.firstName} ${student.lastName}? Their results will be preserved and login will be blocked.`)) return;
    setPending(true);
    setMessage("");
    const response = await fetch(`/api/admin/students/${student.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ archive: true }) });
    const data = (await response.json()) as { error?: string };
    setPending(false);
    if (!response.ok) { setMessage(data.error ?? "Something went wrong. Try again."); return; }
    setMessage("Student archived. Results were preserved.");
    router.refresh();
  }

  async function deleteStudent(student: Student) {
    if (!window.confirm(`Permanently delete ${student.firstName} ${student.lastName}? This is only allowed for accounts without results and cannot be undone.`)) return;
    setPending(true);
    setMessage("");
    const response = await fetch(`/api/admin/students/${student.id}`, { method: "DELETE" });
    const data = (await response.json()) as { error?: string };
    setPending(false);
    if (!response.ok) { setMessage(data.error ?? "Something went wrong. Try again."); return; }
    setMessage("Unused student account deleted.");
    router.refresh();
  }

  return <div>
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs uppercase tracking-[0.18em] text-nova-accent">{ui.eyebrow}</p><h1 className="mt-2 text-3xl font-semibold text-nova-text">{ui.title}</h1><p className="mt-2 text-sm text-nova-muted">{ui.subtitle}</p></div><a className="nova-button-secondary shrink-0" href="/api/admin/accounts/export"><Download size={15} /> {ui.downloadAll}</a></div>
    {message && <div className="mb-5 flex flex-col gap-3 rounded-xl border border-nova-accent/20 bg-nova-accent/5 p-4 text-sm text-nova-text sm:flex-row sm:items-center sm:justify-between"><span>{message}</span>{accounts.length > 0 && <button className="nova-button shrink-0" onClick={downloadAccounts}><Download size={15} /> Download accounts</button>}</div>}
    <div className="mb-8 grid gap-5 lg:grid-cols-2">
      <form onSubmit={addStudent} className="data-card p-5"><div className="mb-5 flex items-center gap-2"><UserPlus size={17} className="text-nova-accent" /><h2 className="font-semibold">{ui.add}</h2></div><div className="grid gap-3 sm:grid-cols-2"><input className="nova-input" name="firstName" placeholder={ui.first} required /><input className="nova-input" name="lastName" placeholder={ui.last} required /><select className="nova-input sm:col-span-2" name="className" required defaultValue=""><option value="" disabled>{ui.selectClass}</option>{classes.map((item) => <option key={item.id} value={item.name}>{item.name}</option>)}</select></div><button className="nova-button mt-4" disabled={pending || !classes.length}>{pending ? ui.creating : ui.create}</button></form>
      <div className="data-card p-5"><div className="mb-3 flex items-center gap-2"><FileSpreadsheet size={17} className="text-nova-accent" /><h2 className="font-semibold">{ui.import}</h2></div><p className="mb-4 text-xs text-nova-muted">{ui.importHelp}</p><input type="file" accept=".xlsx,.csv" onChange={(event) => event.target.files?.[0] && readFile(event.target.files[0])} className="block w-full text-xs text-nova-muted file:mr-3 file:rounded-lg file:border-0 file:bg-white/8 file:px-4 file:py-2 file:text-nova-text" />{(preview.length > 0 || previewErrors.length > 0) && <div className="mt-4 rounded-lg bg-black/15 p-3 text-xs"><div>Found: {preview.length + previewErrors.length} · Valid: <span className="text-emerald-400">{preview.length}</span> · Errors: <span className="text-nova-error">{previewErrors.length}</span></div>{previewErrors.slice(0, 3).map((error) => <div key={error} className="mt-1 text-nova-error">{error}</div>)}{preview.length > 0 && <button className="nova-button mt-3" disabled={pending} onClick={() => createStudents(preview)}>{pending ? "Importing..." : `Import ${preview.length} students`}</button>}</div>}</div>
    </div>
    <div className="mb-4 flex flex-col gap-3 sm:flex-row"><label className="relative flex-1"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-nova-muted" /><input className="nova-input pl-9" placeholder={ui.search} value={query} onChange={(event) => setQuery(event.target.value)} /></label><select className="nova-input sm:w-40" value={classFilter} onChange={(event) => setClassFilter(event.target.value)}><option value="all">{ui.allClasses}</option>{classes.map((item) => <option key={item.id} value={item.name}>{item.name}</option>)}</select><select className="nova-input sm:w-40" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="current">{ui.current}</option><option value="archived">{ui.archived}</option><option value="all">{ui.allStatuses}</option></select></div>
    <div className="data-card overflow-x-auto"><table className="w-full min-w-[1040px] text-left text-sm"><thead className="border-b border-white/6 text-[10px] uppercase tracking-wider text-nova-muted"><tr><th className="p-4">{ui.student}</th><th className="p-4">{ui.class}</th><th className="p-4">{ui.username}</th><th className="p-4">{ui.password}</th><th className="p-4">{ui.status}</th><th className="p-4 text-right">{ui.tests}</th><th className="p-4 text-right">{ui.actions}</th></tr></thead><tbody className="divide-y divide-white/5">{filtered.map((student) => <tr key={student.id}><td className="p-4 font-medium">{student.firstName} {student.lastName}</td><td className="p-4 text-nova-muted">{student.className}</td><td className="p-4 font-mono text-xs text-nova-muted">{student.username}</td><td className="p-4"><button className="flex items-center gap-2 font-mono text-xs text-nova-muted hover:text-nova-text disabled:opacity-50" disabled={passwordLoadingId === student.id || (!student.passwordAvailable && !visiblePasswords[student.id])} onClick={() => togglePassword(student)} title={visiblePasswords[student.id] ? "Hide password" : "Show password"}>{visiblePasswords[student.id] ? <EyeOff size={14} /> : <Eye size={14} />}<span>{passwordLoadingId === student.id ? "..." : visiblePasswords[student.id] ?? (student.passwordAvailable ? "••••••••" : "—")}</span></button></td><td className="p-4"><span className={student.archivedAt ? "text-nova-muted" : student.isActive ? "text-emerald-400" : "text-nova-error"}>{student.archivedAt ? ui.archivedStatus : student.isActive ? ui.active : ui.blocked}</span></td><td className="p-4 text-right text-nova-muted">{student.tests}</td><td className="p-4"><div className="flex justify-end gap-2"><button className="icon-button" title={ui.edit} onClick={() => setEditing(student)}><Pencil size={15} /></button><button className="icon-button" title="Reset password" onClick={() => resetPassword(student)}><KeyRound size={15} /></button><button className="icon-button" title={student.isActive ? ui.blocked : ui.active} onClick={() => toggleStatus(student)}><ShieldBan size={15} /></button>{!student.archivedAt && <button className="icon-button" title={ui.archived} disabled={pending} onClick={() => archiveStudent(student)}><Archive size={15} /></button>}<button className="icon-button" title="Delete" disabled={pending} onClick={() => deleteStudent(student)}><Trash2 size={15} /></button></div></td></tr>)}{filtered.length === 0 && <tr><td colSpan={7} className="p-14 text-center text-nova-muted">{ui.empty}</td></tr>}</tbody></table></div>
    {editing && <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-5" role="dialog" aria-modal="true"><form onSubmit={saveStudent} className="data-card w-full max-w-lg p-6"><div className="mb-5 flex items-center justify-between"><div><p className="text-xs uppercase tracking-[0.18em] text-nova-accent">{ui.student}</p><h2 className="mt-1 text-xl font-semibold">{ui.edit}</h2></div><button type="button" className="icon-button" onClick={() => setEditing(null)} aria-label="Close"><X size={17} /></button></div><div className="grid gap-3 sm:grid-cols-2"><input className="nova-input" name="firstName" defaultValue={editing.firstName} placeholder={ui.first} required /><input className="nova-input" name="lastName" defaultValue={editing.lastName} placeholder={ui.last} required /><input className="nova-input sm:col-span-2" name="username" defaultValue={editing.username} placeholder={ui.username} pattern="[a-zA-Z0-9._-]{3,40}" required /><select className="nova-input sm:col-span-2" name="className" defaultValue={editing.className} required>{classes.map((item) => <option key={item.id} value={item.name}>{item.name}</option>)}</select></div><div className="mt-5 flex justify-end gap-3"><button type="button" className="nova-button-secondary" onClick={() => setEditing(null)}>{ui.cancel}</button><button className="nova-button" disabled={pending}>{pending ? ui.saving : ui.save}</button></div></form></div>}
  </div>;
}

function parseCsv(input: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let value = "";
  let quoted = false;
  for (let index = 0; index < input.length; index += 1) {
    const character = input[index];
    if (character === '"') {
      if (quoted && input[index + 1] === '"') { value += '"'; index += 1; }
      else quoted = !quoted;
    } else if (character === "," && !quoted) {
      row.push(value.trim()); value = "";
    } else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && input[index + 1] === "\n") index += 1;
      row.push(value.trim()); rows.push(row); row = []; value = "";
    } else value += character;
  }
  if (value || row.length) { row.push(value.trim()); rows.push(row); }
  return rows;
}
