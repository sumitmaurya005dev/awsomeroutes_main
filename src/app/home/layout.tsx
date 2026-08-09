
import AppSidebar from "@/components/dashboard/AppSidebar";
import "../../app/globals.css";
import Navbar from "@/components/dashboard/Navbar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";


export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  
   const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const cookieStore = await cookies()
  const defaultOpen = cookieStore.get("sidebar_state")?.value ==="true"


  if (!user) {
    redirect("/");
  }
  return (
    <div className="flex">
       <SidebarProvider defaultOpen={defaultOpen}>
        <AppSidebar />
        <main className="w-full">
          <Navbar />
          {children}
        </main>
      </SidebarProvider>
       
      </div>
     
  );
}