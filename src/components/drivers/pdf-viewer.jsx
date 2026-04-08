// Copyright (c) 2017 PlanGrid, Inc.

import React from 'react'

export class PDFPage extends React.Component {
  constructor(props) {
    super(props)
    this.canvas = React.createRef()
    this.state = {
      isVisible: true,
    }
    this.renderTask = null // Stores the page rendering task for proper canvas handling
  }

  componentDidMount() {
    if (!this.props.disableVisibilityCheck) {
      this.observer = new IntersectionObserver(([entry]) => {
        if (entry.target === this.canvas.current) {
          this.setState({ isVisible: entry.isIntersecting })
        }
      })
      if (this.canvas.current) this.observer.observe(this.canvas.current)
    }
    this.fetchAndRenderPage()
  }

  componentDidUpdate(prevProps, prevState) {
    const needsRerender =
      prevProps.zoom !== this.props.zoom ||
      prevProps.rotation !== this.props.rotation ||
      prevProps.index !== this.props.index ||
      (this.props.disableVisibilityCheck !== true &&
        prevState.isVisible !== this.state.isVisible)

    if (needsRerender) {
      this.fetchAndRenderPage()
    }
  }

  componentWillUnmount() {
    if (this.observer) {
      this.observer.disconnect()
    }
    if (this.renderTask) {
      this.renderTask.cancel()
      this.renderTask = null
    }
  }

  fetchAndRenderPage() {
    // Make sure current render tasks are cancelled before starting a new one
    if (this.renderTask) {
      this.renderTask.cancel()
      this.renderTask = null
    }

    if (this.props.disableVisibilityCheck || this.state.isVisible) {
      const { pdf, index } = this.props
      pdf
        .getPage(index)
        .then(this.renderPage.bind(this))
        .catch((error) => {
          console.error(`Error fetching page ${index}:`, error)
        })
    }
  }

  renderPage(page) {
    try {
      const { zoom, rotation } = this.props
      const viewport = page.getViewport({ scale: zoom, rotation })
      const { width, height } = viewport

      const canvas = this.canvas.current
      const context = canvas.getContext('2d')
      canvas.width = width
      canvas.height = height

      // Store the active render task
      this.renderTask = page.render({
        canvasContext: context,
        viewport,
      })

      // Handle completion of rendering
      this.renderTask.promise
        .then(() => {
          // Rendering complete, clear the task
          this.renderTask = null
        })
        .catch((error) => {
          console.error(`Error rendering page ${this.props.index}:`, error)
        })
    } catch (error) {
      console.error(`Error rendering page ${this.props.index}:`, error)
    }
  }

  render() {
    const { index } = this.props
    return (
      <div key={`page-${index}`} className="pdf-canvas">
        <canvas ref={this.canvas} aria-hidden="true" />
      </div>
    )
  }
}

// Zoom values array for iteration
const ZOOM_VALUES = [
  0.1,
  0.25,
  0.5,
  0.75,
  1.0,
  1.1,
  1.25,
  1.5,
  1.75,
  2.0,
  2.25,
  2.5,
  2.75,
  3.0,
  3.25,
  3.5,
  3.75,
  4.0,
  4.25,
  4.5,
  4.75,
  5.0,
]

// Create immutable Map for zoom steps
const ZOOM_STEPS = new Map(ZOOM_VALUES.map((value, index) => [index, value]))
Object.freeze(ZOOM_STEPS)

const MAX_ZOOM_INDEX = ZOOM_VALUES.length - 1
const DEFAULT_ZOOM_INDEX = 8 // 1.0 (100%)

export default class PDFDriver extends React.Component {
  constructor(props) {
    super(props)

    this.state = {
      pdf: null,
      zoomStepIndex: DEFAULT_ZOOM_INDEX,
      percent: 0,
      autoFitCalculated: false,
    }

    this.increaseZoom = this.increaseZoom.bind(this)
    this.reduceZoom = this.reduceZoom.bind(this)
    this.resetZoom = this.resetZoom.bind(this)
    this.rotateLeft = this.rotateLeft.bind(this)
    this.rotateRight = this.rotateRight.bind(this)
    this.loadPDF = this.loadPDF.bind(this)
  }

  getSafeIndex(index) {
    return Math.max(0, Math.min(Math.floor(Number(index) || 0), MAX_ZOOM_INDEX))
  }

  getZoomValue(index) {
    return ZOOM_STEPS.get(this.getSafeIndex(index)) || 1.0
  }

  rotateLeft() {
    const { rotationValue = 0, setRotationValue } = this.props
    const newRotation = (rotationValue + 270) % 360
    setRotationValue(newRotation)
  }

  rotateRight() {
    const { rotationValue = 0, setRotationValue } = this.props
    const newRotation = (rotationValue + 90) % 360
    setRotationValue(newRotation)
  }

  increaseZoom() {
    const safeIndex = this.getSafeIndex(this.state.zoomStepIndex)
    if (safeIndex < MAX_ZOOM_INDEX) {
      this.setState({ zoomStepIndex: safeIndex + 1 })
    }
  }

  reduceZoom() {
    const { zoomStepIndex } = this.state
    const safeIndex = Math.max(
      0,
      Math.min(Math.floor(Number(zoomStepIndex) || 0), MAX_ZOOM_INDEX)
    )
    if (safeIndex > 0) {
      this.setState({ zoomStepIndex: safeIndex - 1 })
    }
  }

  resetZoom() {
    this.setState({ zoomStepIndex: DEFAULT_ZOOM_INDEX })
  }

  findClosestZoomStep(targetScale) {
    let closestIndex = 0
    let smallestDiff = Math.abs(ZOOM_VALUES[0] - targetScale)

    ZOOM_VALUES.forEach((step, index) => {
      const diff = Math.abs(step - targetScale)
      if (diff < smallestDiff) {
        smallestDiff = diff
        closestIndex = index
      }
    })

    return closestIndex
  }

  calculateBestFitZoom(page, containerWidth) {
    const viewport = page.getViewport({
      scale: 1.0,
      rotation: this.props.rotationValue || 0,
    })
    const scaleWidth = (containerWidth / viewport.width) * 0.95
    return this.findClosestZoomStep(scaleWidth)
  }

  progressCallback(progress) {
    const percent = ((progress.loaded / progress.total) * 100).toFixed()
    this.setState({ percent })
  }

  async loadPDF() {
    try {
      const pdfjs = await import(
        // Make sure we add comments to this import so the webpack can chunk it properly
        /* webpackPrefetch: 0, webpackChunkName: "pdfjs-dist-webpack" */ 'pdfjs-dist/webpack'
      )

      const { filePath } = this.props

      if (!this.container) {
        console.warn('PDF container not yet mounted')
        return
      }

      const containerWidth = this.container.offsetWidth
      const loadingTask = pdfjs.getDocument(filePath)

      loadingTask.onProgress = (progressData) => {
        this.progressCallback(progressData)
      }

      const pdf = await loadingTask.promise

      if (!this._isMounted) return

      if (this.pdf) {
        // Attempting to mount a new PDF when one already exists
        // Destroy the current PDF and reload the new one
        this.pdf.destroy()
      }

      this.pdf = pdf
      const page = await pdf.getPage(1)

      if (!this._isMounted) return

      const bestFitZoomIndex = this.calculateBestFitZoom(page, containerWidth)

      this.setState({
        pdf,
        containerWidth,
        zoomStepIndex: bestFitZoomIndex,
        autoFitCalculated: true,
      })
    } catch (error) {
      if (!this._isMounted) return

      if (this.props.onError) {
        this.props.onError(error)
      } else {
        console.error('Error loading PDF:', error)
      }
    }
  }

  componentDidMount() {
    this._isMounted = true
    this.loadPDF()
  }

  componentWillUnmount() {
    this._isMounted = false
    if (this.pdf) {
      this.pdf.destroy()
      this.pdf = null
    }
  }

  componentDidUpdate(prevProps) {
    if (this.props.filePath !== prevProps.filePath) {
      if (this.pdf) {
        this.pdf.destroy()
        this.pdf = null
      }
      this.loadPDF()
    }
  }

  renderPages() {
    const { pdf, zoomStepIndex } = this.state
    const { rotationValue } = this.props
    if (!pdf) return null

    const zoom = this.getZoomValue(zoomStepIndex)

    return Array.from({ length: pdf.numPages }, (_, i) => (
      <PDFPage
        key={`pdfPage_${i}_${rotationValue}`}
        index={i + 1}
        pdf={pdf}
        zoom={zoom}
        rotation={rotationValue}
        disableVisibilityCheck={this.props.disableVisibilityCheck}
      />
    ))
  }

  renderLoading() {
    if (this.state.pdf) return null
    return <div className="pdf-loading">LOADING ({this.state.percent}%)</div>
  }

  render() {
    const { renderControls } = this.props
    const { zoomStepIndex } = this.state

    return (
      <div className="pdf-viewer-container">
        {renderControls ? (
          renderControls({
            handleZoomIn: this.increaseZoom,
            handleZoomOut: this.reduceZoom,
            handleRotateLeft: this.rotateLeft,
            handleRotateRight: this.rotateRight,
            zoomPercentage: Math.round(this.getZoomValue(zoomStepIndex) * 100),
          })
        ) : (
          <div className="pdf-controls-container">
            <button
              type="button"
              className="view-control"
              onClick={this.increaseZoom}>
              <i className="zoom-in" />
            </button>
            <button
              type="button"
              className="view-control"
              onClick={this.resetZoom}>
              <i className="zoom-reset" />
            </button>
            <button
              type="button"
              className="view-control"
              onClick={this.reduceZoom}>
              <i className="zoom-out" />
            </button>
            <button
              type="button"
              className="view-control"
              onClick={this.rotateLeft}>
              <i className="rotate-left" />
            </button>
            <button
              type="button"
              className="view-control"
              onClick={this.rotateRight}>
              <i className="rotate-right" />
            </button>
          </div>
        )}

        <div className="pdf-viewer" ref={(node) => (this.container = node)}>
          {this.renderLoading()}
          {this.renderPages()}
        </div>
      </div>
    )
  }
}

PDFDriver.defaultProps = {
  disableVisibilityCheck: false,
}
