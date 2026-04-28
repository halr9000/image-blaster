import { forwardRef, useEffect, useImperativeHandle } from 'react'
import { useThree, useLoader } from '@react-three/fiber'
import * as THREE from 'three'

export interface EnvironmentMapHandle {
  setIntensity: (amount: number) => void
}

interface Props {
  panoUrl: string
}

export const EnvironmentMap = forwardRef<EnvironmentMapHandle, Props>(
  function EnvironmentMap({ panoUrl }, ref) {
    const texture = useLoader(THREE.TextureLoader, panoUrl)
    const { scene } = useThree()

    useEffect(() => {
      texture.mapping = THREE.EquirectangularReflectionMapping
      texture.colorSpace = THREE.SRGBColorSpace
      scene.environment = texture
      scene.environmentRotation = new THREE.Euler(0, Math.PI / 2, 0)
      return () => {
        if (scene.environment === texture) scene.environment = null
      }
    }, [texture, scene])

    useImperativeHandle(ref, () => ({
      setIntensity: (amount: number) => {
        scene.environmentIntensity = amount
      },
    }))

    return null
  },
)
