import { describe, expect, it, vi } from 'vitest'
import type * as THREE from 'three'
import { cleanScene, disposeHierarchy } from '../three-cleanup'

/** A minimal Object3D stand-in: a tree node with real traverse/remove semantics. */
function node(opts: { geometry?: object; material?: object } = {}) {
  const self = {
    ...opts,
    children: [] as unknown[],
    parent: null as unknown,
    traverse(callback: (child: unknown) => void) {
      callback(self)
      for (const child of self.children as Array<{ traverse: typeof self.traverse }>) {
        child.traverse(callback)
      }
    },
    remove(child: unknown) {
      const index = self.children.indexOf(child)
      if (index >= 0) self.children.splice(index, 1)
    },
    add(child: { parent?: unknown }) {
      child.parent = self
      self.children.push(child)
    },
  }
  return self
}

const disposable = () => ({ dispose: vi.fn() })
const asObject3D = (value: unknown) => value as THREE.Object3D
const asScene = (value: unknown) => value as THREE.Scene

describe('disposeHierarchy', () => {
  it('disposes every geometry and material in the tree and detaches all children', () => {
    const rootGeometry = disposable()
    const childGeometry = disposable()
    const childMaterial = disposable()
    const grandchildGeometry = disposable()
    const grandchildMaterial = disposable()

    const root = node({ geometry: rootGeometry })
    const child = node({ geometry: childGeometry, material: childMaterial })
    const grandchild = node({ geometry: grandchildGeometry, material: grandchildMaterial })
    root.add(child)
    child.add(grandchild)

    disposeHierarchy(asObject3D(root))

    for (const resource of [
      rootGeometry,
      childGeometry,
      childMaterial,
      grandchildGeometry,
      grandchildMaterial,
    ]) {
      expect(resource.dispose).toHaveBeenCalledTimes(1)
    }
    expect(root.children).toHaveLength(0)
  })

  it('disposes every material of a multi-material mesh', () => {
    const first = disposable()
    const second = disposable()
    const root = node()
    root.add(node({ material: [first, second] }))

    disposeHierarchy(asObject3D(root))

    expect(first.dispose).toHaveBeenCalledTimes(1)
    expect(second.dispose).toHaveBeenCalledTimes(1)
  })

  it('does nothing for null and undefined', () => {
    expect(() => disposeHierarchy(null)).not.toThrow()
    expect(() => disposeHierarchy(undefined)).not.toThrow()
  })

  it('does not throw for a scene-like object that has no children array (partial mock)', () => {
    const traverse = vi.fn()
    expect(() => disposeHierarchy(asObject3D({ traverse }))).not.toThrow()
    expect(traverse).toHaveBeenCalledTimes(1)
  })

  it('does not throw for an object with no traverse method either', () => {
    expect(() => disposeHierarchy(asObject3D({}))).not.toThrow()
    expect(() => disposeHierarchy(asObject3D({ children: [] }))).not.toThrow()
  })

  it('terminates even when remove() does not actually remove the child', () => {
    const noOpRemove = vi.fn()
    const root = { children: [{}, {}, {}], traverse: vi.fn(), remove: noOpRemove }

    expect(() => disposeHierarchy(asObject3D(root))).not.toThrow()
    expect(noOpRemove).toHaveBeenCalledTimes(3)
  })
})

describe('cleanScene', () => {
  it('disposes the scene, clears it, and disposes the renderer', () => {
    const geometry = disposable()
    const scene = Object.assign(node({ geometry }), { clear: vi.fn() })
    const renderer = {
      dispose: vi.fn(),
      forceContextLoss: vi.fn(),
      renderLists: { dispose: vi.fn() },
      domElement: null,
    }

    cleanScene(asScene(scene), renderer as unknown as THREE.WebGLRenderer)

    expect(geometry.dispose).toHaveBeenCalledTimes(1)
    expect(scene.clear).toHaveBeenCalledTimes(1)
    expect(renderer.dispose).toHaveBeenCalledTimes(1)
    expect(renderer.forceContextLoss).toHaveBeenCalledTimes(1)
  })

  it('survives the minimal scene double used by the NebulaCanvas tests', () => {
    const scene = { traverse: vi.fn() }
    const renderer = { dispose: vi.fn() }

    expect(() =>
      cleanScene(asScene(scene), renderer as unknown as THREE.WebGLRenderer)
    ).not.toThrow()
    expect(renderer.dispose).toHaveBeenCalledTimes(1)
  })

  it('accepts a missing scene and a missing renderer', () => {
    expect(() => cleanScene(null, null)).not.toThrow()
    expect(() => cleanScene(undefined, undefined)).not.toThrow()
  })
})
