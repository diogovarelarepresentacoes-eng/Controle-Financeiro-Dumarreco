import { redirect } from "next/navigation";

export default function InboxPage() {
  const mainAppUrl = process.env.NEXT_PUBLIC_MAIN_APP_URL ?? "http://localhost:5173";
  redirect(`${mainAppUrl}/crm/inbox`);
}
