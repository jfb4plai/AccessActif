export default function TeacherAccessPage({ token }) {
  return <p style={{ color: '#9a958c', padding: 20 }}>Vue enseignant — token: {token?.slice(0, 8)}…</p>
}
