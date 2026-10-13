import { createFileRoute } from "@tanstack/react-router";
import { LeadsPage } from "./app.leads";

export const Route = createFileRoute("/app/customers")({
  component: CustomersPage,
});

function CustomersPage() {
  return <LeadsPage audience="customers" />;
}
