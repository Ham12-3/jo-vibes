'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createTRPCClient, loggerLink, unstable_httpBatchStreamLink } from '@trpc/client'
import { createTRPCContext } from '@trpc/tanstack-react-query'
import { useState } from 'react'

import type { AppRouter } from './root'

// Create the tRPC context
export const { TRPCProvider, useTRPC } = createTRPCContext<AppRouter>()

function getBaseUrl() {
  if (typeof window !== 'undefined') return '' // Browser: use relative URL
  
  // Server-side: use your custom URL or fallbacks
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
  return `http://localhost:${process.env.PORT ?? 3000}`
}

export function TRPCReactProvider(props: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 1000,
      },
    },
  }))

  const [trpcClient] = useState(() =>
    createTRPCClient<AppRouter>({
      links: [
        loggerLink({
          enabled: (op) =>
            process.env.NODE_ENV === 'development' ||
            (op.direction === 'down' && op.result instanceof Error),
        }),
        unstable_httpBatchStreamLink({
          url: `${getBaseUrl()}/api/trpc`,
        }),
      ],
    })
  )

  return (
    <QueryClientProvider client={queryClient}>
      <TRPCProvider trpcClient={trpcClient} queryClient={queryClient}>
        {props.children}
      </TRPCProvider>
    </QueryClientProvider>
  )
}

export type { AppRouter } from './root' 