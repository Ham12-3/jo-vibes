"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

export type ChartConfig = {
  [k in string]: {
    label?: React.ReactNode
    icon?: React.ComponentType
    color?: string
    theme?: Record<string, string>
  }
}

type ChartContextProps = {
  config: ChartConfig
}

const ChartContext = React.createContext<ChartContextProps | null>(null)

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function useChart() {
  const context = React.useContext(ChartContext)
  if (!context) {
    throw new Error("useChart must be used within a <ChartContainer />")
  }
  return context
}

function ChartContainer({
  className,
  children,
  config,
  ...props
}: React.ComponentProps<"div"> & {
  config: ChartConfig
  children: React.ReactNode
}) {
  return (
    <ChartContext.Provider value={{ config }}>
      <div
        className={cn(
          "flex aspect-video justify-center text-xs",
          className
        )}
        {...props}
      >
        {children}
      </div>
    </ChartContext.Provider>
  )
}

const ChartTooltip = ({ children }: { children?: React.ReactNode }) => (
  <div>{children}</div>
)

function ChartTooltipContent({
  className,
  children,
}: {
  className?: string
  children?: React.ReactNode
}) {
  return (
    <div
      className={cn(
        "border-gray-200 dark:border-gray-700 bg-background rounded-lg border px-2.5 py-1.5 text-xs shadow-xl",
        className
      )}
    >
      {children}
    </div>
  )
}

const ChartLegend = ({ children }: { children?: React.ReactNode }) => (
  <div>{children}</div>
)

function ChartLegendContent({
  className,
  children,
}: {
  className?: string
  children?: React.ReactNode
}) {
  return (
    <div className={cn("flex items-center justify-center gap-4", className)}>
      {children}
    </div>
  )
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const ChartStyle = ({ config }: { id?: string; config: ChartConfig }) => {
  // Simple stub - in a real implementation this would generate CSS
  return null
}

export {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  ChartStyle,
}
