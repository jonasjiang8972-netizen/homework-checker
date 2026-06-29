import React from 'react';

const s: React.CSSProperties = { width: 24, height: 24, strokeWidth: 1.5, stroke: 'currentColor', fill: 'none', strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };

export function IconCamera() {
  return <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" style={s}><path d="M5 7h1a2 2 0 0 0 2-2 1 1 0 0 1 1-1h6a1 1 0 0 1 1 1 2 2 0 0 0 2 2h1a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2z" /><circle cx="12" cy="13" r="3" /></svg>;
}
export function IconHome() {
  return <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" style={s}><path d="M5 12l-2 0l9-9l9 9l-2 0" /><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" /><path d="M9 21v-6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v6" /></svg>;
}
export function IconHistory() {
  return <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" style={s}><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>;
}
export function IconChart() {
  return <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" style={s}><path d="M4 19h16" /><path d="M4 15l4-6l4 2l4-5l4 4" /></svg>;
}
export function IconBook() {
  return <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" style={s}><path d="M3 19a9 9 0 0 1 9 0a9 9 0 0 1 9 0" /><path d="M3 6a9 9 0 0 1 9 0a9 9 0 0 1 9 0" /><path d="M3 6v13" /><path d="M12 6v13" /><path d="M21 6v13" /></svg>;
}
export function IconPencil() {
  return <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" style={s}><path d="M4 20h4l10.5-10.5a2 2 0 0 0-2.83-2.83L4 16v4" /><path d="M13.5 6.5l2.83 2.83" /></svg>;
}
export function IconCheck() {
  return <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" style={s}><polyline points="5 13 9 17 19 7" /></svg>;
}
export function IconX() {
  return <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" style={s}><path d="M18 6l-12 12" /><path d="M6 6l12 12" /></svg>;
}
export function IconArrowRight() {
  return <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" style={s}><polyline points="9 6 15 12 9 18" /></svg>;
}
export function IconSettings() {
  return <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" style={s}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>;
}
export function IconLogout() {
  return <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" style={s}><path d="M14 8V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h7a2 2 0 0 0 2-2v-2" /><path d="M7 12h14l-3-3" /><path d="M18 15l3-3" /></svg>;
}
export function IconRefresh() {
  return <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" style={s}><path d="M21 3v6h-6" /><path d="M3 21v-6h6" /><path d="M21 9a9 9 0 0 0-15-3.7" /><path d="M3 15a9 9 0 0 0 15 3.7" /></svg>;
}
export function IconBrain() {
  return <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" style={s}><path d="M12 4a4 4 0 0 1 3.46 6.07c.97.34 1.7 1.23 1.7 2.28 0 .53-.18 1.02-.48 1.4.88.4 1.48 1.28 1.48 2.31 0 1-.55 1.87-1.36 2.33" /><path d="M12 4a4 4 0 0 0-3.46 6.07c-.97.34-1.7 1.23-1.7 2.28 0 .53.18 1.02.48 1.4-.88.4-1.48 1.28-1.48 2.31 0 1 .55 1.87 1.36 2.33" /><path d="M9 16a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2v-1z" /></svg>;
}
export function IconPlus() {
  return <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" style={s}><path d="M12 5v14" /><path d="M5 12h14" /></svg>;
}
export function IconTarget() {
  return <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" style={s}><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" /></svg>;
}
export function IconAlertTriangle() {
  return <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" style={s}><path d="M12 9v4" /><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><path d="M12 17h.01" /></svg>;
}
export function IconStar() {
  return <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" style={s}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>;
}
export function IconTrash() {
  return <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" style={s}><path d="M3 6h18" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>;
}
export function IconFileText() {
  return <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" style={s}><path d="M14 3v4a1 1 0 0 0 1 1h4" /><path d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2z" /><path d="M9 9h1" /><path d="M9 13h6" /><path d="M9 17h6" /></svg>;
}
export function IconClipboard() {
  return <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" style={s}><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" /><rect x="9" y="3" width="6" height="4" rx="1" /><path d="M9 12l2 2 4-4" /></svg>;
}
export function IconMail() {
  return <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" style={s}><rect x="2" y="4" width="20" height="16" rx="2" /><path d="M22 4l-10 8L2 4" /></svg>;
}
