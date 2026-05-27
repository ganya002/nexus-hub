import GroupSubNav from "@/components/GroupSubNav";

export default function GroupLayout({ children, params }) {
  return (
    <div style={{ maxWidth: 680, margin: "0 auto", padding: "24px 24px 80px" }}>
      <GroupSubNav groupId={params.id} />
      {children}
    </div>
  );
}
