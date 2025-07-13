import { SignUp } from '@clerk/nextjs'

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-md w-full space-y-8 p-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-bold text-gray-900">
            Join Jo Vibes
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Create your account and start building with AI
          </p>
        </div>
        
        <div className="mt-8 flex justify-center">
          <SignUp 
            appearance={{
              elements: {
                formButtonPrimary: "bg-blue-600 hover:bg-blue-700 text-white",
                card: "shadow-lg",
              },
            }}
            path="/sign-up"
            routing="path"
            signInUrl="/sign-in"
            redirectUrl="/dashboard"
          />
        </div>
      </div>
    </div>
  )
} 