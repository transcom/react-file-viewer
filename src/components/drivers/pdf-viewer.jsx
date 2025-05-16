// Copyright (c) 2017 PlanGrid, Inc.

import React from 'react'

const INCREASE_PERCENTAGE = 0.2
const DEFAULT_SCALE = 1.1

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

  componentDidUpdate(prevProps) {
    const needsRerender =
      prevProps.zoom !== this.props.zoom ||
      prevProps.rotation !== this.props.rotation ||
      prevProps.index !== this.props.index ||
      (this.props.disableVisibilityCheck !== true &&
        prevProps.isVisible !== this.state.isVisible)

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
      const { containerWidth, zoom, rotation } = this.props
      const initialViewport = page.getViewport({ scale: DEFAULT_SCALE })
      const calculatedScale = containerWidth / initialViewport.width
      const scale =
        (calculatedScale > DEFAULT_SCALE ? DEFAULT_SCALE : calculatedScale) +
        zoom * INCREASE_PERCENTAGE
      const viewport = page.getViewport({ scale, rotation })
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
        <canvas ref={this.canvas} width="670" height="870" />
      </div>
    )
  }
}

export default class PDFDriver extends React.Component {
  constructor(props) {
    super(props)

    // zoom steps: 10% through 200%
    this.zoomSteps = [0.1, 0.25, 0.5, 0.75, 1.0, 1.1, 1.25, 1.5, 1.75, 2.0]

    this.state = {
      pdf: null,
      zoomStepIndex: 4, // default to 1.0 (100%)
      percent: 0,
    }

    this.increaseZoom = this.increaseZoom.bind(this)
    this.reduceZoom = this.reduceZoom.bind(this)
    this.resetZoom = this.resetZoom.bind(this)
    this.rotateLeft = this.rotateLeft.bind(this)
    this.rotateRight = this.rotateRight.bind(this)
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
    const { zoomStepIndex } = this.state
    if (zoomStepIndex < this.zoomSteps.length - 1) {
      this.setState({ zoomStepIndex: zoomStepIndex + 1 })
    }
  }

  reduceZoom() {
    const { zoomStepIndex } = this.state
    if (zoomStepIndex > 0) {
      this.setState({ zoomStepIndex: zoomStepIndex - 1 })
    }
  }

  resetZoom() {
    this.setState({ zoomStepIndex: 4 })
  }

  componentDidMount() {
    // Dynamic import of ESM into CJS
    ;(async () => {
      // sidestep that pdfjs is bundled as esm
      const pdfjs = await import(
        // Make sure we add comments to this import so the webpack can chunk it properly
        /* webpackPrefetch: 0, webpackChunkName: "pdfjs-dist-webpack" */ 'pdfjs-dist/webpack'
      )
      const { filePath } = this.props
      const containerWidth = this.container.offsetWidth
      const loadingTask = pdfjs.getDocument(filePath)
      loadingTask.onProgress = (progressData) => {
        this.progressCallback(progressData)
      }

      loadingTask.promise
        .then((pdf) => {
          if (this.pdf) {
            // Attempting to mount a new PDF when one already exists
            // Destroy the current PDF and reload the new one
            this.pdf.destroy()
          }
          this.setState({ pdf, containerWidth })
        })
        .catch((error) => {
          if (
            typeof this.props.onError != undefined &&
            this.props.onError != null
          ) {
            this.props.onError(error)
          } else {
            console.error('Error loading PDF:', error)
          }
        })
    })()
  }

  componentWillUnmount() {
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
      this.loadPdf()
    }
  }

  setZoom(index) {
    this.setState({ zoomStepIndex: index })
  }

  progressCallback(progress) {
    const percent = ((progress.loaded / progress.total) * 100).toFixed()
    this.setState({ percent })
  }

  renderPages() {
    const { pdf, containerWidth, zoomStepIndex } = this.state
    const { rotationValue } = this.props
    if (!pdf) return null
    const zoom = this.zoomSteps[zoomStepIndex]
    const pages = [...Array(pdf.numPages).keys()].map((i) => i + 1)
    return pages.map((_, i) => (
      <PDFPage
        key={`pdfPage_${i}_${rotationValue}`}
        index={i + 1}
        pdf={pdf}
        containerWidth={containerWidth}
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

    return (
      <div className="pdf-viewer-container">
        {renderControls ? (
          renderControls({
            handleZoomIn: this.increaseZoom,
            handleZoomOut: this.reduceZoom,
            handleRotateLeft: this.rotateLeft,
            handleRotateRight: this.rotateRight,
            zoomPercentage: Math.round(
              this.zoomSteps[this.state.zoomStepIndex] * 100
            ),
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
