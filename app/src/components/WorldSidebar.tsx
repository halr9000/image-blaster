import { useState } from 'react'
import { ArrowSquareOut, Cube, FolderOpenIcon, GlobeSimple, ListIcon, QuestionMarkIcon } from '@phosphor-icons/react'
import { useLocation } from 'wouter'
import type { WorldEntry } from '../types/world'
import { pendingFocusId } from '../modules/camera/cameraFocus'
import { AppButton } from './AppButton'

interface Props {
  worlds: WorldEntry[]
  activeSlug: string
}

function IconTile({
  thumbnailUrl,
  alt,
}: {
  thumbnailUrl?: string
  alt: string
  children: React.ReactNode
}) {
  return (
    <span className="relative w-8 h-8 overflow-hidden rounded-lg bg-white/10 ring-1 ring-white/10 flex-shrink-0">
      {thumbnailUrl && (
        <img
          src={thumbnailUrl}
          alt={alt}
          className="absolute inset-0 w-full h-full object-cover"
        />
      )}
      <span className="absolute inset-0 bg-black/10" />
      <span className="relative z-10 w-full h-full flex items-center justify-center text-white/50 drop-shadow">
        {/* {children} */}
      </span>
    </span>
  )
}

export function WorldSidebar({ worlds, activeSlug }: Props) {
  const [, navigate] = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  const canOpenLocalFolders = import.meta.env.DEV

  const selectWorld = (slug: string) => {
    navigate(`/${slug}`)
    setMenuOpen(false)
  }

  const openWorldFolder = (slug: string) => {
    fetch(`/__open-world-folder?slug=${encodeURIComponent(slug)}`).catch((error) => {
      console.warn(`Could not open world folder for "${slug}".`, error)
    })
  }

  return (
    <aside className="w-full sm:w-56 max-h-[calc(100vh-2rem)] flex flex-col gap-1 whitespace-nowrap text-sm">
      <div className="flex items-center justify-between rounded bg-black/60 px-2 py-1 text-sm font-medium font-mono backdrop-blur-md ring-1 ring-white/10 shadow-2xl flex-shrink-0">
        <AppButton
          onClick={() => setMenuOpen((open) => !open)}
          className="min-w-0 flex-1 gap-2 px-1 truncate font-mono text-white opacity-100 hover:bg-transparent"
          aria-expanded={menuOpen}
        >
          <ListIcon size={16} weight="regular" className="text-white/60 sm:hidden" />
          <span>image-blaster</span>{activeSlug && <span className="text-white/40 sm:hidden md:hidden">/ {activeSlug}</span>}
        </AppButton>
        <a
          href="https://github.com/neilsonnn/image-blaster"
          target="_blank"
          rel="noreferrer"
          className="inline-flex h-7 w-7 items-center justify-center rounded p-1 text-white opacity-80 transition-[background-color,opacity] hover:bg-white/10 hover:opacity-100"
          aria-label="Open image-blaster repository"
        >
          <span className="text-sm leading-none"><QuestionMarkIcon size={16} weight="regular" /></span>
        </a>
      </div>

      <div
        className={`
          flex flex-col gap-1 overflow-y-auto rounded bg-black/60 p-1.5 backdrop-blur-md ring-1 ring-white/10 shadow-2xl
          transition-[opacity,transform,max-height] duration-200 ease-out sm:max-h-[calc(100vh-5rem)] sm:translate-y-0 sm:opacity-100
          ${menuOpen ? 'max-h-[calc(100vh-5rem)] translate-y-0 opacity-100' : 'max-h-0 -translate-y-2 opacity-0 pointer-events-none sm:pointer-events-auto'}
        `}
      >
        {worlds.map(({ slug, world, objectAssets }) => {
          const isActive = slug === activeSlug
          const name = world.display_name || slug
          return (
            <div key={slug} className="rounded">
              <div
                className={`
                  flex items-center gap-1 rounded
                  ${isActive ? 'border-white/50 bg-white/20' : ''}
                `}
              >
                <AppButton
                  onClick={() => selectWorld(slug)}
                  active={isActive}
                  className={`
                    min-w-0 flex flex-1 items-center gap-2 rounded px-2 py-1.5 text-left
                    ${isActive ? 'hover:bg-transparent' : ''}
                  `}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block text-white text-sm font-medium leading-tight truncate">{name}</span>
                  </span>
                </AppButton>
                {canOpenLocalFolders && isActive && (
                  <AppButton
                    onClick={() => openWorldFolder(slug)}
                    className="h-8 w-8 flex-shrink-0 justify-center text-white"
                    aria-label={`Open local folder for ${name}`}
                  >
                    <FolderOpenIcon size={15} weight="regular" />
                  </AppButton>
                )}
              </div>

              <div
                className={`
                  overflow-hidden transition-all duration-300 ease-in-out
                  ${isActive ? 'max-h-[32rem]' : 'max-h-0'}
                `}
              >
                <div className="mt-1 flex flex-col gap-1">
                  <div className="group flex items-center gap-1">
                    <a
                      href={world.world_marble_url}
                      target="_blank"
                      rel="noreferrer"
                      onClick={() => setMenuOpen(false)}
                      className="min-w-0 flex flex-1 items-center justify-between gap-2 rounded px-2 py-1 text-left text-white opacity-80 transition-[background-color,opacity] hover:bg-white/10 hover:opacity-100"
                      aria-label={`Open ${name} in World Labs`}
                    >
                      <IconTile thumbnailUrl={world.assets.thumbnail_url} alt={name}>
                        <GlobeSimple size={16} weight="regular" />
                      </IconTile>
                      <span className="min-w-0 flex-1">
                        <span className="block text-white/85 text-xs font-semibold leading-tight truncate">{slug}</span>
                        <span className="block text-white/40 text-[11px] leading-tight truncate">World (.spz)</span>
                      </span>
                      <ArrowSquareOut size={14} weight="bold" className="flex-shrink-0 text-white/60" />
                    </a>
                  </div>
                  {objectAssets.map((obj) => (
                    <AppButton
                      key={obj.id}
                      onClick={() => {
                        pendingFocusId.current = obj.id
                        setMenuOpen(false)
                      }}
                      className="flex items-center gap-2 text-left group"
                    >
                      <IconTile thumbnailUrl={obj.thumbnailUrl} alt={obj.name}>
                        <Cube size={16} weight="regular" />
                      </IconTile>
                      <span className="min-w-0 flex-1">
                        <span className="block text-white/80 group-hover:text-white text-xs font-medium leading-tight truncate transition-colors">
                          {obj.name}
                        </span>
                        <span className="block text-white/35 text-[10px] leading-tight truncate">
                          Object (.glb)
                        </span>
                      </span>
                    </AppButton>
                  ))}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </aside>
  )
}
