import Link from "next/link";
import LogoutButton from "./components/LogoutButton";

export default function Home() {
  return (
    <div>
      <Link href={"/specialisci"}>Specialisci</Link>
      <LogoutButton />
    </div>
  );
}
