import React from 'react'
import { notFound } from 'next/navigation'
import { hasPermission } from '@/lib/auth'

const page = async () => {
  if (!(await hasPermission("dashboard.view"))) notFound()
  return (
    <div>
        <h1>main Home Page</h1>
    </div>
  )
}

export default page
