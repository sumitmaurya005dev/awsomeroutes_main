import React from 'react'
import { SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu } from '../ui/sidebar'
import { adminNavigation } from '@/config/dashboard-sidebar/admin'

const AppSidebar = () => {
  return (
    <div>
        <h2>Dashboard sidebar</h2>
       {/* {adminNavigation.map((group) => (
  <div key={group.group}>
    <h2>{group.group}</h2>

    {group.items.map((item) => (
      <div key={item.id}>
        <p>{item.title}</p>

        {item.children?.map((child) => (
          <div key={child.id} className="ml-6">
            {child.title}
          </div>
        ))}
      </div>
    ))}
  </div>
))} */}
    </div>
  )
}

export default AppSidebar
