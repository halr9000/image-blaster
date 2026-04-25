import { useEffect } from 'react'
import { useControls, button } from 'leva'
import { useDebugStore } from '../store/debug'
import { useButterflyStore } from '../modules/butterfly/store'
import { LEVA_SCHEMA, DEFAULT_PARAMS, type ButterflyParams } from '../modules/butterfly/params'

function dumpButterflyParams() {
  const state = useButterflyStore.getState()
  const out: Record<string, unknown> = {}
  for (const k of Object.keys(DEFAULT_PARAMS) as Array<keyof ButterflyParams>) {
    out[k] = state[k]
  }
  const json = JSON.stringify(out, null, 2)
  // eslint-disable-next-line no-console
  console.log('[butterfly params]\n' + json)
  if (typeof navigator !== 'undefined' && navigator.clipboard) {
    navigator.clipboard.writeText(json).catch(() => {})
  }
}

export function DebugPanel() {
  const setShowColliders = useDebugStore((s) => s.setShowColliders)
  const useButterflyController = useDebugStore((s) => s.useButterflyController)
  const setUseButterflyController = useDebugStore((s) => s.setUseButterflyController)

  useControls({
    showColliders: {
      value: false,
      label: 'Show Colliders',
      onChange: setShowColliders,
    },
    useButterflyController: {
      value: useButterflyController,
      label: 'Butterfly Controller',
      onChange: setUseButterflyController,
    },
  })

  return useButterflyController ? <ButterflyLevaBridge /> : null
}

function ButterflyLevaBridge() {
  const values = useControls({
    'Dump Params (copy JSON)': button(dumpButterflyParams),
    ...LEVA_SCHEMA,
  }) as unknown as ButterflyParams

  useEffect(() => {
    const state = useButterflyStore.getState()
    const keys = Object.keys(DEFAULT_PARAMS) as Array<keyof ButterflyParams>
    for (const k of keys) {
      const v = values[k]
      if (v !== undefined && v !== state[k]) state.setParam(k, v)
    }
  }, [values])

  return null
}
