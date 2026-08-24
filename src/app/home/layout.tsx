
import AppSidebar from "@/components/dashboard/AppSidebar";
import "../../app/globals.css";
import Navbar from "@/components/dashboard/Navbar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getCurrentUser } from "@/lib/auth";


export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  
   const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  const currentUser = await getCurrentUser();
  const cookieStore = await cookies()
  const defaultOpen = cookieStore.get("sidebar_state")?.value !== "false";


  if (!user || !currentUser) {
    redirect("/");
  }
  return (
    <div className="flex" >
       <SidebarProvider defaultOpen={defaultOpen}>
        <AppSidebar />
        <main className="w-full p-6" suppressHydrationWarning>
          <Navbar user={currentUser} />
          {children}
        </main>
      </SidebarProvider>
       
      </div>
     
  );
}
