// "use client"
// import { Home, LogOutIcon, Moon, Settings, Sun, User } from 'lucide-react'
// import Link from 'next/link'
// import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar'

// import { Button } from '@/components/ui/button'
// import {
//   DropdownMenu,
//   DropdownMenuContent,
//   DropdownMenuGroup,
//   DropdownMenuItem,
//   DropdownMenuLabel,
//   DropdownMenuSeparator,
//   DropdownMenuTrigger,
// } from "@/components/ui/dropdown-menu"

// import { useTheme } from 'next-themes'
// import { logoutAction } from '@/actions/auth/logout'
// import { SidebarTrigger } from '../ui/sidebar'



// const Navbar = () => {
//   const { setTheme } = useTheme()
//   return (
//     <nav className='p-4 flex items-center justify-between shadow-sm backdrop-blur'>
//       {/* left Side  */}
//       <SidebarTrigger/>   {/* this button will close the side bar */}

//       {/* right Side */}
      
//       <div className="flex items-center gap-4">
//         <Link href="/home"><Home/></Link>
//         {/* Theme Menu */}


//         <DropdownMenu>
//           <DropdownMenuTrigger render={<Button variant="outline" />}>
//             <Sun className="h-[1.2rem] w-[1.2rem] scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90" />
//             <Moon className="absolute h-[1.2rem] w-[1.2rem] scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0" />
//             <span className="sr-only">Toggle theme</span>
//           </DropdownMenuTrigger>
//           <DropdownMenuContent align="end">
//             <DropdownMenuItem onClick={() => setTheme("light")}>
//               Light
//             </DropdownMenuItem>
//             <DropdownMenuItem onClick={() => setTheme("dark")}>
//               Dark
//             </DropdownMenuItem>
//             <DropdownMenuItem onClick={() => setTheme("system")}>
//               System
//             </DropdownMenuItem>
//           </DropdownMenuContent>
//         </DropdownMenu>

//         {/* UserMenu */}
//         <DropdownMenu>
//           <DropdownMenuTrigger>
//             <Avatar>
//               <AvatarImage src="https://github.com/shadcn.png" />
//               <AvatarFallback>CN</AvatarFallback>
//             </Avatar>
//           </DropdownMenuTrigger>
//           <DropdownMenuContent sideOffset={10}>
//             <DropdownMenuGroup>
//               <DropdownMenuLabel>Account</DropdownMenuLabel>
//               <DropdownMenuItem><User className='h-[1.2rem] w-[1.2rem] mr-2' />Profile</DropdownMenuItem>
//               <DropdownMenuItem><Settings className='h-[1.2rem] w-[1.2rem] mr-2' />Settings</DropdownMenuItem>
//             </DropdownMenuGroup>
//             <DropdownMenuSeparator />
//             <DropdownMenuGroup>
//               <DropdownMenuItem variant='destructive' onClick={logoutAction}><LogOutIcon className='h-[1.2rem] w-[1.2rem] mr-2' />Logout</DropdownMenuItem>
//             </DropdownMenuGroup>
//           </DropdownMenuContent>
//         </DropdownMenu>
//       </div>
//     </nav>
//   )
// }

// export default Navbar


// --------------------------------------------------------new code here------------------------

"use client";

import * as React from "react";
import {
  Home,
  LogOutIcon,
  Moon,
  Settings,
  Sun,
  User,
} from "lucide-react";
import Link from "next/link";
import { useTheme } from "next-themes";

import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Button } from "@/components/ui/button";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { logoutAction } from "@/actions/auth/logout";
import { SidebarTrigger } from "../ui/sidebar";
import { cn } from "@/lib/utils";

const Navbar = () => {
  const { setTheme } = useTheme();

  const [isScrolled, setIsScrolled] = React.useState(false);

  React.useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    window.addEventListener("scroll", handleScroll, {
      passive: true,
    });

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  return (
    <nav
      className={cn(
        // Layout
        "sticky top-3 z-50",
        "mx-3 sm:mx-4 lg:mx-5",
        "flex items-center justify-between",
        "rounded-2xl",
        "border border-primary/25",
        "px-4 py-3",

        // Glass effect
        "text-foreground",
        "backdrop-blur-xl",
        "backdrop-saturate-150",
        "transition-all duration-300 ease-out",

        // Normal state
        !isScrolled && [
          "bg-primary/10",
          "shadow-[0_10px_30px_rgba(0,0,0,0.12)]",
          "dark:shadow-[0_10px_30px_rgba(0,0,0,0.30)]",
        ],

        // Scrolled state
        isScrolled && [
          "bg-primary/15",
          "shadow-[0_18px_45px_rgba(0,0,0,0.20)]",
          "dark:shadow-[0_18px_45px_rgba(0,0,0,0.45)]",
        ]
      )}
    >
      {/* ================================
          LEFT SIDE
      ================================= */}

      <SidebarTrigger
        className={cn(
          "h-9 w-9 rounded-xl",
          "border border-primary/20",
          "bg-primary/10",
          "text-foreground",
          "transition-all duration-200",
          "hover:bg-primary",
          "hover:text-primary-foreground",
          "hover:shadow-md",
          "active:scale-95"
        )}
      />

      {/* ================================
          RIGHT SIDE
      ================================= */}

      <div className="flex items-center gap-2 sm:gap-3">
        {/* HOME */}

        <Link
          href="/home"
          aria-label="Home"
          className={cn(
            "flex h-9 w-9 items-center justify-center",
            "rounded-xl",
            "border border-primary/20",
            "bg-primary/10",
            "text-foreground",
            "transition-all duration-200",
            "hover:bg-primary",
            "hover:text-primary-foreground",
            "hover:shadow-md",
            "hover:scale-105",
            "active:scale-95"
          )}
        >
          <Home className="h-[18px] w-[18px]" />
        </Link>

        {/* ================================
            THEME MENU
        ================================= */}

        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "relative h-9 w-9 rounded-xl",
                  "border border-primary/20",
                  "bg-primary/10",
                  "text-foreground",
                  "transition-all duration-200",
                  "hover:bg-primary",
                  "hover:text-primary-foreground",
                  "hover:shadow-md",
                  "active:scale-95"
                )}
              />
            }
          >
            {/* Light mode icon */}

            <Sun
              className={cn(
                "h-5 w-5",
                "scale-100 rotate-0",
                "transition-all duration-300",
                "dark:scale-0 dark:-rotate-90"
              )}
            />

            {/* Dark mode icon */}

            <Moon
              className={cn(
                "absolute h-5 w-5",
                "scale-0 rotate-90",
                "transition-all duration-300",
                "dark:scale-100 dark:rotate-0"
              )}
            />

            <span className="sr-only">Toggle theme</span>
          </DropdownMenuTrigger>

          <DropdownMenuContent
            align="end"
            sideOffset={8}
            className={cn(
              "w-40 rounded-xl",
              "border-primary/20",
              "bg-background/95",
              "shadow-xl",
              "backdrop-blur-xl"
            )}
          >
            <DropdownMenuItem onClick={() => setTheme("light")}>
              <Sun className="mr-2 h-4 w-4" />
              Light
            </DropdownMenuItem>

            <DropdownMenuItem onClick={() => setTheme("dark")}>
              <Moon className="mr-2 h-4 w-4" />
              Dark
            </DropdownMenuItem>

            <DropdownMenuItem onClick={() => setTheme("system")}>
              <Settings className="mr-2 h-4 w-4" />
              System
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* ================================
            USER MENU
        ================================= */}

        <DropdownMenu>
          <DropdownMenuTrigger
            className={cn(
              "rounded-full outline-none",
              "transition-all duration-200",
              "hover:scale-105",
              "focus-visible:ring-2",
              "focus-visible:ring-primary/40",
              "focus-visible:ring-offset-2"
            )}
          >
            <Avatar
              className={cn(
                "h-9 w-9",
                "border-2 border-primary/30",
                "bg-primary/10",
                "shadow-md",
                "transition-all duration-200",
                "hover:border-primary/60",
                "hover:shadow-lg"
              )}
            >
              <AvatarImage
                src="https://github.com/shadcn.png"
                alt="User"
              />

              <AvatarFallback
                className={cn(
                  "bg-primary",
                  "font-semibold",
                  "text-primary-foreground"
                )}
              >
                CN
              </AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>

          <DropdownMenuContent
            side="bottom"
            sideOffset={10}
            align="end"
            className={cn(
              "w-52 rounded-xl",
              "border-primary/20",
              "bg-background/95",
              "shadow-xl",
              "backdrop-blur-xl"
            )}
          >
            <DropdownMenuGroup>
              <DropdownMenuLabel>
                Account
              </DropdownMenuLabel>

              <DropdownMenuItem>
                <User className="mr-2 h-[1.2rem] w-[1.2rem]" />
                Profile
              </DropdownMenuItem>

              <DropdownMenuItem>
                <Settings className="mr-2 h-[1.2rem] w-[1.2rem]" />
                Settings
              </DropdownMenuItem>
            </DropdownMenuGroup>

            <DropdownMenuSeparator />

            <DropdownMenuGroup>
              <DropdownMenuItem
                variant="destructive"
                onClick={logoutAction}
              >
                <LogOutIcon className="mr-2 h-[1.2rem] w-[1.2rem]" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </nav>
  );
};

export default Navbar;