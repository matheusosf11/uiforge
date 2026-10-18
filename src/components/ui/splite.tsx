'use client'

import { Suspense, lazy } from 'react'
import { Loader2 } from 'lucide-react'

const Spline = lazy(() => import('@splinetool/react-spline'))

interface SplineSceneProps {
  scene: string
  className?: string
}

export function SplineScene({ scene, className }: SplineSceneProps) {
  return (
    <Suspense
      fallback={
        <div className="w-full h-full flex items-center justify-center">
          <Loader2
            aria-hidden="true"
            className="size-6 animate-spin text-neutral-500 motion-reduce:animate-none"
          />
        </div>
      }
    >
      <Spline scene={scene} className={className} />
    </Suspense>
  )
}
