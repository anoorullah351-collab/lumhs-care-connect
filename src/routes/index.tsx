import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Ward Follow-Up — LUMHS Medicine" },
      { name: "description", content: "Medical Ward Follow-Up Tool for LUMHS Jamshoro." },
      { property: "og:title", content: "Ward Follow-Up — LUMHS Medicine" },
      { property: "og:description", content: "Medical Ward Follow-Up Tool for LUMHS Jamshoro." },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <iframe
      src="/ward.html"
      title="Ward Follow-Up"
      style={{
        position: "fixed",
        inset: 0,
        width: "100%",
        height: "100%",
        border: "none",
        background: "#060c1a",
      }}
    />
  );
}
