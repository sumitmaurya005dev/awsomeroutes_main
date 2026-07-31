
import "../../app/globals.css";
import AppSidebar from "@/components/dashboard/AppSidebar";
import Navbar from "@/components/dashboard/Navbar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";


export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
   const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }
  return (
    <div className="flex">
       <SidebarProvider>
        <AppSidebar/>
        <main className="w-full">
          <Navbar />
          {children}
        </main>
      </SidebarProvider>
       
      </div>
     
  );
}