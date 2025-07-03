'use client'
import { useState } from 'react'
import { trpc } from '@/trpc/client'
import { useRouter } from 'next/navigation'

export default function NewProjectForm() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const createProject = trpc.project.create.useMutation({
    onSuccess: (proj) => {
      router.push(`/dashboard/projects/${proj.id}`)
    },
  })
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        createProject.mutate({ name, description })
      }}
      className="space-y-4 max-w-md"
    >
      <div>
        <label className="font-medium">Project Name</label>
        <input className="mt-1 w-full border rounded px-3 py-2" required value={name} onChange={(e)=>setName(e.target.value)} />
      </div>
      <div>
        <label className="font-medium">Description</label>
        <textarea className="mt-1 w-full border rounded px-3 py-2" rows={3} value={description} onChange={(e)=>setDescription(e.target.value)} />
      </div>
      <button type="submit" disabled={createProject.isLoading} className="px-4 py-2 bg-primary text-white rounded">
        {createProject.isLoading ? 'Creating...' : 'Create Project'}
      </button>
    </form>
  )
}