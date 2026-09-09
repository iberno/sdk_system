import { cn } from '@/lib/utils'

interface SkeletonProps {
  className?: string
  count?: number
}

export function Skeleton({ className, count = 1 }: SkeletonProps) {
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className={cn(
            'animate-pulse rounded-lg bg-stroke dark:bg-strokedark',
            className ?? 'h-4 w-full',
          )}
        />
      ))}
    </>
  )
}
