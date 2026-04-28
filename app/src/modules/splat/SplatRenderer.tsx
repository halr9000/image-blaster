import { useMemo, useRef, forwardRef, useImperativeHandle } from 'react'
import { extend, useThree } from '@react-three/fiber'
import { SplatMesh, SparkRenderer, dyno } from '@sparkjsdev/spark'

const SparkRendererEl = extend(SparkRenderer)
const SplatMeshEl = extend(SplatMesh)

// Vertical fade window as a fraction of the reveal timeline.
// 1.0 means the bottom-most splat finishes fading exactly as the top-most starts;
// values <1 give more overlap, >1 give a sharper top-to-bottom sweep.
const FADE_WINDOW = 0.6

export interface SplatRendererHandle {
  setReveal: (amount: number) => void
}

interface Props {
  url: string
  groundPlaneOffset?: number
}

function makeRevealModifier() {
  const revealFloat = dyno.dynoFloat(1)
  const yMinFloat = dyno.dynoFloat(-1)
  const yMaxFloat = dyno.dynoFloat(1)
  const windowFloat = dyno.dynoFloat(FADE_WINDOW)
  const modifierDyno = dyno.dyno({
    inTypes: {
      gsplat: dyno.Gsplat,
      reveal: 'float' as const,
      yMin: 'float' as const,
      yMax: 'float' as const,
      win: 'float' as const,
    },
    outTypes: { gsplat: dyno.Gsplat },
    inputs: { reveal: revealFloat, yMin: yMinFloat, yMax: yMaxFloat, win: windowFloat },
    statements: ({ inputs, outputs }) => [
      `${outputs.gsplat} = ${inputs.gsplat};`,
      // Local center.y maps to world via a Math.PI X-rotation in the parent group,
      // so larger local Y = lower in world. We want lower-world splats to fade in
      // first, i.e. high-local-Y first. n=0 at low local-Y (top of world),
      // n=1 at high local-Y (bottom of world).
      `float yRange = max(1e-4, ${inputs.yMax} - ${inputs.yMin});`,
      `float n = clamp((${inputs.gsplat}.center.y - ${inputs.yMin}) / yRange, 0.0, 1.0);`,
      `float scaledReveal = ${inputs.reveal} * (1.0 + ${inputs.win});`,
      `float threshold = (1.0 - n) * ${inputs.win};`,
      `float a = clamp(scaledReveal - threshold, 0.0, 1.0);`,
      `${outputs.gsplat}.rgba.a *= a;`,
    ],
  })
  const modifier = dyno.dynoBlock(
    { gsplat: dyno.Gsplat },
    { gsplat: dyno.Gsplat },
    ({ gsplat }) => ({ gsplat: modifierDyno.apply({ gsplat }).gsplat }),
  )
  return { revealFloat, yMinFloat, yMaxFloat, modifier }
}

export const SplatRenderer = forwardRef<SplatRendererHandle, Props>(
  ({ url, groundPlaneOffset = 0 }, ref) => {
    const renderer = useThree((state) => state.gl)
    const splatRef = useRef<SplatMesh>(null)

    const { revealFloat, yMinFloat, yMaxFloat, modifier } = useRef(makeRevealModifier()).current

    useImperativeHandle(ref, () => ({
      setReveal: (amount: number) => {
        revealFloat.value = amount
        splatRef.current?.updateVersion()
      },
    }))

    const sparkArgs = useMemo(() => ({ renderer }), [renderer])
    const splatArgs = useMemo(
      () => ({
        url,
        objectModifier: modifier,
        onLoad: (mesh: SplatMesh) => {
          const box = mesh.getBoundingBox(true)
          if (box.isEmpty()) return
          yMinFloat.value = box.min.y
          yMaxFloat.value = box.max.y
          mesh.updateVersion()
        },
      }),
      // modifier/yMin/yMax are stable — only url triggers a new SplatMesh
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [url],
    )

    return (
      <SparkRendererEl args={[sparkArgs]}>
        <group position={[0, -groundPlaneOffset, 0]} rotation={[Math.PI, 0, 0]}>
          <SplatMeshEl ref={splatRef} args={[splatArgs]} />
        </group>
      </SparkRendererEl>
    )
  },
)
