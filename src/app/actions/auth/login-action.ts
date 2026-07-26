'use server'

import { createClient } from "@/lib/supabase/server" // Match your exact file structure!
import { log } from "console"
import { redirect } from 'next/navigation'
export async function login(formData: FormData) {
  const supabase = await createClient()

  const email = formData.get('email') as string
  const password = formData.get('password') as string


  // Guard Clause to prevent empty validations
  if (!email || !password) {
    return { error: 'Please enter both an email and password.' }
  }

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return { error: error.message }
  }

  // Return success; client side router will push them to /dashboard cleanly
  redirect('/dashboard/home')
  return { success: true }
}
