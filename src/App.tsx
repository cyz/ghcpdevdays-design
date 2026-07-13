import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ChevronDownIcon,
  CopilotIcon,
  DownloadIcon,
  HistoryIcon,
  MarkGithubIcon,
  ScreenFullIcon,
  SidebarCollapseIcon,
  SidebarExpandIcon,
  XIcon,
  ZoomInIcon,
  ZoomOutIcon,
} from '@primer/octicons-react'
import './App.css'
import {
  coverFormatIds,
  filenamePrefixByFormat,
  formatOptions,
  MAX_HISTORY_ITEMS,
  MAX_SPEAKERS,
  REPOSITORY_URL,
  socialFormatIds,
} from './constants'
import type {
  BannerFormat,
  BannerHistoryItem,
  BannerState,
  EventDetails,
  FormatOption,
  Speaker,
} from './types'
import { uid } from './lib/format'
import { buildDefaultState, readBannerHistory, writeBannerHistory } from './lib/history'
import { fileToDataUrl, getBackgroundImage, loadImage } from './lib/image'
import { renderBanner } from './lib/renderBanner'

// Debounce for the live preview redraw so rapid input changes don't trigger a
// full canvas re-render on every keystroke.
const PREVIEW_DEBOUNCE_MS = 120

function App() {
  const [backgroundFailed, setBackgroundFailed] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [zoom, setZoom] = useState(1)
  const [error, setError] = useState('')
  const [history, setHistory] = useState<BannerHistoryItem[]>(() => readBannerHistory())
  const [speakerPreviews, setSpeakerPreviews] = useState<Array<{ id: string; name: string; previewDataUrl: string }>>([])
  const [fontsReady, setFontsReady] = useState(() => typeof document === 'undefined' || !document.fonts)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const [state, setState] = useState<BannerState>(() => buildDefaultState())

  const format = useMemo(
    () => formatOptions.find((item) => item.id === state.format) ?? formatOptions[0],
    [state.format],
  )
  const isLumaCover = state.format === 'luma_cover'
  const isSpeakerBanner = state.format === 'speaker_banner'
  const isSpeakerSquare = state.format === 'speaker_square'
  const isSocialPromo = state.format === 'social_promo'
  const isMinimalCover = isLumaCover
  const isSpeakerPerBannerFormat = isSpeakerBanner || isSpeakerSquare
  const isTallBanner = format.width === 1080 && format.height === 1350
  const previewBaseScale = isTallBanner ? 0.78 : 1
  const namedSpeakers = useMemo(
    () => state.speakers.filter((speaker) => speaker.name.trim().length > 0).slice(0, MAX_SPEAKERS),
    [state.speakers],
  )
  const showMultiSpeakerPreviewGrid = isSpeakerPerBannerFormat && namedSpeakers.length > 1
  const selectedBackgroundImage = useMemo(() => getBackgroundImage(state.format), [state.format])
  const previewBackgroundFailed = selectedBackgroundImage ? backgroundFailed : false

  useEffect(() => {
    if (typeof document === 'undefined' || !document.fonts) return

    let cancelled = false
    const weights = [200, 300, 400, 500, 600, 700, 800, 900]
    Promise.all(weights.map((weight) => document.fonts.load(`${weight} 100px "Mona Sans"`)))
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setFontsReady(true)
      })

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    const handle = window.setTimeout(() => {
      const draw = async () => {
        if (!canvasRef.current) return
        if (showMultiSpeakerPreviewGrid) {
          const ctx = canvasRef.current.getContext('2d')
          if (ctx) ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)
          return
        }
        await renderBanner(canvasRef.current, state, format, previewBackgroundFailed, 1)
      }

      draw().catch(() => {
        if (!cancelled) setError('Failed to render preview.')
      })
    }, PREVIEW_DEBOUNCE_MS)

    return () => {
      cancelled = true
      window.clearTimeout(handle)
    }
  }, [state, format, previewBackgroundFailed, showMultiSpeakerPreviewGrid, fontsReady])

  useEffect(() => {
    let cancelled = false

    const drawSpeakerPreviews = async () => {
      if (!isSpeakerPerBannerFormat || namedSpeakers.length <= 1) {
        setSpeakerPreviews([])
        return
      }

      const previews: Array<{ id: string; name: string; previewDataUrl: string }> = []

      for (const speaker of namedSpeakers) {
        const previewCanvas = document.createElement('canvas')
        const previewState: BannerState = {
          ...state,
          speakers: [speaker],
        }
        await renderBanner(previewCanvas, previewState, format, previewBackgroundFailed, 1)
        previews.push({
          id: speaker.id,
          name: speaker.name,
          previewDataUrl: previewCanvas.toDataURL('image/jpeg', 0.8),
        })
      }

      if (!cancelled) {
        setSpeakerPreviews(previews)
      }
    }

    drawSpeakerPreviews().catch(() => {
      if (!cancelled) {
        setSpeakerPreviews([])
      }
    })

    return () => {
      cancelled = true
    }
  }, [state, format, previewBackgroundFailed, isSpeakerPerBannerFormat, namedSpeakers, fontsReady])

  useEffect(() => {
    if (!selectedBackgroundImage) return
    loadImage(selectedBackgroundImage)
      .then(() => setBackgroundFailed(false))
      .catch(() => setBackgroundFailed(true))
  }, [selectedBackgroundImage])

  const updateEvent = (patch: Partial<EventDetails>) =>
    setState((prev) => ({ ...prev, event: { ...prev.event, ...patch } }))

  const updateSpeaker = (id: string, patch: Partial<Speaker>) =>
    setState((prev) => ({
      ...prev,
      speakers: prev.speakers.map((s) => (s.id === id ? { ...s, ...patch } : s)),
    }))

  const resetAll = () => {
    setState(buildDefaultState())
    setZoom(1)
  }

  const zoomIn = () => setZoom((value) => Math.min(2, Math.round((value + 0.1) * 10) / 10))
  const zoomOut = () => setZoom((value) => Math.max(0.3, Math.round((value - 0.1) * 10) / 10))
  const fitZoom = () => setZoom(1)

  const exportBanner = async () => {
    setError('')
    try {
      const mime = 'image/png'
      const speakersToExport = isSpeakerPerBannerFormat
        ? state.speakers.filter((speaker) => speaker.name.trim().length > 0).slice(0, MAX_SPEAKERS)
        : []
      const exportStates =
        speakersToExport.length > 1
          ? speakersToExport.map((speaker) => ({
              ...state,
              speakers: [speaker],
            }))
          : [state]

      const historyItems: BannerHistoryItem[] = []

      for (let i = 0; i < exportStates.length; i += 1) {
        const exportState = exportStates[i]
        const offscreen = document.createElement('canvas')
        await renderBanner(offscreen, exportState, format, backgroundFailed, exportState.export.scale)
        const dataUrl = offscreen.toDataURL(mime, 0.95)

        const previewCanvas = document.createElement('canvas')
        await renderBanner(previewCanvas, exportState, format, backgroundFailed, 1)
        const previewDataUrl = previewCanvas.toDataURL('image/jpeg', 0.8)

        historyItems.push({
          id: uid(),
          createdAt: new Date().toISOString(),
          state: exportState,
          previewDataUrl,
        })

        const speakerSuffix =
          exportStates.length > 1
            ? `-${(exportState.speakers[0]?.name || `speaker-${i + 1}`)
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/^-+|-+$/g, '') || `speaker-${i + 1}`}`
            : ''

        const prefix = filenamePrefixByFormat[exportState.format]
        const citySlug =
          (exportState.event.city || 'city')
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '') || 'city'

        const link = document.createElement('a')
        link.href = dataUrl
        link.download = `${prefix}-github-copilot-dev days-${citySlug}${speakerSuffix}.png`
        link.click()
      }

      setHistory((previous) => {
        const next = [...historyItems.reverse(), ...previous].slice(0, MAX_HISTORY_ITEMS)
        writeBannerHistory(next)
        return next
      })
    } catch {
      setError('Could not export file.')
    }
  }

  const handleFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      throw new Error('Invalid file. Please upload images only.')
    }
    if (file.size > 8 * 1024 * 1024) {
      throw new Error('File too large. Max size is 8MB per image.')
    }
    return fileToDataUrl(file)
  }

  const restoreBanner = (item: BannerHistoryItem) => {
    setState({
      ...item.state,
      event: {
        ...item.state.event,
        organizerName: item.state.event?.organizerName ?? '',
        organizerLogoDataUrl: item.state.event?.organizerLogoDataUrl ?? '',
        includeSupportedBy: item.state.event?.includeSupportedBy ?? false,
        registrationEnabled: item.state.event?.registrationEnabled ?? true,
        registrationStyle: item.state.event?.registrationStyle ?? 'cta_url',
        registrationText: item.state.event?.registrationText ?? 'Register now',
        registrationUrl: item.state.event?.registrationUrl ?? 'gh.io/devdays',
      },
    })
    setShowHistory(false)
  }

  const removeHistoryItem = (id: string) => {
    setHistory((previous) => {
      const next = previous.filter((item) => item.id !== id)
      writeBannerHistory(next)
      return next
    })
  }

  const clearHistory = () => {
    setHistory([])
    writeBannerHistory([])
  }

  return (
    <div className="editor-shell">
      <header className="topbar">
        <div className="topbar-left">
          <span className="topbar-icon" aria-hidden="true">
            <CopilotIcon size={20} />
          </span>
          <h1>Dev Days</h1>
        </div>

        <div className="topbar-actions">
          <a
            className="icon-btn"
            href={REPOSITORY_URL}
            target="_blank"
            rel="noreferrer"
            title="View on GitHub"
            aria-label="View the project repository on GitHub"
          >
            <MarkGithubIcon size={18} />
          </a>
          <button
            type="button"
            className={`topbar-history-btn ${showHistory ? 'active' : ''}`}
            title="Previous banners"
            aria-label="Toggle previous banners"
            aria-pressed={showHistory}
            onClick={() => setShowHistory((value) => !value)}
          >
            <HistoryIcon size={16} />
            <span>Previous banners</span>
          </button>
        </div>
      </header>

      <div className="editor-body">
        <aside className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''}`} aria-label="Editor controls">
          <div className="sidebar-header">
            <button
              type="button"
              className="icon-btn"
              title={sidebarCollapsed ? 'Expand panel' : 'Collapse panel'}
              aria-label={sidebarCollapsed ? 'Expand panel' : 'Collapse panel'}
              aria-expanded={!sidebarCollapsed}
              onClick={() => setSidebarCollapsed((value) => !value)}
            >
              {sidebarCollapsed ? <SidebarExpandIcon size={18} /> : <SidebarCollapseIcon size={18} />}
            </button>
            <span className="sidebar-title">Design</span>
          </div>

          <div className="sidebar-content">
          {backgroundFailed && <p className="warning">Background image unavailable: using gradient fallback for preview.</p>}

          <div className="format-bar">
            <label className="format-select-label">
              <span className="label-row">
                Format
              </span>
              <select
                value={state.format}
                onChange={(e) => setState((previous) => ({ ...previous, format: e.target.value as BannerFormat }))}
              >
                <optgroup label="Event Cover">
                  {coverFormatIds
                    .map((id) => formatOptions.find((option) => option.id === id))
                    .filter((option): option is FormatOption => Boolean(option))
                    .map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.name} — {option.width}x{option.height}
                      </option>
                    ))}
                </optgroup>
                <optgroup label="Socials">
                  {socialFormatIds
                    .map((id) => formatOptions.find((option) => option.id === id))
                    .filter((option): option is FormatOption => Boolean(option))
                    .map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.name} — {option.width}x{option.height}
                      </option>
                    ))}
                </optgroup>
              </select>
            </label>
          </div>

          <details className="side-section" open>
            <summary>
              <span>Event</span>
              <ChevronDownIcon size={16} className="chevron" />
            </summary>
            <div className="section-block">
              <div className="form-grid single">
                <label>
                  City
                  <input
                    type="text"
                    value={state.event.city}
                    onChange={(e) => updateEvent({ city: e.target.value })}
                  />
                </label>
                <label>
                  <span className="label-row">
                    Date and time
                    <small>Example: Apr 15 • 7:00 PM</small>
                  </span>
                  <input
                    type="text"
                    value={state.event.dateTime}
                    onChange={(e) => updateEvent({ dateTime: e.target.value })}
                  />
                </label>
                {isSocialPromo && (
                  <label>
                    <span className="label-row">
                      Location
                      <small>Can wrap to 2 lines in Social Promo</small>
                    </span>
                    <textarea
                      rows={2}
                      value={state.event.location}
                      onChange={(e) => updateEvent({ location: e.target.value })}
                    />
                  </label>
                )}
                {(isSpeakerBanner || isSocialPromo) && (
                  <>
                    <label>
                      <span className="label-row">
                        Organizer logo
                        <small>Upload the organization logo (shown on the banner).</small>
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(event) => {
                          void (async () => {
                            try {
                              const file = event.target.files?.[0]
                              if (!file) return
                              const dataUrl = await handleFile(file)
                              updateEvent({ organizerLogoDataUrl: dataUrl })
                            } catch (fileError) {
                              setError(fileError instanceof Error ? fileError.message : 'Invalid file.')
                            }
                          })()
                        }}
                      />
                    </label>
                  </>
                )}

                {(isSocialPromo || isSpeakerBanner) && (
                  <>
                    <button
                      type="button"
                      className="resolution-toggle"
                      onClick={() => updateEvent({ registrationEnabled: !state.event.registrationEnabled })}
                    >
                      <div>
                        <strong>Show registration footer bar</strong>
                        <span>Adds a CTA + short URL strip at the bottom of the banner.</span>
                      </div>
                      <span className={`switch ${state.event.registrationEnabled ? 'on' : ''}`} aria-hidden="true">
                        <span />
                      </span>
                    </button>

                    {state.event.registrationEnabled && (
                      <>
                        <label>
                          Registration bar style
                          <select
                            value={state.event.registrationStyle}
                            onChange={(e) =>
                              updateEvent({ registrationStyle: e.target.value as EventDetails['registrationStyle'] })
                            }
                          >
                            <option value="cta_url">CTA + URL</option>
                            <option value="url_only">URL only</option>
                          </select>
                        </label>

                        <label>
                          CTA text
                          <input
                            type="text"
                            value={state.event.registrationText}
                            onChange={(e) => updateEvent({ registrationText: e.target.value })}
                            placeholder="Register now"
                          />
                        </label>

                        <label>
                          Registration URL *
                          <input
                            type="text"
                            value={state.event.registrationUrl}
                            onChange={(e) => updateEvent({ registrationUrl: e.target.value })}
                            placeholder="gh.io/devdays"
                          />
                        </label>
                      </>
                    )}
                  </>
                )}
              </div>
            </div>
          </details>

          {!isMinimalCover && !isSocialPromo && state.speakers[0] && (
          <details className="side-section" open>
            <summary>
              <span>Speaker</span>
              <ChevronDownIcon size={16} className="chevron" />
            </summary>
            <div className="section-block">
              <div className="form-grid single">
                <label>
                  Name *
                  <input
                    type="text"
                    value={state.speakers[0].name}
                    onChange={(e) => updateSpeaker(state.speakers[0].id, { name: e.target.value })}
                  />
                </label>
                <label>
                  Role
                  <input
                    type="text"
                    value={state.speakers[0].role ?? ''}
                    onChange={(e) => updateSpeaker(state.speakers[0].id, { role: e.target.value })}
                  />
                </label>
                <label>
                  Photo
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(event) => {
                      void (async () => {
                        try {
                          const file = event.target.files?.[0]
                          if (!file) return
                          const dataUrl = await handleFile(file)
                          updateSpeaker(state.speakers[0].id, { photoDataUrl: dataUrl })
                        } catch (fileError) {
                          setError(fileError instanceof Error ? fileError.message : 'Invalid file.')
                        }
                      })()
                    }}
                  />
                </label>
              </div>
            </div>
          </details>
          )}

          {isSocialPromo && (
          <details className="side-section" open>
            <summary>
              <span>Partners</span>
              <ChevronDownIcon size={16} className="chevron" />
            </summary>
            <div className="section-block">
              {(isSpeakerBanner || isSocialPromo) && (
                <button
                  type="button"
                  className="resolution-toggle"
                  onClick={() => updateEvent({ includeSupportedBy: !state.event.includeSupportedBy })}
                >
                  <div>
                    <strong>Do you want to include partner logos?</strong>
                    <span>Turn on to show the Supported by area when logos are uploaded.</span>
                  </div>
                  <span className={`switch ${state.event.includeSupportedBy ? 'on' : ''}`} aria-hidden="true">
                    <span />
                  </span>
                </button>
              )}
              {(isSpeakerBanner || isSocialPromo) && <p className="section-description">You can add up to 3 partner logos.</p>}
              <label>
                Add logo
                <input
                  type="file"
                  accept="image/*"
                  disabled={(isSpeakerBanner || isSocialPromo) && state.partners.length >= 3}
                  onChange={(event) => {
                    void (async () => {
                      try {
                        const file = event.target.files?.[0]
                        if (!file) return
                        if ((isSpeakerBanner || isSocialPromo) && state.partners.length >= 3) {
                          setError('You can upload up to 3 partner logos for Speaker Banner and Social Promo.')
                          return
                        }
                        const dataUrl = await handleFile(file)
                        setState((previous) => ({
                          ...previous,
                          partners: [...previous.partners, { id: uid(), imageDataUrl: dataUrl }],
                        }))
                      } catch (fileError) {
                        setError(fileError instanceof Error ? fileError.message : 'Invalid file.')
                      }
                    })()
                  }}
                />
              </label>
              {(isSpeakerBanner || isSocialPromo) && (
                <p className="section-description">
                  {state.partners.length >= 3
                    ? 'Partner logo limit reached (3/3). Remove one to upload another.'
                    : `${3 - state.partners.length} slot(s) remaining.`}
                </p>
              )}

              <div className="logos-grid">
                {state.partners.map((partner) => (
                  <div key={partner.id} className="logo-tile">
                    <img src={partner.imageDataUrl} alt="Partner logo" />
                    <button
                      type="button"
                      className="danger"
                      onClick={() =>
                        setState((previous) => ({
                          ...previous,
                          partners: previous.partners.filter((item) => item.id !== partner.id),
                        }))
                      }
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </details>
          )}

          {error && <p className="error">{error}</p>}
          </div>

          <div className="sidebar-footer">
            <button type="button" className="ghost" onClick={resetAll} title="Reset to defaults">
              Reset
            </button>
            <div className="split-download">
              <button
                type="button"
                className="download-main"
                onClick={() => {
                  void exportBanner()
                }}
              >
                <DownloadIcon size={16} />
                <span>Download</span>
              </button>
            </div>
          </div>
        </aside>

        <section className="stage" aria-label="Preview">
          <div className="stage-canvas">
            {!showMultiSpeakerPreviewGrid && (
              <div
                className="canvas-wrap"
                style={{ aspectRatio: `${format.width} / ${format.height}`, transform: `scale(${zoom * previewBaseScale})` }}
              >
                <canvas ref={canvasRef} aria-label="Banner preview" />
              </div>
            )}

            {showMultiSpeakerPreviewGrid && speakerPreviews.length > 0 && (
              <div className="speaker-preview-block">
                <div className="history-header">
                  <h3>Speaker banners</h3>
                  <span>{speakerPreviews.length} real-time preview(s)</span>
                </div>
                <div className="speaker-preview-grid">
                  {speakerPreviews.map((item) => (
                    <article key={item.id} className="speaker-preview-item">
                      <img src={item.previewDataUrl} alt={`Preview banner for ${item.name}`} />
                      <strong>{item.name}</strong>
                    </article>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="stage-toolbar" role="toolbar" aria-label="Canvas tools">
            <button type="button" className="icon-btn" title="Zoom in" aria-label="Zoom in" onClick={zoomIn}>
              <ZoomInIcon size={18} />
            </button>
            <button type="button" className="icon-btn" title="Zoom out" aria-label="Zoom out" onClick={zoomOut}>
              <ZoomOutIcon size={18} />
            </button>
            <button type="button" className="icon-btn" title="Fit to screen" aria-label="Fit to screen" onClick={fitZoom}>
              <ScreenFullIcon size={18} />
            </button>
            <span className="toolbar-divider" aria-hidden="true" />
            <button
              type="button"
              className="icon-btn download"
              title="Download"
              aria-label="Download"
              onClick={() => {
                void exportBanner()
              }}
            >
              <DownloadIcon size={18} />
            </button>
          </div>
        </section>

        {showHistory && (
          <aside className="history-drawer" aria-label="Previous banners">
            <div className="history-header">
              <h3>Previous banners</h3>
              <div className="history-header-actions">
                <button type="button" onClick={clearHistory} disabled={history.length === 0}>
                  Clear all
                </button>
                <button
                  type="button"
                  className="icon-btn"
                  title="Close"
                  aria-label="Close previous banners"
                  onClick={() => setShowHistory(false)}
                >
                  <XIcon size={16} />
                </button>
              </div>
            </div>
            {history.length === 0 ? (
              <p className="history-empty">No previous banners yet. Export one to save it here.</p>
            ) : (
              <div className="history-list">
                {history.map((item) => (
                  <article key={item.id} className="history-item">
                    <img src={item.previewDataUrl} alt="Saved banner preview" />
                    <div className="history-meta">
                      <strong>{formatOptions.find((option) => option.id === item.state.format)?.name ?? item.state.format}</strong>
                      <span>{new Date(item.createdAt).toLocaleString()}</span>
                      <span>{item.state.event.city || 'City'} • {item.state.event.dateTime || 'Date/Time'}</span>
                    </div>
                    <div className="history-actions">
                      <button type="button" onClick={() => restoreBanner(item)}>
                        Open
                      </button>
                      <button type="button" className="danger" onClick={() => removeHistoryItem(item.id)}>
                        Delete
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </aside>
        )}
      </div>
    </div>
  )
}

export default App
