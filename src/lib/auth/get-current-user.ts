import { createClient } from "../supabase/server";


export async function getCurrentUser(){
    const supabase =await createClient();

    // 1.Get authenticated user

    const{
        data:{user},
        error,
    }= await supabase.auth.getUser();

    if(error || !user){
        return null;
    }
     
    // 2. get profile and role

    const{
        data:profile,
        error:profileError
    }= await supabase
            .from("profiles")
            .select(`id,first_name,last_name,avatar_url,phone,status,role:roles(id,name,slug),role_id`)
            .eq("id",user.id)
            .single();

    if(profileError || !profile || profile.status !== "active" || !profile.role){
        return null
    }
   
   

    return{
        id:user.id,
        email:user.email,

        firstName:profile.first_name,
        lastName:profile.last_name,
        avatar:profile.avatar_url,
        phone:profile.phone,
        role:profile.role,
        roleId: profile.role_id,
    }






}
