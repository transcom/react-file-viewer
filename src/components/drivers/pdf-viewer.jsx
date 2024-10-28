// Copyright (c) 2017 PlanGrid, Inc.

import React from 'react'
import VisibilitySensor from 'react-visibility-sensor'

const INCREASE_PERCENTAGE = 0.2
const DEFAULT_SCALE = 1.1

export class PDFPage extends React.Component {
  constructor(props) {
    super(props)
    this.state = {}
    this.onChange = this.onChange.bind(this)
  }

  componentDidMount() {
    if (this.props.disableVisibilityCheck) this.fetchAndRenderPage()
  }

  componentDidUpdate(prevProps, prevState) {
    if (this.props.disableVisibilityCheck) {
      if (prevProps.zoom !== this.props.zoom) this.fetchAndRenderPage()
      return
    }

    // we want to render/re-render in two scenarias
    // user scrolls to the pdf
    // user zooms in
    if (
      prevState.isVisible === this.state.isVisible &&
      prevProps.zoom === this.props.zoom
    )
      return
    if (this.state.isVisible) this.fetchAndRenderPage()
  }

  onChange(isVisible) {
    if (isVisible) this.setState({ isVisible })
  }

  fetchAndRenderPage() {
    const { pdf, index } = this.props
    pdf
      .getPage(index)
      .then(this.renderPage.bind(this))
      .catch((error) => {
        console.error(`Error fetching page ${index}:`, error)
      })
  }

  renderPage(page) {
    try {
      const { containerWidth, zoom } = this.props
      const initialViewport = page.getViewport({ scale: DEFAULT_SCALE })
      const calculatedScale = containerWidth / initialViewport.width
      const scale =
        (calculatedScale > DEFAULT_SCALE ? DEFAULT_SCALE : calculatedScale) +
        zoom * INCREASE_PERCENTAGE
      const viewport = page.getViewport({ scale })
      const { width, height } = viewport

      const context = this.canvas.getContext('2d')
      this.canvas.width = width
      this.canvas.height = height

      page.render({
        canvasContext: context,
        viewport,
      })
    } catch (error) {
      console.error(`Error rendering page ${this.props.index}:`, error)
    }
  }

  render() {
    const { index } = this.props
    return (
      <div key={`page-${index}`} className="pdf-canvas">
        {this.props.disableVisibilityCheck ? (
          <canvas
            ref={(node) => (this.canvas = node)}
            width="670"
            height="870"
          />
        ) : (
          <VisibilitySensor onChange={this.onChange} partialVisibility>
            <canvas
              ref={(node) => (this.canvas = node)}
              width="670"
              height="870"
            />
          </VisibilitySensor>
        )}
      </div>
    )
  }
}

export default class PDFDriver extends React.Component {
  constructor(props) {
    super(props)

    this.state = {
      pdf: null,
      zoom: 0,
      percent: 0,
    }

    this.increaseZoom = this.increaseZoom.bind(this)
    this.reduceZoom = this.reduceZoom.bind(this)
    this.resetZoom = this.resetZoom.bind(this)
  }

  componentDidMount() {
    // Dynamic import of ESM into CJS
    ;(async () => {
      // sidestep that pdfjs is bundled as esm
      const pdfjs = await import('pdfjs-dist/webpack')
      const { filePath } = this.props
      const containerWidth = this.container.offsetWidth
      const loadingTask = pdfjs.getDocument(filePath)
      loadingTask.onProgress = (progressData) => {
        this.progressCallback(progressData)
      }

      loadingTask.promise
        .then((pdf) => {
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
    const { pdf } = this.state
    if (pdf) {
      pdf.destroy()
      this.setState({ pdf: null })
    }
  }

  setZoom(zoom) {
    this.setState({
      zoom,
    })
  }

  progressCallback(progress) {
    const percent = ((progress.loaded / progress.total) * 100).toFixed()
    this.setState({ percent })
  }

  reduceZoom() {
    if (this.state.zoom === 0) return
    this.setZoom(this.state.zoom - 1)
  }

  increaseZoom() {
    this.setZoom(this.state.zoom + 1)
  }

  resetZoom() {
    this.setZoom(0)
  }

  renderPages() {
    const { pdf, containerWidth, zoom } = this.state
    if (!pdf) return null
    const pages = [...Array(pdf.numPages).keys()].map((i) => i + 1)
    return pages.map((_, i) => (
      <PDFPage
        index={i + 1}
        key={`pdfPage_${i}`}
        pdf={pdf}
        containerWidth={containerWidth}
        zoom={zoom * INCREASE_PERCENTAGE}
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
