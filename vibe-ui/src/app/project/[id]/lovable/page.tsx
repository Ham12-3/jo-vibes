import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { LovableInterface } from '@/components/lovable-interface'

export default async function LovablePage({ 
  params 
}: { 
  params: { id: string } 
}) {
  const { userId } = await auth()

  if (!userId) {
    redirect('/sign-in')
  }

  return <LovableInterface projectId={params.id} />
} 