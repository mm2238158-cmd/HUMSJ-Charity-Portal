import { createFileRoute } from "@tanstack/react-router";
import { NotificationsList } from "@/components/notifications-list";

export const Route = createFileRoute("/app/notifications")({
  component: NotificationsList,
});
