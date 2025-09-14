import Link from "next/link";
import LogoutButton from "./components/LogoutButton";
import UserGreetingServer from "./components/UserGreetingServer";
import AuthLinks from "./components/authlinks";

export default function Home() {
  return (
    <div>
      <Link href={"/specialisci"}>Specialisci</Link>
      <LogoutButton />
      <UserGreetingServer />
      <AuthLinks />
    </div>
  );
}
