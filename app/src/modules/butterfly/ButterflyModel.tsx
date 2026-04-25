import { forwardRef, useImperativeHandle, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF, useTexture } from '@react-three/drei'
import { SkeletonUtils } from 'three-stdlib'
import * as THREE from 'three'
import { useButterflyStore } from './store'

const GLB_URL = '/butterfly/butterfly-loop.glb'
const TEX_URL = '/butterfly/butterfly.png'

const MODEL_SCALE = 0.25
const SPEED_SMOOTH = 6 // 1/seconds, exponential damping for measured speed

interface Props {
  visible?: boolean
}

export const Butterfly = forwardRef<THREE.Group, Props>(function Butterfly(
  { visible = true },
  ref,
) {
  const { scene, animations } = useGLTF(GLB_URL)
  const [scale] = useState(MODEL_SCALE * (Math.random() * 0.25 + 0.75))
  const texture = useTexture(TEX_URL)

  const groupRef = useRef<THREE.Group>(null)
  useImperativeHandle(ref, () => groupRef.current as THREE.Group)

  const lastPos = useRef(new THREE.Vector3())
  const smoothedSpeed = useRef(0)
  const seededRef = useRef(false)

  const { clone, mixer, speedMul } = useMemo(() => {
    const cloned = SkeletonUtils.clone(scene) as THREE.Group
    const mat = new THREE.MeshStandardMaterial({
      map: texture,
      transparent: true,
      alphaTest: 0.5,
      side: THREE.DoubleSide,
    })
    cloned.traverse((c) => {
      const mesh = c as THREE.Mesh
      if (mesh.isMesh) mesh.material = mat
    })
    const m = new THREE.AnimationMixer(cloned)
    if (animations.length > 0) {
      const clip = animations[0]
      const action = m.clipAction(clip)
      action.setLoop(THREE.LoopRepeat, Infinity)
      action.clampWhenFinished = false
      action.play()
      m.update(Math.random() * clip.duration)
    }
    return { clone: cloned, mixer: m, speedMul: 0.7 + Math.random() * 0.6 }
  }, [scene, animations, texture])

  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05)
    const g = groupRef.current
    if (g) {
      if (!seededRef.current) {
        lastPos.current.copy(g.position)
        seededRef.current = true
      }
      const inst = g.position.distanceTo(lastPos.current) / Math.max(dt, 1e-4)
      lastPos.current.copy(g.position)
      const a = 1 - Math.exp(-SPEED_SMOOTH * dt)
      smoothedSpeed.current += (inst - smoothedSpeed.current) * a
    }

    const p = useButterflyStore.getState()
    const flapMul = p.flapSpeedBase + p.flapSpeedVelScale * smoothedSpeed.current
    mixer.update(dt * speedMul * flapMul)
  })

  return (
    <group ref={groupRef} visible={visible}>
      <group scale={scale} rotation={[Math.PI * .05, Math.PI * .5, 0]}>
        <primitive object={clone} />
      </group>
    </group>
  )
})

useGLTF.preload(GLB_URL)
